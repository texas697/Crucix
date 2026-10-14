# React UI migration plan

Status: proposed implementation plan; no application changes made.
Inspected: October 14, 2026; branch `main`, commit `70bef92`.

## 1. Outcome and scope

Convert the user-facing UI to React while preserving its current design, data meaning, routes, authentication, live-update protocol, public origin and Cloud Run plus Firebase Hosting delivery. The migration adds a frontend build, a multi-stage container, a staging service and deploy-workflow inputs; it does not change where the app runs or how traffic reaches it. The one deliberate runtime behavior change is the startup page's stream handling (section 4, Live data). Ship small, independently reversible changes. Completion requires browser evidence and an exercised rollback, not just successful compilation.

Planning assumption: scope includes the dashboard, startup/loading screen, shared article reader, digest, media, login, and public marketing/support/legal pages. A scope preference was requested during planning; this document uses full UI coverage with visual parity as the default. A redesign should be separate work.

Keep Express, existing API response shapes, Firebase/Firestore, source collection, synthesis, delta computation, and LLM execution in their current roles. Keep the same public origin and Firebase Hosting → Cloud Run routing. TypeScript applies to new frontend code; converting the backend is outside this migration.

Preserve the existing untracked `docs/RENAME_PLAN.md`. Its proposed renames are not assumed to have happened. Reconcile this plan with the actual branch before implementation; keep rebranding and React conversion in separate changes. `CONTRIBUTING.md` requests an issue before dependency additions, deployment-model changes and new feature families; this migration does all three. GitHub Issues are disabled on `texas697/Crucix` (`docs/RENAME_PLAN.md` notes the same), so either enable Issues and open the migration issue before P0, or merge this document through its own PR and reference it from every implementation PR as the issue of record. The dependency rationale lives in section 3 so a PR reviewer can find it without an issue tracker.

## 2. Verified starting point

| Area | Evidence | Migration consequence |
| --- | --- | --- |
| Dashboard | `dashboard/public/jarvis.html`: 3,052 lines; inline CSS, data, state, rendering and event handlers. Startup at :3030 fetches `/api/data`. | Extract behavior and presentation in bounded slices; do not turn the whole script into one React effect. |
| Map | `jarvis.html:17`, :19, :1725, :1787, :1931. MapLibre GL JS 4.7.1; 17 layer definitions at :992. | Preserve MapLibre and its current layer semantics. Globe/D3 names and CSS include stale remnants; there is no active Globe.gl/D3 renderer to migrate. |
| Other dashboard libraries | `jarvis.html:18`, :20, :1872, :2711. GSAP 3.12.5 and satellite.js 6.0.1. | Preserve active boot animation and orbital propagation before considering library changes. |
| Reader and digest | `dashboard/public/js/reader.js`, `dashboard/public/js/urlstate.js`, `dashboard/public/digest.html`. Reader depends on host globals and dispatches custom events. | Replace shared behavior once; preserve reader entry points from both dashboard and digest. |
| Media | `dashboard/public/media.html:13`, :129. HLS.js 1.5.17, native HLS fallback, channel/grid history. | Isolate player lifetimes and retain Safari/native behavior. |
| Authentication | `dashboard/auth/login.html:72`, :99; `lib/auth/firebase.mjs:12`, :154; `server.mjs:167`, :238. | Retain Firebase login → ID token → server session flow and middleware ordering. |
| Public site | `dashboard/site/*`; `server.mjs:131`, :150, :162. Site configuration fills HTML templates once at process start; pages are served as cached strings with `public, max-age=3600`. Substitution has three classes: HTML-escaped text (`APP_NAME`, `OPERATOR`, `CONTACT_EMAIL`, `JURISDICTION`), URL-encoded text inside `mailto:` subjects (`APP_NAME_URL`), and raw HTML fragments (`STORE_LINKS`, `POSTAL_ADDRESS_LINE`, `META`). Pages carry stable fragment anchors (`#delete-account`, `#no-advice`, `#faq`, TOC ids) linked across pages. | Preserve readable no-JavaScript pages, metadata, configuration, legal text, aliases, every substitution class and every anchor. |
| Startup page | `dashboard/public/loading.html:163`, :173. Opens `new EventSource('/events')` with no host check; `onerror` closes the stream and calls `location.reload()` after 3 seconds; polls `/api/data` every 5 seconds. Behind Firebase Hosting `/events` is 204 (`server.mjs:334`), so the startup page is a 3-second full-page reload loop there today. `jarvis.html:3041` reloads 5 seconds after a `/api/data` failure at `/`, which the server answers with the startup page. | Known pre-existing behavior; P0 records it, P4a replaces it (section 4, Live data, First-sweep startup row). |
| Health endpoints | `server.mjs:85` `/api/healthz` (public, Dockerfile `HEALTHCHECK`); :91 `/api/status` (public freshness probe, 503 when stale); :292 `/api/health` (behind the auth gate; returns `lastSweep`, `sweepStartedAt`, `authEnabled`, `byokEnabled`, `language`). The dashboard's 60-second sweep poll, the startup page ETA and the SSE-error expiry check all use the gated `/api/health`; its 401 is the dashboard's passive session-expiry signal. | Keep the two public probes public. The React transport keeps polling the gated `/api/health` and keeps treating its 401 as session expiry. |
| Navigation | The dashboard, digest and media pages each ship a `<script type="speculationrules">` block that prerenders the other `.mainnav a` targets on hover (eagerness moderate) and opt into `@view-transition { navigation: auto }` for a cross-document crossfade (commit `147657b`). | Keep both on those three React entries; keep the `.mainnav a` selector stable or move the rules into a shared head fragment. Section 3 rule 4 covers prerendering. |
| Localization | Only `/` (jarvis.html, and only once `currentData` exists) receives `window.__CRUCIX_LOCALE__`. Digest, media, startup, login and the public site are hard-coded English; the digest route injects only `__HAS_TAVILY__`. Language is chosen per process from `CRUCIX_LANG`/`LANGUAGE`/`LANG`, not per user, and every page declares `<html lang="en">`. The dashboard's `t()` covers the `boot.*`, `layers.*`, `panels.*`, `metrics.*`, `delta.*`, `ideas.*`, `nuclear.*`, `space.*` and `dashboard.*` namespaces, not every string; P0 enumerates the exact keys by grepping `t(` in `jarvis.html`. | Keep exactly this scope for parity: dashboard only, server-selected language, English literals elsewhere, `lang="en"` unchanged. Port the enumerated `t()` keys and test French only on those keys and only on the dashboard. Expanding localization is separate work. |
| Cross-surface handoff | The reader's key CTA (`reader.js:96`) calls the host page's `openSettings` global. On the digest that global navigates to the dashboard with `location.href = '/?settings=1'` (`digest.html:109`; the nav pill at :117 uses the same function); on the dashboard it opens the BYOK overlay in place (`jarvis.html:904`). `jarvis.html:2980` opens the overlay from the `settings=1` query only after `/api/me` resolves. The digest has no settings UI of its own and renders the CTA only when `/api/me` succeeded. | The reader's contract is "call the host's settings callback"; the digest's callback is document navigation to `/?settings=1`, which must work under every `UI_*` flag combination. In auth-off mode the CTA is not rendered. |
| Data boundary | `dashboard/inject.mjs:406`, :739; `server.mjs:286`. | The browser consumes synthesized `/api/data`, not raw `runs/latest.json`. Keep synthesis server-side. Test fixtures therefore come in two shapes: raw sweep output (what the server reads from `RUNS_DIR` and passes through `synthesize()`) and the synthesized `/api/data` envelope the browser sees. A synthesized payload dropped into `RUNS_DIR` throws inside `synthesize()`, is swallowed by the catch at `server.mjs:859`, and leaves the server in the no-data state. |
| Standalone export | `dashboard/inject.mjs:814` onwards; `jarvis.html:3033` onwards. CLI writes embedded `D`; browser supports `file:` mode. `cliInject` (`inject.mjs:815`; provider call at :827) calls the configured operator LLM provider to generate ideas before embedding the data and falls back to rule-based ideas only when no provider is configured or the call fails, so `npm run inject` spends the operator budget today and the exported file embeds that output. | Preserve standalone export and `--html`/`--no-open` compatibility before deleting legacy templates. P8 decides the LLM behavior of the export explicitly. |
| Delivery | `package.json` (zero devDependencies), `Dockerfile` (single stage), `.github/workflows/ci.yml` (`node --check` plus `npm test`, pull requests only), `.github/workflows/deploy.yml` (manual, `main` only, `production` environment approval, values from GitHub `vars`), `.github/workflows/docker-publish.yml`, `deploy/cloudrun.sh` (:29 regenerates `deploy/env.yaml` on every run; :136 deploys with `--env-vars-file`; :49 attaches the `LLM_API_KEY` secret whenever it exists in the project; :148 and :168 repoint the fixed-name scheduler jobs `crucix-sweep` and `crucix-digest` at the deployed service), `firebase.json`. | Add an actual frontend build and browser gates to both source deployment and container delivery. P1 wires flags and the staging service through the script and workflow (details there). |
| Documentation | `README.md` ("Minimal dependencies", "Self-contained dashboard", architecture tree rooted at `jarvis.html`, `npm run inject`, "Node.js 22+"); `CONTRIBUTING.md` (issue-first rule, zero-extra-dependency principle, Node 22+); `docs/CLOUD_RUN.md`. | Each phase that changes a documented command, dependency, path or principle updates these files in the same PR. |

