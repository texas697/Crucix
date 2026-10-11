#!/usr/bin/env python3
"""Tiny OpenSky relay. Google Cloud address space cannot reach opensky-network.org, so the MFB Intelligence
Cloud Run service sends its OpenSky calls here and this forwards them unchanged. Routes:
  POST /token      -> OpenSky OAuth2 token endpoint (form body passed through)
  GET  /api/<path> -> https://opensky-network.org/api/<path>?<query> (Authorization header passed through)
Every request must carry X-Relay-Token matching RELAY_TOKEN. Nothing is logged except status lines."""
import os, sys, urllib.request, urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

RELAY_TOKEN = os.environ.get('RELAY_TOKEN', '')
OPENSKY_API = 'https://opensky-network.org/api/'
OPENSKY_TOKEN = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token'
PORT = int(os.environ.get('PORT', '3010'))

class H(BaseHTTPRequestHandler):
    server_version = 'opensky-relay/1.0'
    def log_message(self, fmt, *args):
        sys.stderr.write('%s %s\n' % (self.command, fmt % args))

    def _deny(self, code, msg):
        body = msg.encode()
        self.send_response(code); self.send_header('Content-Type', 'text/plain'); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)

    def _authed(self):
        return RELAY_TOKEN and self.headers.get('X-Relay-Token', '') == RELAY_TOKEN

    def _forward(self, url, method, body=None):
        headers = {'User-Agent': 'Crucix/2.0 opensky-relay'}
        for h in ('Authorization', 'Content-Type', 'Accept'):
            if self.headers.get(h): headers[h] = self.headers[h]
        req = urllib.request.Request(url, data=body, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                data = r.read(); status = r.status; ctype = r.headers.get('Content-Type', 'application/json')
        except urllib.error.HTTPError as e:
            data = e.read(); status = e.code; ctype = e.headers.get('Content-Type', 'text/plain')
        except Exception as e:
            return self._deny(502, 'upstream error: %s' % e)
        self.send_response(status); self.send_header('Content-Type', ctype); self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data)

    def do_GET(self):
        if self.path == '/healthz': return self._deny(200, 'ok')
        if not self._authed(): return self._deny(401, 'relay token required')
        if not self.path.startswith('/api/'): return self._deny(404, 'not found')
        self._forward(OPENSKY_API + self.path[len('/api/'):], 'GET')

    def do_POST(self):
        if not self._authed(): return self._deny(401, 'relay token required')
        if self.path != '/token': return self._deny(404, 'not found')
        n = int(self.headers.get('Content-Length', '0') or 0)
        self._forward(OPENSKY_TOKEN, 'POST', self.rfile.read(n) if n else b'')

if __name__ == '__main__':
    if not RELAY_TOKEN: sys.exit('RELAY_TOKEN unset')
    ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
