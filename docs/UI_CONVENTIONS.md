# React UI conventions (binding for every agent touching `dashboard/react`)

Source of truth for code style is `~/.claude/rules/rudys-rules.md`. This file maps those rules onto
this repository and records the architecture decisions for the MUI 5 + SPA conversion. Where this
file and the rules file disagree, the rules file wins.

## Stack

- React 19, TypeScript strict, Vite (root `dashboard/react`, output `dashboard/dist`).
- **MUI 5** (`@mui/material` 5.18, `@mui/icons-material`, Emotion). Every visual element is an
  MUI component or a `styled()` primitive from `@mui/material/styles`. No hand-written global
  stylesheets for app surfaces (the legacy `styles/*.css` files are deleted). The only permitted
  plain CSS is for third-party DOM MUI cannot wrap (MapLibre canvas, popups, HLS video), delivered
  through `GlobalStyles` in the theme.
- `react-router-dom` 7 for client-side routing. `clsx` for classname modifiers.
- Icons: `import XIcon from '@mui/icons-material/X'`. `vite.config.ts` aliases that path to the
  package's ESM copy because rolldown's CommonJS interop hands the default export back as an object
  (React error #130 in the built bundle only; tests never see it).
- Features read the URL through `useSurfaceRoute()` (`app/AppRouter/hooks/useSurfaceRoute`): it
  returns `{ location, history }` where `history` is the legacy `HistoryAdapter` contract backed by
  `useNavigate`, so pushes/replaces go through the router and back/forward re-render without a
  reload. Session, sweep status, theme mode and the settings dialog come from `useSession()`,
  `useSweepStatus()`, `useThemeMode()` and `useSettingsDialog()`.
- Vitest + React Testing Library in `test/ui`; Playwright in `test/e2e`.

## Architecture

```
dashboard/react/
  entries/app.tsx          SPA entry: mounts <AppProviders><AppRouter/></AppProviders> on #root
  entries/login.tsx        login document entry (separate document, same providers/theme)
  app/
    AppProviders/          ThemeProvider + CssBaseline + theme-mode context
    AppRouter/             BrowserRouter + <Routes>; layout route renders AppShell once
    AppShell/              MUI AppBar: brand, nav Tabs (router Links), status, theme toggle, user
    uiFlags.ts             reads window.__CRUCIX_UI__ injected by the server
    surfaces.ts            Surface union + titles
  theme/
    createAppTheme.ts      MUI theme from the legacy tokens (dark default, light mode)
    palette.ts, typography.ts, components.ts, globalStyles.ts
  features/<feature>/      one folder per feature (dashboard, map, digest, media, reader,
                           settings, auth, standalone, site)
  api/, state/, shared/    framework-agnostic clients, url/history adapters, helpers
```

Server contract (`server.mjs` + `dashboard/server/ui.mjs`):

- When `UI_DASHBOARD=react`, the routes `/`, `/digest`, `/digest/:id`, `/media`, `/media/:id`
  all send the **same** document built from the `app` entry, with
  `window.__CRUCIX_UI__ = { dashboard, digest, media, login }` and the existing boot globals
  (`__CRUCIX_LOCALE__`, `__HAS_TAVILY__`) injected in `<head>`.
- Surfaces whose flag is `legacy` are still served from `dashboard/public/*.html`; the SPA nav
  renders a plain anchor for them.
- `/login` stays its own document (it needs the Firebase compat SDK before auth) but uses the same
  MUI theme.
- Public site pages stay server-rendered static HTML with their own stylesheet (readable without
  JavaScript); they follow the file rules but not the MUI rule.

Routing rules:

- Navigation between React surfaces uses `<Link>` / `useNavigate`; the document must never reload.
  The AppShell lives in a layout route so it does not remount on navigation.
- Query-param state (`?filter=`, `?pin=`, `?settings=1`, …) keeps the contract in
  `state/url.ts`; read it with `useSearchParams` / `useLocation` from the router, not from
  `window.location` snapshots taken at mount.
- A 401 from `/api/me` redirects to `/login?next=<path>`; a 404 means auth is off.

## Rudy's rules, applied here

1. **No comments** in production `.ts/.tsx`. No `//`, `/* */`, JSDoc. Rename or extract instead.
2. **File size**: target ≤120 lines, ceiling 160, never ≥220. Tests may be larger but split when
   readability drops.
3. **Folder shape per feature**:
   - `index.tsx` — orchestrator only (compose hooks + render blocks).
   - `hooks/useX/index.ts` — one responsibility per hook.
   - `renders/` — render helpers and option-specific renderers.
   - `components/<PascalCase>/index.tsx` — nested UI surfaces get their own subtree.
   - `styles.ts` — `styled()` primitives and `sx` objects; presentational only.
   - `classes.ts` — the classname dictionary (see 7).
   - `types.ts`, `consts.ts`, `utils.ts` — single-purpose, never dumping grounds.
4. **Named exports only.** No `export default`. For `React.lazy` use
   `lazy(() => import('./X').then((m) => ({ default: m.X })))`.
5. **Naming**: `isX`/`hasX`/`showX` booleans, `onX` handlers, `setX` setters, `xRef` refs,
   `renderX` render callbacks, `useX` hooks, PascalCase component folders, `UseXArgs` /
   `XProps` prop types.
6. **Components render, hooks own behavior.** Anything with multiple effects, refs or temporal
   sequencing goes into a hook. `useCallback` for handlers passed down, `useMemo` for derived
   config objects. One lifecycle concern per effect.
7. **Dictionary classnames** on every rendered element, MUI components included:

   ```ts
   export const CLASSES = {
     root: 'crucix-dashboard-root',
     topBar: 'crucix-dashboard-top-bar',
   } as const;
   ```

   - Prefix is `crucix-<feature>-`. One `classes.ts` per feature; shared shell/app classes live
     in `app/classes.ts` with prefix `crucix-app-`. When the dictionary outgrows the file-size
     rule it is composed from `classes<Area>.ts` parts and a `classModifiers.ts` (dynamic
     modifier maps such as layer dots or CDC levels); `classes.ts` stays the single import.
   - Every value is a single token. The legacy selectors that used to ride along as a second
     token (`col-card`, `pad-sm`, ...) were deleted with the legacy stylesheets; a modifier is its
     own key (`cardBodyPadSm: 'crucix-dashboard-card-body--pad-sm'`) backed by `sx`, never a
     legacy class.
   - Always `className={CLASSES.x}`; never an inline string literal. Modifiers:
     `clsx(CLASSES.tab, isActive && \`${CLASSES.tab}--active\`)`.
   - A class with no style rule behind it is fine: it is the DevTools locator.
8. `interface` for object contracts, `type` for unions/aliases. No `any`.
   Hooks take one `UseXArgs` object (`useSurfacePreload({ loaders, flags })`), never positional
   arguments, and return a memoised state object whose handlers are `useCallback`s.
   Other roots reuse shell pieces only through `app/AppShell/kit.ts` (StatusCluster, ThemeToggle,
   `SHELL_STYLES`, `modelLabel`, `sweepAge`); everything else under `app/AppShell` is private.
9. Every behavior ported from the legacy page keeps its API calls, URL contract and text; visual
   design matches the legacy dark theme (tokens in `theme/palette.ts`).

## Stylesheet bridges

The legacy `styles/*.css` files (`dashboard`, `digest`, `media`, `reader`, `placeholder`, `tokens`)
and the three temporary `*LegacyStyles` bridges are gone: every rule they carried lives in the
feature's `styles.ts` (or its `styles<Area>.ts` parts) as `styled()` primitives and `sx` objects,
and the design tokens are exposed by `theme/globalStyles.ts` as CSS variables on `:root` for the
few HTML strings (map popups) that still read `var(--danger)` / `var(--sky)`.

Exactly one bridge remains, and it is permanent: MapLibre's own stylesheet (canvas, markers,
popups, controls) is third-party DOM that MUI cannot wrap, so
`features/map/components/MapLibreStyles/index.tsx` delivers `maplibre-gl/dist/maplibre-gl.css?inline`
through `GlobalStyles`; `MapFrame` renders it once above the map. Nothing else under
`dashboard/react` may import CSS (`scripts/ui-rules-check.mjs` rejects any `.css` import and any
`.css?inline` outside that file). The public site keeps `site/site.css` (read through `?raw` and
inlined into the server-rendered document) because those pages must be readable without
JavaScript; it defines its own tokens and never depends on the app theme.