Line numbers describe the inspected commit and will move. Existing tests use Node's test runner and cover backend/auth/provider behavior; no frontend build or browser test gate exists today. This plan is based on source inspection, not a claimed passing runtime baseline.

## 3. Target architecture

Use React + React DOM, Vite, and TypeScript for new frontend code. Use one root package manifest and lockfile. Keep the existing Node test runner; add Vitest, React Testing Library with a DOM environment, and Playwright for frontend behavior and browser tests. Record and pin mutually compatible package versions in the lockfile at implementation time.

Current Vite documentation requires Node 20.19+ or 22.12+; the repository only specifies Node >=22. Raise and consistently enforce the selected Node 22 minimum in package engines, local instructions, CI, and container stages. Verify the chosen package versions rather than assuming any Node 22 release works.

### Dependency rationale

This table is the record `CONTRIBUTING.md` asks for. Keep it current as packages are added.

| Package | Scope | Why |
| --- | --- | --- |
| `react`, `react-dom` | production | UI runtime; production because P7 renders public pages on the server inside the runtime image. |
| `vite`, `@vitejs/plugin-react`, `typescript` | development | Build, manifest emission, type checking. Not installed in the runtime stage. |
| `vitest`, `@testing-library/react`, `jsdom` or `happy-dom` | development | Component and contract tests under `test/ui`. |
| `@playwright/test` | development | Browser baseline and parity tests under `test/e2e`; the P0 baseline needs it before any application dependency. |

MapLibre GL JS, GSAP, satellite.js and HLS.js move from CDN tags to pinned lockfile versions matching the ones currently loaded. The Firebase compat SDK stays on its current loading mechanism until the separate SDK change.

### Test runner boundaries

Three runners coexist and must never collect each other's files. `npm test` stays `node --test` over `test/*.test.mjs` with the integration files excluded by the existing filename filter; it is non-recursive. Vitest's `include` is limited to `test/ui/**/*.test.{ts,tsx}` with `test/*.test.mjs` and `test/e2e/**` excluded, because its default pattern would collect every existing `node:test` file, including the `*-integration.test.mjs` files that call paid providers whenever `LLM_API_KEY`, `MINIMAX_API_KEY` or a Mistral key is present. Playwright's `testDir` is `test/e2e`. Integration tests remain opt-in by environment and are never collected by `test:ui` or `test:e2e`.

### Environments

No staging environment exists today; the repository has one Cloud Run service, one Firebase project and production-named scheduler jobs. Every real-browser gate, the rollback rehearsal and the P9 observation below depend on staging, so P1 creates it before any surface is migrated:

