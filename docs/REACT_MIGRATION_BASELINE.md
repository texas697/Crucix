# React migration — P0 baseline, parity inventory and defects

Status: P0 evidence record. Companion to `docs/REACT_MIGRATION_PLAN.md` (the issue of record).
Inspected commit: `70bef92`. This document is the migration checklist; every row needs a React owner
and passing evidence before the surface is retired (P9).

It is produced from source inspection and the fixture-backed browser harness, not from a live sweep.

## How this is run

```sh
npm ci
npm run fixtures:build        # raw fixtures -> synthesized /api/data fixtures (deterministic)
npm test                      # backend unit tests + fixture no-diff test
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e              # browser baseline against the loopback fixture server
npm run serve:fixtures        # run the fixture server by hand (FIXTURE=minimal|empty|...)
```

The harness serves the **unmodified legacy pages** from `dashboard/public` against deterministic
fixture data. It never contacts a collector, provider, Firebase, CDN or tile host — third-party
requests are routed to pinned local copies under `test/fixtures/vendor` and any unrouted third-party
request fails the test.

## Fixtures

Two families, kept provably equal by `test/fixtures.test.mjs`:

- `test/fixtures/runs/*.json` — raw sweep format (what the server reads from `RUNS_DIR` and passes
  through `synthesize()`): `minimal`, `empty`, `partial`, `stale`, `hostile`.
- `test/fixtures/synthesized/*.json` — the derived `/api/data` envelope the browser sees.

`test/fixtures/build.mjs` builds the second from the first under a frozen clock with an injected
no-op news fetcher and an empty OpenSky-fallback directory, so regeneration is byte-stable. The
no-diff test fails when a raw fixture changes without regenerating the derived one.

## Parity inventory (source: `dashboard/public`, `dashboard/auth`)

### Dashboard (`jarvis.html`, `/`)

Top bar: brand logo (light/dark), `.mainnav` tabs (Dashboard `/`, Readers Digest `/digest`,
Live media `/media`), status pill (live dot, sources ok/queried, model, sweep time), theme toggle,
BYOK pill / "Add your AI key" CTA, user chip + logout, dismissible BYOK banner.

Map region bar: region tabs (world/americas/europe/middleEast/asiaPacific/africa), map search,
live dot, sources/markers/news meta, map hint.

Map: MapLibre canvas + loading overlay; legend (region-clear chip, All/None, time all/1h/24h/7d,
layer filter search, per-layer chips + info buttons); controls (zoom in/out, draw circle/rectangle/
polygon, clear); draw hint; selection panel (title, count, clear, body); popup (head/text/meta +
copy-coords / open-source / "new"); draw preview, corridors, trails, orbital ground track.

Panels: Sensor grid; Nuclear watch (+ status banner); Risk gauges; Live news ticker; Health watch;
Signal core; Sweep delta; Disasters; Internet outages; Leverageable ideas; Maritime watch;
Space watch; Air-raid alerts; Regional threat; Drone & missile tracker; Prediction markets;
Macro + markets (indexes / crypto / energy+metals+macro / WTI 5-day spark).

Dialogs/overlays: Signal Guide; Layer info; Settings/BYOK (provider, key, model, base URL,
auto-refresh, Save, Test, Generate, Remove, message); shared Reader modal.

### Startup (`loading.html`, `/` before first sweep)

Boot lines, status cycle, countdown / "FINALIZING…", "TERMINAL READY". `EventSource('/events')`
with `onerror → location.reload()` after 3s; `/api/data` poll every 5s. (See defect D1.)

### Digest (`digest.html`, `/digest[/:id]`)

Status line, filter tabs (all/foryou/thinktank/news), topic filter, search, article list with
ratings, empty state, shared Reader, `#no-advice`-style links. Query keys: article path, legacy
`open`, `filter`, `topic`, `q`.

### Media (`media.html`, `/media[/:id]`)

