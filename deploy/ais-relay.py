#!/usr/bin/env python3
"""AIS relay: keeps an aisstream.io WebSocket open on an always-on host and serves vessel snapshots over HTTP.

Cloud Run throttles CPU between requests, so a long-lived WebSocket inside the service starves. This script runs on a
small always-on box (systemd), subscribes to bounding boxes around the major chokepoints, maintains an in-memory
vessel table, and answers:

  GET /healthz            -> {"ok": true, ...stats}            (no token)
  GET /snapshot?max=1500  -> same shape as lib/ais/stream.mjs aisSnapshot()   (X-Relay-Token required)
  POST /probe {"urls":[...]} -> {url: {"ok":bool, "status":int, "body":str|null, "error":str|null}}  (X-Relay-Token required)
        Fetches <url>/status from each KiwiSDR receiver on the dashboard's behalf: the KiwiSDR community IP
        blacklist covers Google Cloud egress ranges, so probes from Cloud Run are silently dropped.

Environment: AISSTREAM_API_KEY (required), RELAY_TOKEN (required), PORT (default 3011), BIND (default 127.0.0.1).
Only dependency: `websockets` (pip). Everything else is the standard library.
"""
import asyncio
import json
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from concurrent.futures import ThreadPoolExecutor
import urllib.request
from urllib.parse import urlparse, parse_qs

try:
    import websockets
except ImportError:  # pragma: no cover
    print("pip install websockets", file=sys.stderr)
    sys.exit(2)

STREAM_URL = "wss://stream.aisstream.io/v0/stream"
API_KEY = os.environ.get("AISSTREAM_API_KEY", "")
TOKEN = os.environ.get("RELAY_TOKEN", "")
PORT = int(os.environ.get("PORT", "3011"))
BIND = os.environ.get("BIND", "127.0.0.1")
STALE_S = int(os.environ.get("AIS_STALE_S", str(2 * 3600)))
LIVE_WINDOW_S = 3600
MAX_VESSELS = 40000

# Must match AIS_BOXES in lib/ais/stream.mjs: [[latMin, lonMin], [latMax, lonMax]]
BOXES = {
    "chokepoint6": ("Strait of Hormuz", [[25.6, 55.6], [27.0, 57.4]]),  # the strait itself; excludes Dubai / Fujairah anchorages
    "chokepoint4": ("Bab el-Mandeb", [[11.0, 41.5], [15.0, 45.0]]),
    "chokepoint1": ("Suez Canal", [[29.0, 31.5], [32.5, 33.5]]),
    "chokepoint5": ("Malacca Strait", [[0.5, 100.0], [5.5, 105.0]]),
    "chokepoint11": ("Taiwan Strait", [[22.5, 117.0], [26.0, 121.5]]),
    "chokepoint3": ("Bosporus", [[40.0, 27.5], [42.0, 30.0]]),
    "chokepoint2": ("Panama Canal", [[8.0, -80.5], [10.0, -78.5]]),
    "chokepoint8": ("Gibraltar Strait", [[35.0, -7.0], [37.0, -4.5]]),
    "chokepoint9": ("Dover Strait", [[50.0, 0.0], [52.0, 3.0]]),
    "chokepoint7": ("Cape of Good Hope", [[-36.0, 17.0], [-33.5, 21.0]]),
    "chokepoint28": ("Kerch Strait", [[44.5, 35.5], [46.0, 37.5]]),
    "chokepoint12": ("Korea Strait", [[33.0, 127.5], [35.5, 130.5]]),
    "chokepoint14": ("Luzon Strait", [[19.0, 120.0], [22.0, 122.5]]),
}


def ship_class(t):
    try:
        t = int(t)
    except (TypeError, ValueError):
        return "unknown"
    if t <= 0:
        return "unknown"
    if 80 <= t <= 89:
        return "tanker"
    if 70 <= t <= 79:
        return "cargo"
    if 60 <= t <= 69:
        return "passenger"
    if t == 35:
        return "military"
    if t == 55:
        return "law"
    if t == 30:
        return "fishing"
    if t in (31, 32, 52):
        return "tug"
    if t in (36, 37):
        return "pleasure"
    if 40 <= t <= 49:
        return "highspeed"
    if t in (50, 51, 53, 54, 58):
        return "service"
    return "other"


def box_for(lat, lon):
    for bid, (_, ((s, w), (n, e))) in BOXES.items():
        if s <= lat <= n and w <= lon <= e:
            return bid
    return None


def clean(s):
    return str(s or "").replace("@", "").replace("\x00", "").strip()


LOCK = threading.Lock()
VESSELS = {}
STATE = {"connected": False, "since": None, "lastMessageAt": None, "messages": 0, "positions": 0, "reconnects": 0, "lastError": None}