- A second Cloud Run service `crucix-staging` in the same project, deployed by `deploy/cloudrun.sh` with `SERVICE`, `PUBLIC_URL` and its own `BUCKET` (the script hard-codes `RUNS_DIR` as the mount path; the bucket is the `BUCKET` variable). Parametrize the scheduler job names in the script (`crucix-sweep`, `crucix-digest` today) so a staging deploy never repoints production sweeps; add staging jobs or run sweeps manually there.
- `deploy.yml` gains a `target` input (`production`, the default, or `staging`). The staging target uses a `staging` GitHub environment with its own `vars` and no reviewer approval; the production target keeps the existing approval. Every gate below that says a flag is flipped or rehearsed "through `deploy.yml`" means the staging target unless it says production.
- A second Firebase Hosting site or target rewriting to the staging service, so Hosting-proxied behavior (cookie forwarding, the 204 SSE path, the Hosting 404 page) is exercised, with the staging host added to the Firebase Auth authorized domains for real OAuth checks.
- Staging uses `AUTH_MODE` on with test accounts and the same image or source build as production. The script attaches the project's `LLM_API_KEY` secret automatically when it exists, so staging would inherit the production operator key; give the script a `LLM_SECRET` name override and point staging at an empty or capped key unless a gate needs the real one. Record its URL, service name and deploy command in `docs/CLOUD_RUN.md`.

Where a gate below says "staging", it means this environment. A documented environment limitation does not satisfy a staging gate.

### Directory layout

Recommended organization; create directories as their first feature needs them:

```text
dashboard/react/
  entries/                  dashboard, digest, media, login browser entry points
  app/                      providers, bootstrap, typed route selection
  api/                      same-origin client, response types, transport lifecycle
  state/                    sweep snapshots, session and URL state
  features/
    dashboard/              layout, panels, ticker, startup display
    map/                    MapView, map controller, marker/geometry selectors
    reader/                 shared article dialog, markdown, research state
    digest/                 filters, list, ratings
    media/                  channel data and player controls
    auth/                   Firebase adapter and login form
    settings/               BYOK form and personal ideas
  shared/                   small primitives, safe links, theme, translation
  styles/                   existing tokens and styles, scoped by surface
  site/                     React public-page components and server render entry
  standalone/               snapshot-only browser entry and export template
dashboard/server/ui.mjs      explicit route registration and manifest rendering
dashboard/dist/             generated browser assets, manifest and site renderer
test/ui/                    component/contract tests and synthetic fixtures
test/e2e/                   browser tests and image baselines
```

`dist` is build output and ignored by Git. Never write builds into the existing legacy public directory. No frontend import may transitively load server configuration, Firebase Admin, filesystem modules, provider clients, or secrets. Expose only an explicit public configuration allowlist.

Use multiple browser entries with page-specific lazy chunks. Express continues selecting the correct page for the existing URL. Preserve ordinary cross-page links during migration. A small tested History API adapter owns in-page filters/dialogs; adding a routing framework or global state library is unnecessary for the current route surface. Local component state, reducers, and narrowly scoped providers are sufficient initially.

Serve public pages from React components rendered to HTML on the server through a separately built server entry. They need no client bundle or hydration. Render once at process start from `config.site`, as the current templates do, and serve the cached strings with the existing public cache header. Continue supplying `config.site` values, document titles, descriptions, legal dates, and aliases. This avoids introducing a new SSR framework or making legal pages depend on JavaScript.

### State and ownership rules

1. Keep the shared sweep snapshot immutable. Store profile/personal ideas separately and derive the displayed ideas. A shared update must not erase personal ideas; removing the user key must reveal current shared ideas immediately.
2. URL state owns shareable views. Local storage owns existing durable preferences; session storage owns existing dismissals/redirect markers. Keep current key names throughout this migration.
3. MapLibre owns its canvas, sources, layers, and markers inside one ref-owned container. React owns surrounding controls and dialogs. Updates change map data, not the map instance.
4. Every effect has corresponding cleanup: abort fetches, close streams, clear intervals/timeouts, detach listeners, destroy players/markers/map instances, release observers and restore scroll locks. Verify React development Strict Mode mount/cleanup/remount behavior. Transports, timers, player loading and paid or auth-sensitive fetches start only when `document.prerendering` is false and resume on `prerenderingchange`, because speculation-rules prerendering runs page scripts while invisible.
5. No mutation or network call during render. No automatic replay of POST requests that can spend an LLM budget. Disable duplicate submissions and make request ownership explicit.
6. Preserve existing CSS and assets initially. Scope page styles to prevent collisions between dashboard, reader, digest, media and login; defer visual cleanup and dependency upgrades.

## 4. Contracts that must survive

### Routes and delivery

| Route family | Required result |
| --- | --- |
| `/` | Auth policy preserved; startup state when no data exists; dashboard when it does. A data 503 is a recoverable startup state, not a reload loop (a change from today; see Live data, First-sweep startup). |
| `/digest`, `/digest/:id`, `/digest?open=:id` | Existing article deep links and list filters continue working, including legacy query normalization. |
| `/media`, `/media/:id?grid=1` | Channel and grid selection restore on refresh and Back/Forward. |
| `/login?next=...&reason=...` | Same-origin validated return destination retains original path and query; expired-session behavior remains understandable. The current check is an open redirect (P6 states the required validation); it is a documented defect, not a contract to preserve. |
| `/mfb-think-tank`, `/support`, `/privacy`, `/privacy-policy`, `/terms`, `/terms-of-service` | Public, readable without JS, correct metadata and runtime configuration. Fragment anchors (`#delete-account`, `#no-advice`, `#faq`, TOC ids) keep their ids; `mailto:` subject encoding, `<details open>` blocks and the print stylesheet are preserved. |
| `/api/*`, `/events`, `/__/auth/*`, `/__/firebase/init.json` | Preserve status codes, content types, authentication and helper behavior. Never return the React shell for these paths. |
| Assets and old `.html` entry URLs | Inventory direct uses of `/jarvis.html`, `/loading.html`, `/digest.html`, `/media.html`; explicitly preserve working aliases or canonical redirects with queries retained. Missing JS/CSS files remain errors, never HTML. |

Public health probes stay public. Protected pages and API handlers stay behind the server gate; a client route guard is not an auth boundary. Internal sweep/digest routes retain their shared-secret checks. Static frontend code may be served publicly so login assets work, but contains no user or private bootstrap data. Keep brand assets public.

### API and session behavior

