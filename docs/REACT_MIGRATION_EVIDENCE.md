# React migration — staging verification evidence

Staging service: `crucix-staging` (project `crucix-intel-41718`, region `us-central1`).
All flags flipped to `react` on staging only; production untouched.

## Fixes found only by running against real data

1. **Every React page shipped with no stylesheet.** Vite attaches imported CSS to the shared
   `PageShell` chunk, so an entry's own `css` array is empty. `entryAssets()` now walks the
   manifest `imports` graph transitively. Guarded by `test/ui-manifest.test.mjs`.
2. **`.dashboard-main` was `opacity:0`** (the legacy `#main` GSAP boot animation never runs in
   React), hiding every panel below the map. Default opacity is now 1. Guarded by a
   `test/ui-manifest.test.mjs` assertion.

## Page gates (authenticated session, real staging data)

| Surface | Result |
| --- | --- |
| Dashboard `/` | MapLibre canvas rendered (WebGL true), 17 panels, region bar, legend, 20 ticker items, 0 console errors, 0 failed requests |
| Digest `/digest` | React mount (`data-surface="digest"`, hashed `/assets` module) |
| Media `/media` | 40 channel elements + `<video>`; one aborted HLS segment (benign) |
| Login `/login` | React login form with email field |
| Public pages | `/privacy`, `/support`, `/mfa-think-tank` render React output (`body.site-page`) with `#delete-account` / `#no-advice` / `#faq` anchors |

## Rollback rehearsal (flags-only)

`gcloud run services update crucix-staging --update-env-vars UI_DIGEST=…`, verified at `/digest`
by which script the page loads (hashed `/assets` = React, `/js/` = legacy):

| Step | Flip time | Served |
| --- | --- | --- |
| baseline `UI_DIGEST=react` | — | react |
| rollback → `legacy` | 22s | legacy |
| restore → `react` | 20s | react |

Rollback is a single env-var change with a ~20s recovery; verified in both directions.

## React login (P6), end to end

Signed in through the React login (`UI_LOGIN=react`) in a fresh browser profile:

- `/login` served by React (hashed `/assets` module + Firebase compat SDK, no `/js/*`).
- Google sign-in completed and redirected to `/`.
- The resulting session authenticates: `/api/me` → 200 (`texas697@gmail.com`), `/api/data` → 200,
  and the dashboard renders (map canvas, 17 panels, topbar, 0 page errors).

## All gates closed

Every flag (`UI_DASHBOARD`, `UI_DIGEST`, `UI_MEDIA`, `UI_LOGIN`, `UI_SITE`) is `react` on staging
and verified there. Remaining production step: flip the same flags on production (see
`docs/CLOUD_RUN.md`) and observe.