def upsert(mmsi, patch):
    v = VESSELS.get(mmsi)
    if v is None:
        if len(VESSELS) >= MAX_VESSELS:
            prune(True)
        v = {"mmsi": mmsi, "name": "", "type": None, "cls": "unknown", "lat": None, "lon": None, "sog": None, "cog": None,
             "hdg": None, "nav": None, "dest": "", "draught": None, "imo": None, "callsign": "", "length": None, "ts": 0, "box": None}
        VESSELS[mmsi] = v
    v.update(patch)
    return v


def handle(msg):
    meta = msg.get("MetaData") or {}
    try:
        mmsi = int(meta.get("MMSI") or 0)
    except (TypeError, ValueError):
        return
    if not mmsi:
        return
    mt = msg.get("MessageType")
    body = msg.get("Message") or {}
    now = time.time()
    with LOCK:
        STATE["messages"] += 1
        if mt in ("PositionReport", "StandardClassBPositionReport", "ExtendedClassBPositionReport"):
            p = body.get(mt) or {}
            lat, lon = p.get("Latitude", meta.get("latitude")), p.get("Longitude", meta.get("longitude"))
            try:
                lat, lon = float(lat), float(lon)
            except (TypeError, ValueError):
                return
            if abs(lat) > 90 or abs(lon) > 180:
                return
            STATE["positions"] += 1
            sog = p.get("Sog")
            cog = p.get("Cog")
            hdg = p.get("TrueHeading")
            patch = {"lat": lat, "lon": lon, "ts": now, "box": box_for(lat, lon),
                     "sog": float(sog) if isinstance(sog, (int, float)) else None,
                     "cog": float(cog) if isinstance(cog, (int, float)) and cog < 360 else None,
                     "hdg": int(hdg) if isinstance(hdg, (int, float)) and hdg != 511 else None}
            if p.get("NavigationalStatus") is not None:
                patch["nav"] = p.get("NavigationalStatus")
            v = upsert(mmsi, patch)
            if not v["name"] and meta.get("ShipName"):
                v["name"] = clean(meta.get("ShipName"))
        elif mt == "ShipStaticData":
            s = body.get("ShipStaticData") or {}
            dim = s.get("Dimension") or {}
            upsert(mmsi, {"name": clean(s.get("Name")) or clean(meta.get("ShipName")), "type": s.get("Type"), "cls": ship_class(s.get("Type")),
                          "dest": clean(s.get("Destination")), "draught": s.get("MaximumStaticDraught") or None, "imo": s.get("ImoNumber") or None,
                          "callsign": clean(s.get("CallSign")), "length": (dim.get("A") or 0) + (dim.get("B") or 0) or None})
        elif mt == "StaticDataReport":
            s = body.get("StaticDataReport") or {}
            patch = {}
            a, b = s.get("ReportA") or {}, s.get("ReportB") or {}
            if a.get("Name"):
                patch["name"] = clean(a.get("Name"))
            if b.get("ShipType"):
                patch["type"] = b.get("ShipType")
                patch["cls"] = ship_class(b.get("ShipType"))
            if patch:
                upsert(mmsi, patch)


def prune(force=False):
    cutoff = time.time() - STALE_S
    for k in [k for k, v in VESSELS.items() if v["ts"] < cutoff or (force and v["lat"] is None)]:
        VESSELS.pop(k, None)


def iso(ts):
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(ts)) if ts else None


def stats():
    return {"enabled": True, "connected": STATE["connected"], "since": iso(STATE["since"]), "lastMessageAt": iso(STATE["lastMessageAt"]),
            "messages": STATE["messages"], "positions": STATE["positions"], "reconnects": STATE["reconnects"], "tracked": len(VESSELS),
            "lastError": STATE["lastError"], "boxes": len(BOXES), "relay": "droplet"}