- Keep the `__session` cookie name, `HttpOnly`, `SameSite=Lax`, HTTPS `Secure`, session exchange and revocation. Firebase Hosting forwards this cookie; an unrelated UI-selection cookie cannot be relied upon there.
- Preserve email/password sign-in/signup, signup policy, reset password, Google popup and redirect fallback, redirect completion, allowed identities and verified-email enforcement. Keep `/__/auth` and hostname-specific Firebase config handling. Initially wrap the existing Firebase compat SDK version; switching SDK API/version is a separate change.
- `/api/me` is absent (404) with auth disabled. Treat that as local/no-account mode, not logout failure. Handle 401, verified-email 403, startup 503, rate-limit 429, 402 (map brief with no user key and no operator key) and 400 (`No LLM configured` / `No LLM key configured` from summarize, research, key test and ideas) distinctly. `/api/map/region` in brief mode returns its 429 and 402 as `{ ...places/articles base payload, error, budget: 'shared' | 'none' }`, so the client renders the articles stage and the budget message together; `budget` drives the add-your-own-key CTA. Do not assume every error has the same shape; mobile auth uses `{ error: { code, message } }`.
- Preserve `/api/me/llm` PUT/DELETE, key test, `/api/ideas`, provider choices, auto-ideas preference and delayed personal refresh after sweeps. API-key drafts stay only in form memory and clear after save/removal; never serialize them into history, storage, logs or boot data.
- Keep map region request payloads and article/brief mode sequencing, citations, cost/budget feedback and fallback states. Closing/changing a selection cancels obsolete UI work; late responses cannot replace the current selection.
- Preserve digest list/ranking/filter/rating and article open, summarize and research contracts, including 202 running state, polling, resume-after-close and completion/errors. Do not create new automatic paid work.
- Keep mobile auth, account deletion, feedback/admin and other backend endpoints intact even when they have no corresponding web UI. The React plan does not add new interfaces for them.

### Live data

Create one lifecycle-managed transport per mounted app, not one per panel. Preserve these starting cadences and hosting rules; optimize separately after measurements:

| Work | Existing cadence/behavior |
| --- | --- |
| Sweep fallback | Poll the gated `/api/health` every 60 seconds; fetch `/api/data` when a newer sweep is available. A 401 from this poll is the session-expiry signal; the public `/api/healthz` and `/api/status` are not substitutes. |
| SSE | Dashboard enables only localhost/127.0.0.1 or `*.run.app`; server returns 204 for Hosting proxy requests. Keep fallback polling on all hosts. |
| First-sweep startup | Existing: unconditional `EventSource('/events')` plus `location.reload()` 3 seconds after any stream error (a reload loop behind Hosting), and a 5-second `/api/data` poll. Target: the same 5-second poll, the dashboard's SSE host gate, no reload on stream error. P0 records the existing loop as a documented pre-existing failure; P4a ships the target. This is the one deliberate behavior change in this table. |
| Tracks / alerts | 15 seconds / 45 seconds. |
| AIS ships / earthquakes | 60 seconds each. |
| Satellite positions | 5 seconds while the relevant map is mounted. |
| Research progress | 2.5 seconds while active; stop on close/unmount and resume on reopen. |
| Personal auto ideas | Refresh approximately 90 seconds after a new sweep when enabled. |

SSE supports `connected`, `sweep_start`, `update`, and `sweep_error`. Preserve reconnect behavior and session-expiry handling without opening streams on Firebase Hosting. Initial fetch, polling and stream responses must not let an older snapshot overwrite a newer one. Deduplicate simultaneous refreshes and cancel or ignore responses from obsolete requests. Do not invent a new event protocol during the UI migration.

Retain browser-direct USGS earthquake and Polymarket requests unless a separate change justifies moving them server-side. Test their CORS, timeout and failure states. Mock them in deterministic tests.

### History, preferences and interaction

Dashboard query keys: `region`, `hide`, `time`, `pin`, `shape`, `info`, `guide`, `settings`, `read`. Digest: article path/legacy `open`, `filter`, `topic`, `q`. Media: channel path and `grid`. Preserve defaults, encoding and canonicalization, circle/rectangle/polygon geometry encoding, malformed-input handling, and URL-over-stored-default precedence.

Opening a reader/dialog pushes history; filter adjustments replace where current behavior does. Close calls Back only for an entry owned by that dialog; closing a direct deep link replaces the URL instead of navigating off-site. Back/Forward must not recursively push new entries. Hydrate map-dependent state only when the map and data are ready, with a bounded readiness mechanism.

Preserve the prerender and view-transition behavior (section 2, Navigation row) and the settings handoff (section 2, Cross-surface handoff row). Localization keeps the scope in section 2's Localization row.

Preserve dark/light theme before first paint, region preferences, BYOK prompt/banner dismissals and Google redirect markers. Audit apparent performance/markets preferences for active callers before carrying over dead controls. Local/session storage denial must not prevent boot.

Preserve keyboard shortcuts, input-field exclusions, escape behavior, touch drawing, resize/orientation, visibility restoration, `pageshow`/back-forward cache recovery, attribution, and existing map/panel responsive layouts. Verify widths around the current 1100px layout boundary and 640px map-label boundary. React dialogs need focus trapping and restoration, accessible names and keyboard operation; loading/error states need appropriate status announcements. Keep these checks in the migrated component's acceptance tests.

## 5. Execution sequence and merge gates

Each numbered unit is a reviewable PR; split panel groups further when needed. A PR contains one migration slice, its required tests and documentation. Keep the working legacy path in every migration release until the final retirement gate.

### P0 — Capture behavior and establish evidence

**Files:** `package.json`, lockfile (browser test dependencies only), `.github/workflows/ci.yml` (a browser job), `playwright.config.ts`, new fixtures and tests under `test/fixtures` and `test/e2e`; a narrow server factory seam in `server.mjs` only if needed. `test/ui` starts in P2 with Vitest.

Inventory all visible controls, panels, empty/error states, paths, active library use and external requests. Build the parity checklist from the running legacy UI, including right-rail feeds and below-the-fold panels. Record the startup reload loop and the open `next` redirect from section 2 as documented baseline defects, and the export's operator-key LLM call as a documented baseline behavior that P8 changes, so later gates do not treat any of them as regressions.