Channel list, player, HLS.js + native fallback, loading/error/retry overlays, broadcaster/YouTube
fallback, mute/volume, grid, fullscreen, picture-in-picture, shortcuts. Query key: `grid`.

### Login (`login.html`, `/login?next&reason`)

Sign in / sign up / reset, Google popup + redirect fallback, reason=expired message, disabled and
error states. (See defect D2.)

### Public site (`dashboard/site/*`)

`/mfb-think-tank`, `/support`, `/privacy` (+`/privacy-policy`), `/terms` (+`/terms-of-service`).
Tokens: `APP_NAME`, `APP_NAME_URL` (URL-encoded), `OPERATOR`, `CONTACT_EMAIL`, `JURISDICTION`,
`STORE_LINKS`, `POSTAL_ADDRESS_LINE`, `META`, `YEAR`, `TITLE`, `DOC_TITLE`, `DESCRIPTION`, `BODY`.
Anchors: privacy `#summary #collect #not-collect #use #share #ai #retention #delete-account #rights
#security #transfers #children #changes #contact`; terms `#eligibility #account #service #license
#acceptable-use #no-advice #information #byok #ip #purchases #termination #disclaimers #liability
#disputes #app-stores #general #contact`; support `#faq`, `#delete-account`. `<details open>` blocks
and the print stylesheet are preserved verbatim.

## Empty / error / loading states

- Dashboard: pre-first-sweep `/api/data` 503 (5s reload), 401 → `/login?reason=expired`, auth-off
  `/api/me` 404 → local mode, boot sequence, map loading/unavailable, per-panel loading/empty text,
  BYOK no-key CTA/card, degraded/partial coverage labels, sweep banner.
- Digest: `LOADING…`, `NOTHING HERE YET…`, `ERROR …`.
- Reader: `LOADING…` / `FETCHING ARTICLE…`, research stages, error blocks.
- Media: loading / feed-unavailable (YouTube / broadcaster / retry) / cannot-play-HLS.
- Login: reason=expired + Firebase error strings.

## Routes, query keys and history

Dashboard: `region hide time pin shape info guide settings read` (history kinds region/shape/pin/
info/guide/settings/read; initial normalisation). Digest: path id / legacy `open`, `filter topic q`
(kinds read/list). Media: path id, `grid` (kind channel). Login: `next`, `reason`. Geometry encoding
`c:lat,lng,r` / `r:s,w,n,e` / `p:lat,lng;…`.

## Cross-surface and shared contracts

- Reader events: `reader:open`, `reader:close`, `reader:resolved`, `digest:vote`, `digest:topic`.
- Globals: `window.MFBReader {open,close,mdToHtml,isOpen,currentId}`, `window.UrlState {parse,build,set,here}`,
  host callback `openSettings`.
- Settings handoff: reader key CTA → host `openSettings`; digest navigates `/?settings=1`; dashboard
  opens the overlay in place once `/api/me` resolves.
- Storage keys: localStorage `crucix_theme`, `crucix_low_perf`, `crucix_region`,
  `crucix_markets_open`, `crucix_byok_prompted`; sessionStorage `crucix_byok_banner_dismissed`,
  `crucix_google_redirect`.

## Localization

Dashboard only, server-selected language. `t()` namespaces: `boot.*`, `dashboard.terminalActive`,
`delta.*`, `ideas.*`, `layers.*`, `metrics.*`, `nuclear.*`, `panels.*`, `space.newLast30d`.
Every page declares `lang="en"`. Digest/media/startup/login/public remain hard-coded English.

## Navigation

Identical `speculationrules` (prerender `.mainnav a`, eagerness moderate) on dashboard, digest and
media; `@view-transition { navigation: auto }` on those three.

## External dependencies (pinned; routed locally in tests)