## Verification before reporting done

```
npm run typecheck
npm run test:ui
npm run build
node scripts/ui-rules-check.mjs     # rule scan: size, comments, default exports, inline classNames
```

A feature is done only when its own tests pass, the scan is clean for its folder, and the
component is reachable from the SPA without a document reload.

## Map stack (decided 2026-10-15)

- Upgrade `maplibre-gl` from 4.7.1 to the current major (6.x at the time of writing; 5.x was
  the ask, 6.x is the maintained line and carries the same globe projection and API).
- Use `react-map-gl` 8 through its MapLibre entry point (`import Map, { Source, Layer, Marker,
  Popup, NavigationControl } from 'react-map-gl/maplibre'`). Declarative `<Map>`, `<Source>`,
  `<Layer>`, `<Marker>`, `<Popup>` replace the imperative MapView wrapper; `useMap()` gives
  hooks access to the instance for fitBounds / queryRenderedFeatures / drawing.
- Keep every existing layer, selection shape, popup, area brief, region bar and legend
  behaviour; only the plumbing changes. The vendored test copies under `test/fixtures/vendor`
  must be re-pinned to the new version for the e2e routing.
- Shape of the React map (`features/map`): `MapView.tsx`, `MapLegend.tsx`, `MapPopup.tsx`,
  `RegionBar.tsx`, `SelectionPanel.tsx` and `AreaBrief.tsx` at the feature root are import shims
  only; the components live under `components/<Name>/` (`MapCanvas` owns the `<Map>`, `MapLayers`
  nests each legacy layer inside its `<Source>` in legacy z-order, `MapLabels` renders the
  aggregate labels as `<Marker>`s) and the behaviour under `hooks/useX/` (`useDrawTools`,
  `useCanvasClick`, `useMapHandle`, `usePlaneIcon`, `useZoomedIn`, `useMapInstance`). The
  `MapViewHandle` imperative API (`resize`, `flyToRegion`, `flyToPoint`, `getMap`, `project`,
  `enableDragPan`) is kept for the dashboard and standalone hooks.