Define two fixture families and keep them provably equal: `test/fixtures/runs/*.json` in raw sweep format, fed to the real server and the container smoke through `RUNS_DIR`, and the derived `/api/data` payloads produced from them by calling `synthesize()` in a fixture-build script, used by the browser harness. Add a test that regenerating the synthesized fixtures from the raw ones produces no diff. Cover empty, partial, stale and hostile-content variants, personal vs shared ideas and running research. `synthesize()` calls `fetchAllNews()` as a same-module binding, so it cannot be stubbed from outside; add a narrow injectable news-fetcher seam to `inject.mjs` in this PR, and give every raw fixture a stored `news` array (the empty variant excepted) because `synthesize()` reuses stored news only when the fetch returns nothing. `synthesize()` is also not deterministic: it stamps GDELT items with the current time, applies 30-day and 24-hour cutoffs from `Date.now()`, and `loadOpenSkyFallback` reads the repository's `runs/` directory rather than `RUNS_DIR` when a fixture has no OpenSky hotspots. The fixture-build script therefore runs under a frozen clock with a controlled `runs/` directory, and the no-diff test compares with generated timestamp fields masked. The container smoke sets `RUNS_DIR` to the temporary fixture directory with `AUTH_MODE=off` and `SWEEP_MODE=external`. Do not commit real user profiles, keys or private articles.

The unmodified legacy page loads MapLibre, GSAP and satellite.js from unpkg/cdnjs, fonts from Google, basemap styles and tiles from cartocdn, and USGS and Polymarket directly from the browser, and has no injection seam. The baseline is deterministic only through Playwright request routing: vendor pinned copies of the three CDN libraries and a small tile/sprite/glyph set under `test/fixtures`, route the CDN, font, tile, USGS and Polymarket hosts to them, and fail any test that makes an unrouted third-party request. This routing is the mechanism behind "mock them in deterministic tests" and "deterministic local map inputs" throughout this plan.

Build a loopback fixture server with deterministic endpoints/streams and fake clock support. Reuse production route registration/auth middleware with injected dependencies for route tests; keep collectors, sweeps, Firestore and LLM calls out of ordinary tests. If a narrow server factory is necessary, isolate it in this PR with characterization coverage; do not split up the whole backend. P0 owns the browser test toolchain: Playwright, its config, the `test:e2e` script and the CI browser job, because its gate cannot pass without them. P1 adds the application build dependencies. Both remain in the single root lockfile.

**Gate:** existing Node tests have recorded results; critical legacy browser flows pass or have documented pre-existing failures; screenshots and performance measurements have reproducible fixture/browser/viewport definitions. The same behavioral scenarios must be reusable against React. No migration phase proceeds with an unexplained baseline failure.

### P1 — Prove build, delivery and reversibility before migrating features

**Files:** `package.json`, lockfile, Vite/TS/Vitest configs, new browser/server entry placeholders, `dashboard/server/ui.mjs`, `server.mjs`, `Dockerfile`, ignore files, CI workflows, `deploy/cloudrun.sh`, `.github/workflows/deploy.yml`, `README.md`, `CONTRIBUTING.md`, `docs/CLOUD_RUN.md`.

Add the toolchain and a minimal page. Integrate Vite through its manifest: resolve entry scripts, imported CSS and asset URLs correctly. Development uses Express as the browser origin with a development-only Vite middleware/adapter for assets and HMR; keep Firebase helper requests and APIs on Express. Vite in middleware mode has no listener of its own and is reachable wherever Express listens, and Express currently binds every interface, so when the dev adapter is enabled Express itself listens on `127.0.0.1` unless `HOST` is set explicitly. Scope what the middleware may serve: Vite `root` is `dashboard/react` (not the repository root), `build.outDir` is `../dist`, `server.fs.strict` is on, `server.fs.allow` is limited to `dashboard/react` and `node_modules`, `server.fs.deny` additionally lists `.env*`, `deploy/**`, `runs/**` and `**/*.mjs` outside the allowed roots, and the adapter is never mounted when `NODE_ENV` is `production`. Add a P1 test that requests `server.mjs`, `deploy/env.yaml` and `/@fs/` paths through the dev adapter and gets 403 or 404. Production serves compiled output only.

Add server-controlled per-surface flags `UI_DASHBOARD`, `UI_DIGEST`, `UI_MEDIA`, `UI_LOGIN`, `UI_SITE`, each `legacy|react`, defaulting to legacy initially. Root's loading screen follows the dashboard flag. Selection never changes the public URL; environment settings travel with the Cloud Run revision. The GitHub environment `vars` (one set per `deploy.yml` target) are the single source of truth for flag values. `deploy/cloudrun.sh` emits every `UI_*` variable into the generated `deploy/env.yaml` from those vars with `legacy` as the default, because the script regenerates that file on every deploy and `--env-vars-file` replaces the service's whole environment, so anything set by hand with `gcloud run services update` or in the gitignored `deploy/extra-env.yaml` is lost on the next deploy. Add a `flags-only` job to `deploy.yml` (same targets, same approvals) that runs `gcloud run services update --update-env-vars` from the current vars without a build, so a flag flip takes seconds and leaves an audit trail; the operator changes the var first, then runs the job, so the next full deploy agrees with it. Tests and staging select each branch without enabling an unprotected production preview route.

Use a multi-stage container: build with development dependencies, then copy compiled browser/server artifacts into a runtime stage installed with production dependencies. React/React DOM remain production dependencies for public server rendering. Test `.dockerignore`/`.gcloudignore`, Docker publishing and Cloud Run source builds. Fail startup clearly if a React-enabled entry or manifest is missing; legacy-only mode must still boot without a frontend build.

Serve `/assets/<content-hash>.*` with immutable caching, public site documents with their existing public policy, authenticated HTML with private revalidation and API responses with private/no-store. Test middleware order: the current generic cache header must not override hashed-asset caching. Serve assets with correct MIME types, deep absolute URLs and real 404s. Initially lazy-load on page mount only; for future navigation to a new entry use ordinary document navigation.