def snapshot(max_vessels=1500):
    cutoff = time.time() - LIVE_WINDOW_S
    with LOCK:
        live = [v for v in VESSELS.values() if v["lat"] is not None and v["ts"] >= cutoff]
        boxes = {bid: {"id": bid, "label": lbl, "box": box, "vessels": 0, "anchored": 0, "moving": 0, "tanker": 0, "cargo": 0, "passenger": 0, "military": 0, "other": 0, "merchant": 0, "merchantStopped": 0}
                 for bid, (lbl, box) in BOXES.items()}
        for v in live:
            b = boxes.get(v["box"]) if v["box"] else None
            if not b:
                continue
            b["vessels"] += 1
            anchored = v["nav"] in (1, 5) or (v["sog"] is not None and v["sog"] < 0.5)
            b["anchored" if anchored else "moving"] += 1
            c = v["cls"]
            if c in ("tanker", "cargo"):
                b["merchant"] += 1
                if anchored:
                    b["merchantStopped"] += 1
            if c == "tanker":
                b["tanker"] += 1
            elif c == "cargo":
                b["cargo"] += 1
            elif c == "passenger":
                b["passenger"] += 1
            elif c in ("military", "law"):
                b["military"] += 1
            else:
                b["other"] += 1
        live.sort(key=lambda v: -v["ts"])
        out = [{"mmsi": v["mmsi"], "name": v["name"] or None, "cls": v["cls"], "type": v["type"], "lat": round(v["lat"], 4), "lon": round(v["lon"], 4),
                "sog": round(v["sog"], 1) if v["sog"] is not None else None, "cog": int(round(v["cog"])) if v["cog"] is not None else None,
                "nav": v["nav"], "dest": v["dest"] or None, "len": v["length"], "box": v["box"], "ts": iso(v["ts"])} for v in live[:max_vessels]]
        st = stats()
    st.update({"windowMinutes": LIVE_WINDOW_S // 60, "liveVessels": len(live), "boxes": boxes, "vessels": out})
    return st


async def stream():
    backoff = 1
    sub = json.dumps({"APIKey": API_KEY, "BoundingBoxes": [box for _, box in BOXES.values()],
                      "FilterMessageTypes": ["PositionReport", "StandardClassBPositionReport", "ExtendedClassBPositionReport", "ShipStaticData", "StaticDataReport"]})
    while True:
        try:
            async with websockets.connect(STREAM_URL, max_size=2 ** 22, ping_interval=20, ping_timeout=20) as ws:
                await ws.send(sub)
                with LOCK:
                    STATE["connected"] = True
                    STATE["since"] = time.time()
                    STATE["lastError"] = None
                backoff = 1
                while True:
                    raw = await asyncio.wait_for(ws.recv(), timeout=180)
                    if isinstance(raw, (bytes, bytearray)):
                        raw = raw.decode("utf-8", "replace")
                    try:
                        msg = json.loads(raw)
                    except ValueError:
                        continue
                    with LOCK:
                        STATE["lastMessageAt"] = time.time()
                    if msg.get("error"):
                        with LOCK:
                            STATE["lastError"] = str(msg.get("error"))
                        continue
                    handle(msg)
        except Exception as e:  # noqa: BLE001 — any failure: reconnect with backoff
            with LOCK:
                STATE["connected"] = False
                STATE["lastError"] = f"{type(e).__name__}: {e}"[:200]
                STATE["reconnects"] += 1
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, 60)


async def pruner():
    while True:
        await asyncio.sleep(300)
        with LOCK:
            prune(False)


class Handler(BaseHTTPRequestHandler):
    server_version = "ais-relay/1.0"

    def log_message(self, fmt, *args):  # quiet
        return

    def _send(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == "/healthz":
            with LOCK:
                return self._send(200, {"ok": True, **stats()})
        if self.headers.get("X-Relay-Token", "") != TOKEN or not TOKEN:
            return self._send(401, {"error": "bad token"})
        if u.path == "/snapshot":
            q = parse_qs(u.query)
            try:
                mx = min(int(q.get("max", ["1500"])[0]), 4000)
            except ValueError:
                mx = 1500
            return self._send(200, snapshot(mx))
        return self._send(404, {"error": "not found"})

    def do_POST(self):
        u = urlparse(self.path)
        if self.headers.get("X-Relay-Token", "") != TOKEN or not TOKEN:
            return self._send(401, {"error": "bad token"})
        if u.path != "/probe":
            return self._send(404, {"error": "not found"})
        try:
            n = min(int(self.headers.get("Content-Length", "0")), 65536)
            req = json.loads(self.rfile.read(n) or b"{}")
            urls = [str(x) for x in (req.get("urls") or [])][:80]
            timeout = min(max(float(req.get("timeout", 6)), 1), 10)
        except Exception as e:
            return self._send(400, {"error": f"bad body: {e}"})
        urls = [x.rstrip("/") for x in urls if x.startswith("http://") or x.startswith("https://")]

        def one(base):
            try:
                r = urllib.request.Request(base + "/status", headers={"User-Agent": "Crucix/2.0 (relay)"})
                with urllib.request.urlopen(r, timeout=timeout) as resp:
                    body = resp.read(8192).decode("utf-8", "replace")
                    return base, {"ok": resp.status == 200, "status": resp.status, "body": body, "error": None}
            except Exception as e:  # noqa: BLE001
                return base, {"ok": False, "status": None, "body": None, "error": type(e).__name__ + ": " + str(e)[:80]}

        out = {}
        with ThreadPoolExecutor(max_workers=16) as ex:
            for base, res in ex.map(one, urls):
                out[base] = res
        return self._send(200, out)


def main():
    if not API_KEY or not TOKEN:
        print("AISSTREAM_API_KEY and RELAY_TOKEN are required", file=sys.stderr)
        sys.exit(2)
    httpd = ThreadingHTTPServer((BIND, PORT), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    print(f"ais-relay listening on {BIND}:{PORT}, {len(BOXES)} boxes", flush=True)

    async def run():
        await asyncio.gather(stream(), pruner())

    asyncio.run(run())


if __name__ == "__main__":
    main()