- The map is uncontrolled (`initialViewState` only, no `viewState` prop) so panning never
  re-renders React; the region bar's live dot is static (no always-on animation) and the brief's
  shimmer/pulse only run while a brief is loading, keeping the idle-CPU fix from PR #15.
- The `militaryAir` symbol layer uses the basemap's own glyph stack
  (`Montserrat Regular, Open Sans Regular, …`): Carto's glyph server has no monospace face, and
  that stack is already vendored for the e2e routing.
- Worker: maplibre 6 ships its worker as a separate ES module and resolves it relative to its own
  bundle URL, which does not exist in the Vite output (the map chunk is `assets/map-*.js`).
  `features/map/mapWorker.ts` imports `maplibre-gl/dist/maplibre-gl-worker.mjs?url` and calls
  `setWorkerUrl()` once; `MapCanvas` triggers it through `hooks/useMapWorker` during the first
  render, before the `<Map>` effect constructs the map. The app build emits the worker as an asset
  under `assets/`; the standalone (library) build inlines it as a `data:` URL. On a `file://` page
  maplibre sees that `data:` URL as cross-origin and wraps it in a blob `import` that Chromium
  refuses for module workers, so `standalone/fileWorkerShim.ts` swaps such blob module workers back
  to the registered URL (file:// only; every other worker is untouched).
- e2e vendoring: `test/fixtures/vendor/maplibre-gl-6.14.0/` holds the 6.14.0 stylesheet and the
  ESM bundle (6.x ships no UMD `maplibre-gl.js`; the ESM file is stored under that name and served
  for both `.js` and `.mjs` requests). The 4.7.1 copy stays for the legacy page.

## Military aircraft on the React map (required, 2026-10-15)

The data pipeline already delivers live military aircraft (`sources.OpenSky.military`, from
OpenSky plus the adsb.lol military feed; 136 on 2026-10-15). The legacy page draws them as
3.4px pale-blue dots inside the generic Air layer, so they are indistinguishable. The React
map must:

- Render them as their own layer, `militaryAir`, with a plane symbol rotated to heading
  (`trk`), a distinct colour, and a label (callsign or hex, type) at zoom >= 4.
- Give the layer its own legend chip with the live count and its own toggle, and list it in
  the signal guide with source and limitations.
- Show the marker count that matches `militaryTotal`: raise `MAX_MIL_LISTED` in
  `apis/sources/opensky.mjs` so the listed set is not capped at 150 (cap at 2000), and make
  `dashboard/inject.mjs` pass the full list through.
- Popup: callsign, type, registration, country, flight level, ground speed, heading, squawk,
  ICAO hex, source. Selection drawing must count them in the selection panel.
- Tests: a vitest case that plots the fixture's military list to `militaryAir` features with
  heading, and an e2e check that the legend chip shows the fixture count.