Exercise deployment skew: an old open page can need a lazy chunk after an update. Retain prior release assets for the support window, or prove a one-time reload recovery that preserves URL/view state and never replays a mutation. Keep entry HTML revalidated and test this scenario rather than assuming hashes solve asset availability.

**Required spikes now:** actual MapLibre bundle/worker/CSS in the browser build; public React server rendering in the runtime image; a single-file React snapshot loaded via `file:`. These resolve packaging risks before substantial UI conversion.

**Gate:** clean checkout `npm ci` → typecheck/tests/build succeeds; built image serves legacy and React placeholder selections; login assets load signed out; protected routes remain protected; missing assets/API paths never return HTML; flag reversal is demonstrated with the `deploy.yml` staging target and `flags-only` job, and the staging environment from section 3 exists and serves the same build; the dev adapter cannot serve files outside `dashboard/react`; `test:ui` and `npm test` each report only their own files. `README.md` and `CONTRIBUTING.md` no longer promise zero extra dependencies or a self-contained HTML dashboard, and their architecture tree, commands and Node floor match the branch. The offline spike has a documented supported packaging result.

### P2 — Establish shared behavior and safe boundaries

**Files:** `dashboard/react/api`, `state`, `shared`, `styles`, and focused tests.

Implement response types plus runtime guards for required envelope fields; tolerate optional/missing source fields and additions. Port pure URL/geometry/format/filter selectors with characterization tests. Extract CSS tokens and page wrappers without restyling. Implement the API client, immutable sweep/profile selectors, theme/locale adapters, lifecycle-managed transport and history ownership behavior.

Bootstrap only allowlisted public data such as locale content, capabilities and login configuration through escaped non-executable JSON. Escape `<` in serialized data and test script terminators; never serialize `config`, credentials or complete user records. `/api/locales` lists locale availability rather than returning the translation dictionary; preserve server injection of the selected dictionary. Test both English and French fallback/interpolation behavior.

Keep raw HTML out of React rendering. Port the existing small supported markdown subset to React nodes with safe URL handling; richer markdown is a separate feature. Apply the same HTTP(S) allowlist to rich text, source/citation links, map popups and original-article links.

**Gate:** URL round trips/history, storage denial, hostile URLs/content, timestamp ordering, 401/403/404/429/503, stream/poll overlap and effect cleanup tests pass. Strict Mode does not duplicate subscriptions or paid requests. Client output contains no server-only imports or secret values.

### P3 — Pilot a complete surface: reader and digest

**Files:** new `features/reader`, `features/digest`, digest entry; `server.mjs` digest selection; existing reader scripts retained for legacy pages.

Implement the reusable React reader with ratings, safe markdown, original link, write-up, research progress/results and key CTA. Pass explicit API/session/settings callbacks instead of reading host globals. Prevent article A's late fetch or poll from overwriting article B after rapid navigation. Then migrate digest list, topic/filter/search, personalization status and reader route state.

The legacy dashboard keeps its existing reader until its own migration. Shared new React code serves both React pages once available; no two renderers own the same modal or subtree. The React digest and reader settings callback performs ordinary document navigation to `/?settings=1`, the same contract the legacy digest uses, so the handoff works whether the dashboard is legacy or React; in auth-off mode the CTA is hidden as it is today.

**Gate:** the digest passes the legacy parity suite, direct links and Back/Forward, rapid switching/close/reopen, rating synchronization, network errors and running research recovery. Tests use fake providers and verify no repeated summarize/research POST on rerender. A browser test follows the key CTA from the React digest to the legacy dashboard and sees the settings overlay open; P4a repeats it against the React dashboard. Deploy this first reversible React feature before taking on the dashboard.

### P4a — Dashboard shell, panels and settings

**Files:** dashboard entry, `features/dashboard`, `features/settings`, shared reader integration, dashboard route selection.

Port the existing layout, startup display, top bar, region controls, source/sensor summaries, signal guide, ticker/news, ideas, markets/macro/risk and remaining feed panels in small groups. Use the P0 inventory as the complete list; every old control needs a mapped component/test. Preserve units, thresholds, timestamps, source/fallback labeling and zero-vs-missing distinctions. The React startup state implements the target row for First-sweep startup in section 4.

`jarvis.html` is the most actively edited file in the repository (dozens of commits in the weeks before inspection, several adding panels and map layers), and the React dashboard cannot ship until P4b passes. During the P4a and P4b window: legacy dashboard changes are limited to security and outage fixes plus changes that also land their React twin in the same PR; every legacy change adds or updates its P0 inventory row; and the P0 capture is re-run against the current legacy build before the P4b gate and again before P9, so the parity comparison is against what production actually serves.

Implement settings and BYOK lifecycle, profile-aware navigation and personal ideas selectors. Scope high-frequency feed state so it does not rerender every panel. Preserve boot animation once per boot and reduced-motion support. Keep the React dashboard internal/staging-only until the map in P4b passes; an empty map is not a shippable dashboard replacement.

**Gate:** panel text/count/value/empty-state parity across all fixtures, theme, responsive screenshots and settings lifecycle pass; the French check covers exactly the `t()` namespaces listed in section 2 and no other surface. Sweep updates retain the user's current filters, dialogs and personal ideas. The startup state behind a Hosting-style proxy (SSE 204) shows no reload and reaches the dashboard by polling. The inventory diff between the P0 capture and the current legacy build is empty or every new row has a React owner.

### P4b — Map, selection and regional briefs

**Files:** `features/map`, dashboard/map integration; retain existing MapLibre version while migrating.

Extract deterministic marker/GeoJSON/geometry selectors before porting map effects. Implement the map controller: one instance per mount, sources/layers installed on load and restored after basemap style changes, data updated through source APIs, HTML labels/markers disposed, resize and restore events handled.

Port all 17 layer toggles/counts/search, time windows, map search/region flight, basemaps/theme, labels/aggregates, pins/popups, new-marker indication, orbital ground tracks, live tracks/ships and attribution. Port circle/rectangle/polygon drawing, cancel/reset, selection list/focus, shape links, area article/brief stages and citation interactions. Keep the same calculations; correctness fixes get their own characterized change.