| Library / host | Version | Upstream |
| --- | --- | --- |
| MapLibre GL JS | 4.7.1 | unpkg |
| GSAP | 3.12.5 | cdnjs |
| satellite.js | 6.0.1 | cdnjs |
| hls.js | 1.5.17 | jsdelivr |
| Firebase compat (`app`,`auth`) | 10.14.1 | gstatic |
| Google Fonts (Geist, Geist Mono, IBM Plex Mono, Space Grotesk) | — | fonts.googleapis.com |
| Carto basemaps (dark-matter, dark-matter-nolabels, positron) | — | cartocdn |
| USGS earthquakes `2.5_day.geojson` | — | earthquake.usgs.gov |
| Polymarket `gamma-api …/events` | — | gamma-api.polymarket.com |

Same-origin cadences: sweep fallback 60s (`/api/health`), tracks 15s, alerts 45s, AIS 60s,
earthquakes 60s, satellite positions 5s, research 2.5s, personal auto-ideas ~90s after a sweep.

## Documented baseline defects (pre-existing — not regressions)

- **D1 — startup reload loop.** `dashboard/public/loading.html` opens `EventSource('/events')`
  unconditionally and reloads the page 3s after any stream error. Behind Firebase Hosting `/events`
  answers 204, so the startup page is a 3-second full-page reload loop there. P4a replaces it with
  the dashboard's SSE host gate and no reload; P0 records it as baseline.
- **D2 — open redirect on login `next`.** `dashboard/auth/login.html` accepts a `next` value when it
  starts with `/` and not `//`. `/\evil.com` passes and `location.replace()` resolves it to
  `https://evil.com/`. P6 replaces the check with a same-origin `URL` comparison.
- **D3 — export spends the operator LLM key.** `dashboard/inject.mjs` `cliInject()` calls the
  configured operator provider to generate ideas by default (`npm run inject`), embedding paid
  output. P8 moves this behind an explicit `--llm` opt-in (default off) and embeds rule-based ideas
  otherwise. Recorded here so P8's change is not treated as a regression.

## Baseline metrics

Captured per fixture/browser/viewport by the browser harness and stored as CI artifacts. Record
initial JS transfer, dashboard usable time, map-ready time, update cost, request rate and active
timers/connections. Proposed regression budget (section 6): ≤10% worse median usable/map-ready time
or p95 update cost; no sustained increase in request/subscription count; no monotonic resource
growth after 20 mount/unmount/theme/basemap/media-grid cycles. The explicit initial bundle cap is
set in P1 from these numbers plus the minimal React runtime.

### Recorded results (commit at P0)

- `npm test` — 100 passing, 0 failing (95 pre-existing backend tests + 5 fixture tests:
  raw-fixtures-exist, no-diff, determinism, empty-panels, hostile-content).
- `npm run fixtures:build` — 5 synthesized fixtures regenerate deterministically
  (`empty` 3,561 B; `hostile` 20,258 B; `minimal` 20,535 B; `partial` 4,475 B; `stale` 19,842 B).
- `npm run test:e2e` (`npx playwright test`) — **11 passing, 3 failing**:
  - chromium-desktop (4) — dashboard/digest/media smoke + metrics: pass.
  - chromium-mobile (4) — pass.
  - firefox-smoke (3) — pass.
  - webkit-smoke (3) — **environment limitation**: the local host lacks `libavif16` and
    `libmanette-0.2-0`, so WebKit cannot launch. Not a product failure. CI installs browsers with
    `npx playwright install --with-deps`, which provides these; WebKit is a smoke engine, so its
    coverage must be confirmed by the CI `browser` job before cutover (section 6).
- Third-party routing is enforced: a test fails if any request to a non-localhost host is not
  vendored (the media autoplay stream initially surfaced this and is now served from
  `test/fixtures/vendor/hls-fixture`).

## Exit criteria (P0 gate)

- Existing Node tests have recorded results (100 passing at P0).
- Critical legacy flows pass in the browser harness or are listed as documented pre-existing
  failures above (dashboard/digest/media on chromium + firefox).
- Screenshots and performance numbers have reproducible fixture/browser/viewport definitions.
- The same scenarios are reusable against React (the harness is surface-agnostic; only the fixture
  server's page selection changes in later phases).

