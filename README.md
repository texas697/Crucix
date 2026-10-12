<div align="center">

# MFB Services Intelligence

**One private dashboard for what's happening in the world. 28 open sources, refreshed every 15 minutes.**

[![Node.js 22+](https://img.shields.io/badge/node-22%2B-brightgreen)](#quick-start)
[![License: AGPL v3](https://img.shields.io/badge/license-AGPLv3-blue.svg)](LICENSE)
[![Sources](https://img.shields.io/badge/OSINT%20sources-28-cyan)](#data-sources-28)
[![Docker](https://img.shields.io/badge/docker-ready-blue?logo=docker)](#docker)

[Demo video](docs/media/mfbintelligence-demo.mp4)

</div>

MFB Services Intelligence pulls satellite fire detection, flight tracking, radiation monitoring, satellite tracking,
economic indicators, live markets, conflict data, sanctions lists and social sentiment from 28 public feeds, in
parallel, every 15 minutes. It puts them on one sign-in-protected dashboard with an interactive map, live TV,
and a reading library.

It is a fork of the open-source [Crucix](https://github.com/calesthio/Crucix) project (AGPL-3.0) with a new
interface, a Firebase login, per-user AI keys and a Google Cloud deployment.

## Why This Exists

Most real-time information about the world (conflict events, flights, radiation levels, economic indicators,
shipping) is public. It is just scattered across dozens of government and research feeds that nobody has time to
check one by one. This brings it together in one place, with changes since the last refresh called out so you
can see what moved.

---

## Quick Start

```bash
git clone https://github.com/texas697/Crucix.git
cd Crucix
npm install
cp .env.example .env     # add keys (see "API Keys Setup"); none are required to start
AUTH_MODE=off npm run dev  # AUTH_MODE=off skips the login for local use
```

The dashboard opens at `http://localhost:3117` and starts its first sweep, which queries all 28 sources in
parallel and takes 30-60 seconds. After that it refreshes every 15 minutes and pushes updates to the browser
automatically.

> **If `npm run dev` fails silently**, run `node --trace-warnings server.mjs` directly, or `node diag.mjs`
> to check your Node version, imports and port. See [Troubleshooting](#troubleshooting).

**Requirements:** Node.js 22+.

### Cloud (Google Cloud Run + Firebase)

```bash
PROJECT=my-project ./deploy/cloudrun.sh
```

Full walkthrough, Firebase Hosting front door and cost notes: [docs/CLOUD_RUN.md](docs/CLOUD_RUN.md).

### Docker

```bash
cp .env.example .env
docker compose up -d
```

Dashboard at `http://localhost:3117`. Sweep data persists in `./runs/`.

---

## What You Get

### Dashboard
- **Interactive map** (MapLibre vector map) with layers for fires, air traffic, radiation sites, shipping
  chokepoints, SDR receivers, OSINT events, health alerts, news and conflict events. Includes layer filters,
  region and time filters, search, a marker drawer, curved flight corridors, and distance/range-ring tools.
- **Area briefs:** draw a circle, rectangle or freeform area on the map and the panel fills with the places inside
  it, the freshest headlines about them (sweep RSS, Readers Digest, and a live Google News query) and a short
  AI-written brief with cited headlines and a "watch" line. Uses your own key if you saved one, otherwise the site's
  shared key, and shows exactly what each brief cost.
- **Light and dark themes**, a responsive layout for phones, and a live Sources / Model / time status bar.
- **Live markets:** indexes, crypto, energy and commodities (Yahoo Finance, no key needed), plus risk gauges
  for VIX, high-yield spread and supply-chain pressure.
- **Sweep delta:** what changed since the last refresh (new signals, escalations, de-escalations).
- **Cross-source signals:** correlations across satellite, economic, conflict and social data.
- **Maritime watch:** ships per day through the major chokepoints against the one-year average, with PortWatch disruption events (e.g. Hormuz, Red Sea) flagged on the map and in the Maritime watch card.
- **Deep links / history:** the address bar carries the view. Dashboard: `/?region=middleEast&hide=news,sdr&time=24h&pin=<lat>,<lng>&shape=c:<lat>,<lng>,<km>&info=<layer>&guide=1&settings=1&read=<articleId>`; Readers Digest: `/digest/<articleId>?filter=thinktank&topic=<topic>&q=<text>`; Live media: `/media/<channelId>?grid=1`. Refresh restores the view, the browser back button closes what you opened, and the login page returns you to the same link.
- **Nuclear watch:** live gamma dose rate from Safecast's fixed-sensor network around 11 nuclear sites (median per site, every sensor on the map), plus EPA RadNet.
- **Space watch:** ISS position, recent launches, and Starlink/OneWeb and military constellation counts, with open
  fallbacks when CelesTrak is unreachable.
- **Regional threat view:** air-raid alerts, a live drone and missile tracker, strike watch and prediction markets.
- **Conflict events:** geocoded protests, coercion, assaults and armed clashes from GDELT's raw 15-minute event
  export (rolling 6-hour window, no API key, no rate limit), clustered by place and sized by how many outlets report
  them. Rings the armed-clash clusters and scores each theater when no ACLED licence is configured.
- **News feed:** merged RSS and GDELT headlines, geo-tagged by the place named in the headline.
- **Live TV:** a news video section with an HLS player (`/media`).
- **Ideas:** AI-generated trade ideas using your own key, or rule-based ideas from correlated signals when none is set.

### Readers Digest
`/digest` is a reading library of 30 curated feeds: think tanks (Brookings, CFR, RAND, Atlantic Council, Hoover,
Heritage, AEI, Stimson, Crisis Group, Lowy, War on the Rocks, NBER, Foreign Affairs) plus policy, defense and
markets press. Sports, weather and entertainment are filtered out.

- Each piece gets a write-up (TL;DR, key points, why it matters, what to watch) from your AI model.
- Thumbs up/down train a per-topic ranking that reorders the library after five ratings.
- **Read more about it** gathers fresh related coverage, reads it, and has your model write a cited deep dive.
- Dashboard news cards open in the same reader.

Ingest runs after every sweep and from a 30-minute scheduler job (`POST /api/internal/digest`).

### Login and Bring Your Own Key
Every page and API call requires a signed-in Firebase user (`AUTH_MODE=firebase`), with Google or email/password
sign-in. After signing in, click **AI key** in the top bar and add your own Anthropic, OpenAI, Gemini,
OpenRouter, Grok, Mistral or MiniMax key (or any OpenAI-compatible endpoint). The key is AES-256-GCM encrypted
in Firestore and used only for your own ideas and digest write-ups.

Restrict access with `AUTH_ALLOWED_EMAILS` / `AUTH_ALLOWED_DOMAINS`, or set `AUTH_ALLOW_SIGNUP=false` and create
accounts in the Firebase console.

### Auto-Refresh
Every 15 minutes (configurable) the server:
1. Queries all 28 sources in parallel (~30s)
2. Synthesizes the raw data for the dashboard
3. Computes the delta from the previous run
4. Generates ideas (when a key is configured)
5. Pushes the update to connected browsers

### Optional LLM layer
Anthropic Claude, OpenAI, Google Gemini, OpenRouter, OpenAI Codex, MiniMax, Mistral, Grok, Ollama and
OpenAI-compatible endpoints. When no model is available a rule-based engine takes over, and LLM failures never
break a sweep.

---

## API Keys Setup

Copy `.env.example` to `.env` at the project root:

```bash
cp .env.example .env
```

### Required for Best Results (all free)

| Key | Source | How to Get |
|-----|--------|------------|
| `FRED_API_KEY` | Federal Reserve Economic Data (optional: without it the source reads FRED's public graph CSV) | [fred.stlouisfed.org](https://fred.stlouisfed.org/docs/api/api_key.html) — instant, free |
| `FIRMS_MAP_KEY` | NASA FIRMS (satellite fire data) | [firms.modaps.eosdis.nasa.gov](https://firms.modaps.eosdis.nasa.gov/api/area/) — instant, free |
| `EIA_API_KEY` | US Energy Information Administration | [api.eia.gov](https://www.eia.gov/opendata/register.php) — instant, free |

These three unlock the most valuable economic and satellite data. Each takes about 60 seconds to register.

### Optional (enable additional sources)

| Key | Source | How to Get |
|-----|--------|------------|
| `ACLED_EMAIL` + `ACLED_PASSWORD` | Armed conflict event data | [acleddata.com/register](https://acleddata.com/register/) — free, OAuth2 |
| `AISSTREAM_API_KEY` | Live AIS vessel positions around the chokepoints (Ships map layer, live counts on the Maritime watch) | [aisstream.io](https://aisstream.io/) — free |
| `ADSB_API_KEY` | Unfiltered flight tracking | [RapidAPI](https://rapidapi.com/adsbexchange/api/adsbexchange-com1) — ~$10/mo |

### LLM Provider (optional, for AI-enhanced ideas)

Set `LLM_PROVIDER` to one of: `anthropic`, `openai`, `gemini`, `codex`, `openrouter`, `minimax`, `mistral`, `grok`

| Provider | Key Required | Default Model |
|----------|-------------|---------------|
| `anthropic` | `LLM_API_KEY` | claude-sonnet-4-6 |
| `openai` | `LLM_API_KEY` | gpt-5.4 |
| `gemini` | `LLM_API_KEY` | gemini-3.1-pro |
| `openrouter` | `LLM_API_KEY` | openrouter/auto |
| `codex` | None (uses `~/.codex/auth.json`) | gpt-5.3-codex |
| `minimax` | `LLM_API_KEY` | MiniMax-M2.5 |
| `mistral` | `LLM_API_KEY` | mistral-large-latest |
| `grok` | `LLM_API_KEY` | grok-4-latest |

For Codex, run `npx @openai/codex login` to authenticate via your ChatGPT subscription.

### Without Any Keys

Crucix still works with zero API keys. 18+ sources require no authentication at all. Sources that need keys return structured errors and the rest of the sweep continues normally.

---

## Architecture

```
crucix/
├── server.mjs                 # Express dev server (SSE, auto-refresh, LLM, bot commands)
├── crucix.config.mjs          # Configuration with env var overrides + delta thresholds
├── diag.mjs                   # Diagnostic script — run if server fails to start
├── .env.example               # All documented env vars
├── package.json               # Runtime: express, firebase-admin
├── docs/                      # Screenshots for README
│
├── apis/
│   ├── briefing.mjs           # Master orchestrator — runs all 28 sources in parallel
│   ├── save-briefing.mjs      # CLI: save timestamped + latest.json
│   ├── BRIEFING_PROMPT.md     # Intelligence synthesis protocol
│   ├── BRIEFING_TEMPLATE.md   # Briefing output structure
│   ├── utils/
│   │   ├── fetch.mjs          # safeFetch() — timeout, retries, abort, auto-JSON
│   │   └── env.mjs            # .env loader (no dotenv dependency)
│   └── sources/               # 28 self-contained source modules
│       ├── gdelt.mjs          # Each exports briefing() → structured data
│       ├── fred.mjs           # Can run standalone: node apis/sources/fred.mjs
│       ├── space.mjs          # CelesTrak element sets + SGP4 (satellite.js) station positions
│       ├── yfinance.mjs       # Yahoo Finance — free live market data
│       └── ...                # 23 more
│
├── dashboard/
│   ├── inject.mjs             # Data synthesis + standalone HTML injection
│   └── public/
│       ├── jarvis.html        # Main dashboard
│       ├── digest.html        # Readers Digest
│       └── media.html         # Live TV
│
├── lib/
│   ├── llm/                   # LLM abstraction (8 providers, raw fetch, no SDKs)
│   │   ├── provider.mjs       # Base class
│   │   ├── anthropic.mjs      # Claude
│   │   ├── openai.mjs         # GPT
│   │   ├── gemini.mjs         # Gemini
│   │   ├── grok.mjs           # Grok
│   │   ├── openrouter.mjs     # OpenRouter (Unified API)
│   │   ├── codex.mjs          # Codex (ChatGPT subscription)
│   │   ├── minimax.mjs        # MiniMax (M2.5, 204K context)
│   │   ├── mistral.mjs        # Mistral AI
│   │   ├── ideas.mjs          # LLM-powered trade idea generation
│   │   └── index.mjs          # Factory: createLLMProvider()
│   ├── delta/                 # Change tracking between sweeps
│   │   ├── engine.mjs         # Delta computation — semantic dedup, configurable thresholds, severity scoring
│   │   ├── memory.mjs         # Hot memory (3 runs, atomic writes) + cold storage (daily archives)
│   │   └── index.mjs          # Re-exports
│
└── runs/                      # Runtime data (gitignored)
    ├── latest.json            # Most recent sweep output
    └── memory/                # Delta memory (hot.json + cold/YYYY-MM-DD.json)
```

### Design Principles
- **Pure ESM** — every file is `.mjs` with explicit imports
- **Minimal dependencies** — Express and firebase-admin are the only runtime dependencies. LLM providers use raw `fetch()`, no SDKs.
- **Parallel execution** — `Promise.allSettled()` fires all 28 sources simultaneously
- **Graceful degradation** — missing keys produce errors, not crashes. LLM failures don't kill sweeps.
- **Each source is standalone** — run `node apis/sources/gdelt.mjs` to test any source independently
- **Self-contained dashboard** — the HTML file works with or without the server

---

## Data Sources (28)

### Tier 1: Core OSINT & Geopolitical (11)

| Source | What It Tracks | Auth |
|--------|---------------|------|
| **GDELT** | Global news events, conflict mapping (100+ languages) | None |
| **OpenSky** | One global ADS-B snapshot per sweep sliced into 10 theaters; adsb.lol military feed + rotating theater samples as fallback | None (free OpenSky API client raises the quota) |
| **NASA FIRMS** | Thermal anomalies in 6 watched regions from the public 24 h Suomi NPP + NOAA-20 VIIRS feeds | None (optional MAP_KEY uses the 48 h area API) |
| **Maritime (PortWatch)** | Daily transit counts for 28 chokepoints vs 1-year baseline, plus open disruption events (IMF PortWatch open data) | None (AISSTREAM_API_KEY adds live per-vessel AIS) |
| **Safecast** | Live radiation sensors (tt.safecast.org realtime feed) near 11 nuclear sites; Bushehr, Yongbyon and Dimona have no public coverage | None |
| **ACLED** | Armed conflict events: battles, explosions, protests | Free (OAuth2) |
| **ReliefWeb** | UN humanitarian crisis tracking | None |
| **WHO** | Disease outbreaks and health emergencies | None |
| **OFAC** | US Treasury sanctions (SDN list) | None |
| **OpenSanctions** | Aggregated global sanctions (30+ sources) | Partial |
| **ADS-B Exchange** | Unfiltered flight tracking including military | Paid |

### Tier 2: Economic & Financial (7)

| Source | What It Tracks | Auth |
|--------|---------------|------|
| **FRED** | 21 key indicators: yield curve, CPI, VIX, HY spread, fed funds, M2 | None (public graph CSV); optional free key uses the JSON API |
| **US Treasury** | National debt, yields, fiscal data | None |
| **BLS** | CPI, unemployment, nonfarm payrolls, PPI | None |
| **EIA** | WTI/Brent crude, natural gas, inventories | Free key |
| **GSCPI** | NY Fed Global Supply Chain Pressure Index | None |
| **USAspending** | Federal spending and defense contracts | None |
| **UN Comtrade** | Strategic commodity trade flows between major powers | None |

### Tier 3: Weather, Environment, Tech, Social, SIGINT, Cyber (8)

| Source | What It Tracks | Auth |
|--------|---------------|------|
| **NOAA/NWS** | Active US weather alerts | None |
| **EPA RadNet** | US government radiation monitoring | None |
| **USPTO Patents** | Patent filings in 7 strategic tech areas | None |
| **Bluesky** | Social sentiment on geopolitical/market topics | None |
| **Reddit** | Social sentiment from key subreddits | OAuth |
| **KiwiSDR** | Public HF receiver directory (receiverbook.de) plus live /status probes of every receiver inside the watched regions | None |
| **CISA KEV** | Known exploited vulnerabilities catalog | None |
| **Cloudflare Radar** | Internet outages and traffic anomalies | API token |

### Tier 4: Space & Satellites (1)

| Source | What It Tracks | Auth |
|--------|---------------|------|
| **CelesTrak** | Satellite launches, ISS tracking, military constellations, Starlink/OneWeb counts | None |

### Tier 5: Live Market Data (1)

| Source | What It Tracks | Auth |
|--------|---------------|------|
| **Yahoo Finance** | Real-time prices: SPY, QQQ, BTC, Gold, WTI, VIX + 9 more | None |

---

## npm Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `node --trace-warnings server.mjs` | Start dashboard with auto-refresh |
| `npm run sweep` | `node apis/briefing.mjs` | Run a single sweep, output JSON to stdout |
| `npm run inject` | `node dashboard/inject.mjs` | Inject latest data into static HTML |
| `npm run brief:save` | `node apis/save-briefing.mjs` | Run sweep + save timestamped JSON |
| `npm run diag` | `node diag.mjs` | Run diagnostics (Node version, imports, port check) |

---

## Configuration

All settings are in `.env` with sensible defaults:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3117` | Dashboard server port |
| `REFRESH_INTERVAL_MINUTES` | `15` | Auto-refresh interval |
| `LLM_PROVIDER` | disabled | `anthropic`, `openai`, `gemini`, `codex`, `openrouter`, `minimax`, `mistral`, or `grok` |
| `LLM_API_KEY` | — | API key (not needed for codex) |
| `LLM_MODEL` | per-provider default | Override model selection |

Delta engine thresholds (how sensitive the system is to changes between sweeps) can be customized in `crucix.config.mjs` under the `delta.thresholds` section. The defaults are tuned to filter out noise while catching meaningful moves.

---

## API Endpoints

When running `npm run dev`:

| Endpoint | Description |
|----------|-------------|
| `GET /` | Dashboard (requires sign-in unless `AUTH_MODE=off`) |
| `GET /api/data` | Current synthesized intelligence data (JSON) |
| `GET /api/health` | Server status, uptime, source count, LLM status |
| `GET /events` | SSE stream for live push updates |
| `POST /api/map/region` | Area brief for a drawn shape: `{shape, markers, mode:"articles"\|"brief"}` → places, ranked headlines, and (brief mode) the LLM brief plus key owner and cost |

---

## Troubleshooting

### `npm run dev` exits silently (no output, no error)

This is a known issue where npm's script runner can swallow errors, particularly on Windows PowerShell. Try these in order:

**1. Run Node directly (bypasses npm):**
```bash
node --trace-warnings server.mjs
```
This is functionally identical to `npm run dev` but gives you full error output.

**2. Run the diagnostic script:**
```bash
node diag.mjs
```
This tests every import one by one, checks your Node.js version, and verifies port 3117 is available. It will tell you exactly what's failing.

**3. Check if port 3117 is already in use:**

A previous Crucix instance may still be running in the background.

```powershell
# Windows PowerShell
netstat -ano | findstr 3117
taskkill /F /PID <the_PID_from_above>

# Or kill all Node processes
taskkill /F /IM node.exe
```

```bash
# macOS / Linux
lsof -ti:3117 | xargs kill
```

Then try starting again. You can also change the port by setting `PORT=3118` in your `.env` file.

**4. Check Node.js version:**
```bash
node --version
```
Crucix requires Node.js 22 or later. If you have an older version, download the latest LTS from [nodejs.org](https://nodejs.org/).

### Dashboard shows empty panels after first start

This is normal — the first sweep takes 30–60 seconds to query all 28 sources. The dashboard will populate automatically once the sweep completes. Check the terminal for sweep progress logs.

### Some sources show errors

Expected behavior. Sources that require API keys will return structured errors if the key isn't set. The rest of the sweep continues normally. Check the Source Integrity section in the dashboard (or the server logs) to see which sources failed and why. The 3 most impactful free keys to add are `FRED_API_KEY`, `FIRMS_MAP_KEY`, and `EIA_API_KEY`.

OpenSky's anonymous quota is 400 credits per IP per day. Crucix spends 4 per sweep (one global snapshot) so a
15-minute schedule fits, but Cloud Run egress IPs are shared and often already throttled (`HTTP 429`). Crucix does
not try to evade that. It falls back to adsb.lol: the global military feed every sweep, plus one 250 nm sample per
theater in rotation (adsb.lol accepts roughly one request every 4 s). Theaters read that way are marked "sampled"
in their popup. For full coverage create a free OpenSky account, add an API client under Account, and set
`OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET` (in Secret Manager on Cloud Run; the deploy script wires them).

OpenSky also firewalls Google Cloud address space outright (TCP connects from Cloud Run time out, credentials or
not). `deploy/opensky-relay.py` is a dependency-free Python relay to run on any other host: it forwards the token
exchange and API calls unchanged and requires an `X-Relay-Token` header. Run it behind TLS (a Cloudflare tunnel
works well), then set `OPENSKY_RELAY_URL` and `OPENSKY_RELAY_TOKEN` on the service. The deploy script picks both up
when `OPENSKY_RELAY_URL` is exported and the `OPENSKY_RELAY_TOKEN` secret exists.

---

---

## Credits and License

Built on [Crucix](https://github.com/calesthio/Crucix) by calesthio. Licensed under AGPL-3.0; see `LICENSE`. Contribution guidelines are in `CONTRIBUTING.md` and security reports go through `SECURITY.md`.