**Gate:** all layers are exercised against fixed data, source counts and selected items match legacy, style switching retains overlays, gestures/keyboard work, and shared shape/pin links restore. Repeated data updates preserve camera and map identity. WebGL failure stays contained so the rest of the dashboard remains usable. A real-browser test verifies worker loading, actual canvas rendering and resize; mocks alone cannot satisfy this gate.

### P5 — Media

**Files:** media entry and `features/media`; media route selection.

Preserve channel list/data, native HLS/HLS.js selection, stream loading/error/retry, broadcaster/YouTube fallback, mute/volume, grid, fullscreen, picture-in-picture and shortcuts. Destroy HLS instances and detach video listeners/iframes on every channel/grid transition and unmount. Keep this entry separate so dashboard users do not download media code.

**Gate:** deterministic controlled stream tests cover switching, error/retry and history; real staging checks cover native Safari HLS, autoplay restrictions, actual broadcasters and available fullscreen/PiP capabilities. Repeated grid/channel changes leave no accumulating active players.

### P6 — Login

**Files:** login entry, `features/auth`, public login bootstrap and server selection.

Wrap the existing Firebase compat SDK with an explicit adapter while replacing the form with React. Preserve the config origin logic, session exchange, sign-out of the temporary SDK session, popup/redirect fallback, reset flow, signup policy, disabled/loading states and error messages. Avoid adding a persistent Firebase client session or changing token storage policy.

Replace the `next` check. Today (`login.html:81`) a value is accepted when it starts with `/` and not `//`, so `/\evil.com` passes and `location.replace()` resolves it to `https://evil.com/` under WHATWG parsing. The React login accepts `next` only when `new URL(n, location.origin).origin === location.origin` and `n` does not begin with `/` followed by `/` or `\`; otherwise it returns to `/`.

**Gate:** deterministic SDK-adapter tests cover success/cancel/failure and hostile `next` destinations, specifically `/\evil.com`, `//evil.com`, `https://evil.com`, `javascript:` and a protocol-relative value with a backslash, all of which must land on `/`, while `/digest/abc?x=1` and `/%5Cevil.com` (same origin after parsing) keep working. Real staging login/logout and popup plus redirect flows pass on the production-style host, including a mobile browser. Test expired sessions returning to dashboard/digest/media deep links, unverified accounts and auth-off mode. Mocked browser tests do not prove real OAuth operation.

### P7 — Public pages

**Files:** `dashboard/react/site`, server rendering entry and page selection.

Replace HTML template filling with React server-rendered layout/page components, rendered once at process start. Map each substitution class from section 2 to its React equivalent: escaped text becomes string children, `APP_NAME_URL` becomes `encodeURIComponent` inside the `mailto:` href, and the raw-HTML fragments (`STORE_LINKS` with its store buttons or the coming-soon fallback, `POSTAL_ADDRESS_LINE` with its leading line break, the `META` legal-date block) become JSX fragments built from `config.site`, so the P2 rule of no raw HTML in React rendering holds unchanged. Keep every fragment anchor id, `<details open>` block, the print stylesheet, legal copy, links, dates and operator/contact settings verbatim except approved independent corrections. Keep public route registration before auth and preserve caching, metadata and page aliases.

**Gate:** signed-out HTTP tests and JavaScript-disabled browser checks verify all pages, aliases, effective date, every substitution class with both store links present and absent, every anchor id, the `mailto:` subject, and titles/descriptions; a text-level diff of each rendered page against the legacy output is empty apart from listed approved corrections. No public page downloads map, media, auth or dashboard code.

### P8 — Finish standalone export compatibility

**Files:** `dashboard/react/standalone`, export build script, narrow changes in `dashboard/inject.mjs`, dedicated export template/tests.

Use the same DashboardApp and selectors with an injected snapshot transport. Build one IIFE with inline CSS and embedded escaped data; avoid ESM file fetches, external chunks and server-origin asset paths. Bundle/map the MapLibre worker so `file:` execution works. Preserve existing network-backed tiles/fonts and optional external feeds; describe this as a standalone snapshot, not guaranteed offline maps.

Keep `synthesize`, `generateIdeas` and their current server imports stable. Stop rewriting application source as the default export path only when a compatible generated output is available. Preserve `--no-open`. For `--html`, recognize existing legacy `let D` templates and continue the existing substitution through a small compatibility path; support the new React export template explicitly and reject unrecognized templates clearly without overwriting them. Preserve the current default command's useful result, apart from the LLM ideas moving behind `--llm` as described below, and document any changed output location or default.

API-only account/AI actions must have explicit snapshot behavior; opening a snapshot must not call paid endpoints. Exporting is a separate decision because `cliInject` spends the operator LLM key today (section 2, Standalone export row): keep that behavior behind an explicit `--llm` opt-in, default off, so a fixture export in CI never contacts a provider, and document that the default export embeds rule-based ideas while `--llm` embeds paid output the operator is choosing to distribute. Capture existing file-mode behaviors in P0 before deciding which external live feeds remain enabled. Keep the legacy export template until legacy `--html` compatibility has a tested, documented support policy.

**Gate:** fixture export succeeds with both new and legacy templates, escaped hostile data and `--no-open`, with no provider credentials present and no outbound provider request; open the actual artifact with `file:` in Chromium and Firefox; verify dashboard controls/map packaging and no unresolved local asset/chunk requests. Server synthesis tests still pass. Failure blocks retiring the dashboard legacy path, not unrelated surface migrations.

### P9 — Default cutover, observation and retirement

Enable each surface in staging, then production using the existing manual production deployment workflow. Keep a known-good revision and the previous UI branch in the release during the migration. Do not combine the final default switch with unrelated dependency, branding or data-contract changes.

Observe at least 48 hours and two successful scheduled sweeps, whichever takes longer, including cold start, expired-session return, proxied polling and active research. Compare browser errors, asset failures, request volume, rendering performance and backend status with the recorded baseline. Use existing logs and test traces; adding a paid monitoring service is unnecessary.

After all surface gates and the observation period pass, remove legacy web renderers, globals, inline handlers and unused CDN tags. Retain only explicitly supported legacy export compatibility. Remove the temporary UI flags in a separate cleanup release after the rollback window; retain previous deployable images/revisions and supported static assets for at least seven days after cutover. Record the actual retirement date and artifact policy.

