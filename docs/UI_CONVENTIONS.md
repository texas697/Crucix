# React UI conventions (binding for every agent touching `dashboard/react`)

Source of truth for code style is `~/.claude/rules/rudys-rules.md`. This file maps those rules onto
this repository and records the architecture decisions for the MUI 5 + SPA conversion. Where this
file and the rules file disagree, the rules file wins.

## Stack

- React 19, TypeScript strict, Vite (root `dashboard/react`, output `dashboard/dist`).
- **MUI 5** (`@mui/material` 5.18, `@mui/icons-material`, Emotion). Every visual element is an
  MUI component or a `styled()` primitive from `@mui/material/styles`. No hand-written global
  stylesheets for app surfaces; the legacy `styles/*.css` files are deleted as their consumers
  migrate. The only permitted plain CSS is for third-party DOM MUI cannot wrap (MapLibre canvas,
  popups, HLS video), delivered through `GlobalStyles` in the theme.
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
   - A feature still on the legacy stylesheet bridge (see below) carries the legacy selector as
     the **second token** of the dictionary value (`card: 'crucix-dashboard-card col-card'`),
     and legacy modifiers get their own keys (`cardBodyPadSm: '... pad-sm'`). The first token is
     the DevTools locator; the second is deleted together with the stylesheet when the feature
     moves to `styled()`. Never write the legacy token anywhere except the dictionary.
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

## Legacy stylesheet bridge (temporary)

`features/dashboard`, `features/digest` and `features/media` are rule-compliant React trees that
still render the legacy markup contract, so their `styles/*.css` files are delivered through MUI
`GlobalStyles` by exactly three files:

- `features/dashboard/components/DashboardLegacyStyles/index.tsx` (`styles/dashboard.css`)
- `features/digest/components/DigestLegacyStyles/index.tsx` (`styles/digest.css`, `styles/reader.css`)
- `features/media/components/MediaLegacyStyles/index.tsx` (`styles/media.css`)

`scripts/ui-rules-check.mjs` rejects a `.css?inline` import anywhere else. When a feature's
visuals move to `styled()`/`sx`, delete its bridge file, its stylesheet and the second token of
every value in its `classes.ts`.

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