**Gate:** every item in the P0 parity inventory is passed, intentionally retained as export compatibility, or explicitly resolved; no unexplained missing behaviors. Clean-clone and container validation pass on the final default configuration; rollback has been practiced.

## 6. Verification and acceptance

Proposed commands; `test:e2e` and the fixture-server runner arrive in P0, the rest in P1/P2. None exist today:

```sh
npm ci
npm test
npm run typecheck
npm run test:ui
npm run build
npm run test:e2e
npm run build:standalone
docker build -t crucix-react:verify .
```

Keep the current Node syntax gate and integration-test separation, enforced by the runner boundaries in section 3 rather than only by the `npm test` shell filter. The browser harness must start a production build against a loopback fixture server without real credentials, upstream collectors, spending or production writes. Add a container smoke script that boots with auth off/external sweeps and a temporary fixture data directory, then verifies health, pages, manifest assets and deep links; separately run auth-gate tests with fake verifiers. Do not bake test bypasses into production auth.

| Layer | Mandatory scenarios |
| --- | --- |
| Contracts/selectors | Synthesized payloads; missing optional sources; zeros/nulls; shared/personal ideas; old/new update ordering; URL parse/build/normalization; shape geometry; English/French fallback; safe URLs and markdown. |
| Components/lifecycle | Startup→ready, stale/error→recovery; settings/key removal; reader races; empty lists; pending/rejected mutations; Strict Mode setup/cleanup; storage denial; modal focus/escape/scroll restoration. |
| HTTP/security | Public vs protected routes; JSON 401 vs document redirect; 403; cookie attributes; login return destinations; status/error shapes; MIME/cache headers; missing asset/API 404 behavior; public bootstrap escaping. |
| Browser parity | Dashboard map/layers/drawing/pins, ticker→reader, digest filters/ratings/research, BYOK, media controls, login redirects, refresh and complete Back/Forward sequences. |
| Responsive/visual | Desktop 1440px, mobile 390px, and both sides of 640px/1100px boundaries; light/dark; English/French (dashboard only); keyboard and touch; orientation and visibility restoration. Freeze clock/animations for screenshots. |
| Delivery | Clean lockfile install; production bundle; runtime-only container; no-dev-dependencies boot; manifest/CSS/worker paths; signed-out login assets; Cloud Run source deploy; Firebase Hosting; old page after new release; rollback. |

For browser checks, use Chromium throughout CI and Firefox/WebKit smoke tests for core navigation/reader/media. Validate actual WebGL/map workers with deterministic local map inputs in CI where supported, and actual basemaps/OAuth/HLS on staging. A documented environment limitation does not count as a passing browser check; complete the corresponding staging evidence before cutover.

Record baseline initial JS transfer, dashboard usable time, map-ready time, update cost, request rate and active timers/connections against fixed fixtures and hardware. Proposed regression budget: no more than 10% worsening in median usable/map-ready time or p95 update cost across repeated comparable runs; no sustained increase in request/subscription count or monotonic resource growth after 20 mount/unmount, theme, basemap and media-grid cycles. Set an explicit initial bundle cap from P0 measurements plus the minimal React runtime in P1, before feature conversion; keep map/media/login code out of unrelated page bundles. Investigate failures instead of silently increasing thresholds.

Do not require pixel-identical WebGL/OS font rendering. Compare deterministic DOM screenshots with narrow documented masks for clocks, animations and canvas, plus separate map source/interaction/canvas assertions. All other unexplained visual differences require review. Retain screenshots/traces with CI artifacts.

## 7. Rollback runbook

1. Stop enabling further surfaces when there is a login/session regression, broken deep link, blank/erroring dashboard, map/reader failure, asset-load failure loop, increased request pressure or a failed acceptance gate.
2. Set the affected `UI_*` var to `legacy` in the GitHub environment, then run the `deploy.yml` `flags-only` job (seconds, same approval, no rebuild), or route traffic to the known-good Cloud Run revision for immediate recovery and change the var afterwards. A full deploy also works but waits for a Cloud Build. Keep deployment approvals and Firebase Hosting rewrite configuration unchanged.
3. Reload the same deep links and verify login/session, `/api/data`, `/api/healthz`, `/api/status`, the gated `/api/health`, dashboard/reader and Hosting polling. Verify that no collectors, stored runs, user data or keys require reversal; this migration does not change their formats.
4. Test a page opened before rollback as well as a fresh tab. Prior release assets or the one-time chunk recovery must handle that case. Capture the failure trace and keep the failed React surface disabled until its gate passes.

Exercise this on the staging service during P1 and again before P9, recording the revision identifier, the exact `deploy.yml` input or `gcloud` command used, and measured recovery time in the release checklist. No production rollback or deployment is executed as part of creating this plan.

## 8. Completion checklist

- [ ] All user-facing surfaces use React components; public pages remain server-rendered/readable without JS.
- [ ] Every active legacy feature has an inventory row, a React owner and passing validation evidence.
- [ ] Existing browser/mobile/server contracts, session cookies and Firebase helpers remain compatible.
- [ ] Hosting polling and direct-service SSE work without duplicate connections or mutation replay.
- [ ] Map, players, reader jobs and timers clean up correctly; performance stays within agreed budgets.
- [ ] Standalone exports and recognized legacy custom templates meet their documented compatibility policy.
- [ ] New builds work from a clean clone and in the deployed production image; no secrets enter client artifacts.
- [ ] Production-style staging checks, observation period and rollback exercise are complete.
- [ ] Legacy web paths are removed only after the compatibility and rollback gates; `README.md`, `CONTRIBUTING.md` and `docs/CLOUD_RUN.md` reflect verified commands, dependencies, paths and the staging environment.

## References

The migration architecture follows React's documented gradual adoption and Vite's manifest-based backend integration. These sources support the tooling choices; repository-specific requirements above come from the inspected code.

- [React: adding React to an existing project](https://react.dev/learn/add-react-to-an-existing-project)
- [React: effects and cleanup](https://react.dev/reference/react/useEffect)
- [React: static server markup](https://react.dev/reference/react-dom/server/renderToStaticMarkup)
- [Vite: backend integration and manifest](https://vite.dev/guide/backend-integration)
- [Vite: Node requirements](https://vite.dev/guide/)
