# Migration Plan: `crucix` → `mfb-intelligence` (rev. 2, post-critic)

Repo: `/home/rsanchez/Development/texas697/crucix` (fork of `calesthio/Crucix`, AGPL-3.0-only, 110 commits ahead / 0 behind upstream, `main` clean at `12e8826`).
Scope: full name migration across code, config, docs, brand, legal, cloud, GitHub and local checkout. Planning document only; nothing has been edited.

Where the adversarial review or the critic refuted an earlier claim, this plan uses the corrected finding (noted inline as "corrected"). Changes from rev. 1 are marked **[rev2]**.

---

## 1. Decisions the owner must make first

| # | Decision | Options | Recommendation | Why |
|---|---|---|---|---|
| D1 | **Repo / package / infra slug** | `mfb-intelligence` | **`mfb-intelligence`** | Matches the request; valid Cloud Run / GitHub / npm name. |
| D2 | **Display name** (UI, `<title>`, og tags, locales, logo SVG/PNG, banner) | (a) keep `MFB Services Intelligence` (already shipped in `dashboard/public/brand/*`, `locales/en.json:8,9,29,262,280`, `login/loading/jarvis/digest/media.html:6-10`, `server.mjs:795`) (b) change to `MFB Intelligence` (re-export logo.svg/mark.svg/6 PNGs incl. og-image.png, edit ~12 title/og/locale strings) | **(a) keep `MFB Services Intelligence`** as the user-facing product name; use `MFB Intelligence` only as the short form in prose, comments, log lines and doc titles where upstream wrote "Crucix" | Zero asset work; introducing a third spelling in the UI is a regression. `locales/fr.json` must mirror `en.json` wording. |
| D3 | **Env var prefix** (`CRUCIX_LANG`, `CRUCIX_OPEN_BROWSER`) | `MFBI_*` / `MFB_*` / `MFB_INTELLIGENCE_*` | **`MFBI_LANG`, `MFBI_OPEN_BROWSER`** | Both vars are undocumented and set nowhere in the repo, Dockerfile, compose, `deploy/cloudrun.sh` or the generated `deploy/env.yaml` (corrected: risk low). Short prefix matches the existing `MFBIntel/1.0` UA in `lib/digest/research.mjs:42`. |
| D4 | **Persisted JSON key** `crucix` in `runs/latest.json` (written `apis/briefing.mjs:126`) | (a) keep (b) branded `mfbIntelligence` (c) brand-neutral `meta` | **(c) `meta`** with a one-line reader fallback. **[rev2] Do NOT bump the raw-run `version` string** — leave `'2.0.0'` | `synthesize()` already re-exposes it as `meta`, `runs/memory/hot.json` already stores `meta`, so the raw file converges with every consumer. Corrected: nothing reads `version`, and bumping it to `3.0.0` while `package.json:3` stays `"2.0.0"` and `locales/*.json:29` say `v2.1.0` adds a fourth unrelated number; `package.json:3` is the only authoritative version. |
| D5 | **Browser storage prefix** (`crucix_theme`, `_region`, `_low_perf`, `_markets_open`, `_byok_prompted`, `_byok_banner_dismissed`, `_google_redirect`) | `mfbi_*` / `mfb_intelligence_*` / keep | **`mfbi_*`**, plain atomic rename, optional read-fallback for `theme`, `region`, `byok_prompted` only | All are per-browser cosmetic prefs with safe defaults; the Google-redirect flag only gates a status message (`login.html:140`); `crucix_low_perf` and `crucix_markets_open` are dead code (critic confirmed: `toggleMarkets` `jarvis.html:843` and `togglePerfMode` `:1258` have no call sites; `#perfStatus`/`#marketsPanel` exist only as `getElementById` lookups). |
| D6 | **Window global** `window.__CRUCIX_LOCALE__` | `__MFBI_LOCALE__` | **`__MFBI_LOCALE__`** | Writer `server.mjs:270` and sole reader `dashboard/public/jarvis.html:817` ship in one deploy; atomic rename, no compat. |
| D7 | **Log prefix** `[Crucix]` (~40 lines) | `[MFBI]` / `[MFB Intelligence]` | **`[MFBI]`** via one `const LOG = '[MFBI]'` in `server.mjs` | Shorter; check Cloud Logging for saved filters on `textPayload:"[Crucix]"` first (Q4). |
| D8 | **Cloud Run service name** (`deploy/cloudrun.sh:15`, `firebase.json:7`) | (a) keep `crucix` (b) new service `mfb-intelligence` + Hosting cutover | **(a) keep `crucix` in this migration; schedule (b) as a later, separate cutover behind a custom domain** | The shipped mobile apps hard-code `https://crucix-qa65slel7a-uc.a.run.app` at build time (reported paths `mfb-think-tank/config/app_config.json:4`, `mfb-think-tank-foss/config/app_config.json:4`, read via `String.fromEnvironment('CRUCIX_API_BASE_URL')` in `lib/core/config/app_config.dart:22` — **[rev2] these live outside this repo and were not re-verified here; treat as owner-confirmed, Q2**). The service name is invisible behind Hosting; renaming it buys nothing user-visible until the apps move to `mfbintelligence.com`. Phase D2 gives the exact commands if/when you do it. |
| D9 | **Service accounts** `crucix-run@`, `crucix-deploy@` | keep / recreate | **Keep both; change display names only** | Emails cannot be renamed, they still sit under immutable `crucix-intel-41718`, ~13 IAM bindings + WIF binding to replicate, and deleting the old SA breaks rollback to earlier revisions. |
| D10 | **State bucket** `gs://crucix-intel-41718-runs` | keep / copy to `mfb-intelligence-runs` | **Keep** | Name derives from the immutable project id; `deploy/cloudrun.sh:16` has no literal `crucix`; a copy needs a sweep pause + rsync of `latest.json`, `memory/hot.json(.bak)`, `memory/cold/*.json` (~9.3 MB) for a cosmetic gain. |
| D11 | **Scheduler job names** `crucix-sweep`, `crucix-digest` | keep / rename | **Rename (optional, cheap)** in Phase D1 | Jobs are only names pointing at a URL; `cloudrun.sh:148-179` creates new ones automatically; pause + delete the old pair. **[rev2]** Note `cloudrun.sh:179` also *runs* `crucix-sweep` by name after every deploy, so that line must change together with `:148-179`. |
| D12 | **GitHub repo** `texas697/Crucix` | rename to `texas697/mfb-intelligence` / keep | **Rename, after PR-5 merges** | GitHub redirects git/HTTP/API; fork link retained; **WIF provider condition must be widened first** (Phase A, cloud). |
| D13 | **Detach fork network?** | keep fork link / Settings › Danger Zone › Leave fork network | **Keep the fork link** | Keeps upstream PR/cherry-pick one click away; AGPL attribution stays either way. |
| D14 | **Config file** `crucix.config.mjs` | rename to `mfb-intelligence.config.mjs` / keep | **Rename** via `git mv` in its own commit | Upstream has been silent since 2026-05-20 and the fork already diverges in 102 files; the merge-conflict cost is small and a committed rename script (Phase B) makes re-application idempotent. |
| D15 | **Local dir** `/home/rsanchez/Development/texas697/crucix` | rename / keep | **Rename to `.../texas697/mfb-intelligence`, last step** | No tracked file references the absolute path; only Claude Code memory and `~/.claude.json` key on it. |
| D16 | **Upstream attribution** (`README.md:21,446`, `login.html:68`, `server.mjs:795` subtitle) | keep visible credit / move to README only | **Keep visible credit everywhere it exists today, add a Corresponding-Source link (AGPL §13), add a NOTICE file** | Upstream is AGPL-3.0-only and this is a network service. Cheap goodwill and compliance. |
| D17 | **`crucix.live` / upstream contact references** | | **Remove `crucix.live` demo mention from `package.json:4`; swap test fixtures to `example.com` (cosmetic); replace upstream security email + CODEOWNERS with the fork's** | `crucix.live` is upstream's domain; security reports currently route to `celesthioailabs@gmail.com` (`SECURITY.md:7`, `.github/ISSUE_TEMPLATE/config.yml:4`); `.github/CODEOWNERS:1` is literally `* @calesthio`. |
| D18 | **User-Agent product token** | `MFB-Intelligence/2.0` | **`MFB-Intelligence/2.0 (+https://crucix-intel-41718.firebaseapp.com)`**; keep the project-id URL until a custom domain is live; keep Reddit's descriptive format. **[rev2] Also harmonise the pre-existing third token `MFBIntel/1.0 (research)` at `lib/digest/research.mjs:42` → `MFB-Intelligence/1.0 (research)`** | Hostname derives from the immutable project id; a rewritten hostname is a dead contact URL. One product token across all fetchers. |
| D19 | **ReliefWeb appname** (`apis/sources/reliefweb.mjs:10`) | keep `crucix` / register `mfb-intelligence` | **Register `mfb-intelligence` at apidoc.reliefweb.int, set `RELIEFWEB_APPNAME` in Cloud Run env, change the default** | Corrected **[rev2]**: the source is **already empty** today, not merely degraded — `runs/latest.json:264-269` shows `rwError: "HTTP 406: Blocked due to bot activity"` (the body is HDX's own bot block, `hdx@un.org`) **and** `hdxDatasets: []`, so both ReliefWeb and the HDX fallback return nothing; the `status: "ok"` at `:4698` is only the timing record. The rename cannot make it worse; registration is needed regardless, and the blocker may be the UA rather than the appname (Q3). |
| D20 | **Compat window** | one release / 30 days / 90 days | **Remove shims after one successful post-rename sweep per environment plus a 30-day bake** (Phase F). The `inject.mjs:150` archive fallback stays permanently (archives are never rewritten). | |

Naming summary once decided (recommended): slug `mfb-intelligence` · display `MFB Services Intelligence` (short `MFB Intelligence`) · env `MFBI_*` · JSON key `meta` · storage `mfbi_*` · global `__MFBI_LOCALE__` · log `[MFBI]` · UA `MFB-Intelligence/x.y` · Cloud Run service `crucix` (unchanged for now) · GitHub `texas697/mfb-intelligence` · dir `texas697/mfb-intelligence`.

---

## 2. Blast-radius summary

### 2a. Safe mechanical rename (one scripted commit, no compat)

| Item | File:line |
|---|---|
| Config module + 3 imports | `crucix.config.mjs` → `mfb-intelligence.config.mjs`; `server.mjs:11`, `dashboard/inject.mjs:13`, `diag.mjs:42`; comment `lib/delta/engine.mjs:6` |
| `[Crucix]` log prefixes (~40) | `server.mjs:35,37,59,506,509,683,687,694,702,717,723,729,751-754,757,807-813,819,828,837,840,846,849,851,861,864,868`; `apis/briefing.mjs:71,143`; `apis/save-briefing.mjs:23`; `dashboard/inject.mjs:735`; `diag.mjs:5,77`; `server.mjs:808` (name twice) |
| File-header comments | `server.mjs:2`, `dashboard/inject.mjs:2`, `apis/briefing.mjs:3`, `diag.mjs:2`, `lib/auth/identity.mjs:1`, `.env.example:2`, `deploy/cloudrun.sh:2`, `lib/i18n.mjs:24` |
| Window global | `server.mjs:270` ↔ `dashboard/public/jarvis.html:817` |
| User-Agent strings (product token only) | `apis/utils/fetch.mjs:62`; `apis/sources/ships.mjs:18`, `firms.mjs:8,50`, `kiwisdr.mjs:12`, `fred.mjs:58`, `opensky.mjs:25`, `gdelt.mjs:108,132`, `who.mjs:21`, `ofac.mjs:27`, `gscpi.mjs:17`, `reliefweb.mjs:24`, `reddit.mjs:33,54,61` (keep `intelligence-engine` suffix); `lib/ais/stream.mjs:201`; `server.mjs:171` (`'crucix'` fallback); **[rev2]** `lib/digest/research.mjs:42` (`MFBIntel/1.0 (research)` → `MFB-Intelligence/1.0 (research)`, hand-edit, no `crucix` token); `deploy/ais-relay.py:318`, `deploy/opensky-relay.py:28` (manual relay redeploy) |
| Tests pinned to the above | `test/safe-fetch.test.mjs:147`; `test/llm-openrouter.test.mjs:35,36` |
| OpenRouter attribution | `lib/llm/openrouter.mjs:21` (Referer → fork URL), `:22` (X-Title) |
| French locale | `locales/fr.json:8,9,29,259,262,280` (mirror `en.json`) |
| UI copy | `dashboard/public/jarvis.html:2388` |
| Browser storage keys (all 6 sites of `crucix_theme` atomically) | `jarvis.html:21,1055,1072`, `loading.html:14`, `media.html:11`, `digest.html:13`; `jarvis.html:834,1260` (low_perf, dead), `:842,844` (markets_open, dead), `:991,2240` (region), `:900,901` (byok_prompted), `:887,894` (sessionStorage banner; `:894` is inside a template literal rendered via `innerHTML`); `dashboard/auth/login.html:115,140,142,143` (sessionStorage google_redirect) |
| Env vars | `lib/i18n.mjs:25`, `server.mjs:824` |
| Dev/CI names | `docker-compose.yml:2`; `.github/workflows/docker-publish.yml:49` (Docker Hub name, dormant) |
| Package metadata | `package.json:2,4,24` + regenerated `package-lock.json:2,8` |
| Docs prose | `README.md:125,128,203,210,216,395,417,427,428`; `CONTRIBUTING.md:1,3`; `SECURITY.md:5,11`; `.github/ISSUE_TEMPLATE/bug_report.md:3`, `feature_request.md:15`; `apis/BRIEFING_PROMPT.md:1,21,24,120`; `apis/BRIEFING_TEMPLATE.md:1`; `docs/CLOUD_RUN.md:1,21,136` (**[rev2]** the rest of `CLOUD_RUN.md` is hand-edited, see §2d) |

### 2b. Needs a compat shim (ship readers-accept-both FIRST)

| Item | Why | Shim |
|---|---|---|
| Raw run key `crucix` → `meta` (`apis/briefing.mjs:126`; readers `dashboard/inject.mjs:150,410,740,745`, `apis/save-briefing.mjs:16`, `apis/briefing.mjs:143`) | `runs/latest.json` lives on the GCS FUSE volume `/data/runs` (`deploy/cloudrun.sh:35,138-139`) and survives deploys; on cold start `server.mjs:834` synthesizes the old file. Without a shim: `currentData.meta === undefined` → `/api/status` 503 `'stale'` (`server.mjs:89`), `/api/data` 200 without `meta`, `jarvis.html:3039` throws `'no data'` and `:3043` reload-loops every 5 s, until the next completed sweep. **[rev2]** `cloudrun.sh:179` fires `gcloud scheduler jobs run crucix-sweep ... \|\| true` at the end of every deploy, so the window is "deploy → sweep completes" (minutes), **but the trigger is silent on failure** (`>/dev/null 2>&1 \|\| true`) and under `SWEEP_MODE=external` there is no startup sweep (`server.mjs:845`). Same symptom on rollback. No crash, no delta/memory corruption (startup path never calls `memory.addRun`; `hot.json`/`cold/*.json` contain zero `crucix` keys). | Add `const meta = data.meta ?? data.crucix ?? null;` at the top of `synthesize()` (`inject.mjs:406`) — there is **no** existing `meta` local; a bare `meta?.timestamp` would be a `ReferenceError`. Same `prior.meta?.timestamp \|\| prior.crucix?.timestamp` at `:150` (permanent). **[rev2] The rename script must never touch these lines** (see exclusion list, §2d). |
| Env vars `CRUCIX_LANG`, `CRUCIX_OPEN_BROWSER` | Undocumented, nothing in the repo sets them; `OPEN_BROWSER` is dead in containers (`server.mjs:27` `IN_CONTAINER`). Risk low. | Optional one-liner `process.env.MFBI_LANG ?? process.env.CRUCIX_LANG`. Document both new names in `.env.example`. **[rev2] Script-excluded tokens.** |
| Storage keys | Cosmetic reset only. | Optional `getItem('mfbi_theme') ?? getItem('crucix_theme')` in the 4 inline head scripts + `jarvis.html:1055`, same for `region` (`:991`) and `byok_prompted` (`:900`). Skip for dead keys and sessionStorage keys. |
| GitHub repo rename ↔ WIF | Live provider has `attributeCondition: assertion.repository == 'texas697/Crucix'` and `crucix-deploy@` has one `roles/iam.workloadIdentityUser` binding on `attribute.repository/texas697/Crucix`. After `gh repo rename` the deploy workflow fails at `google-github-actions/auth` with STS 403 "rejected by the attribute condition". | Widen the condition to `in ['texas697/Crucix','texas697/mfb-intelligence']` and add the second principalSet binding **before** renaming; tighten after. |

### 2c. External / manual cloud or GitHub steps (not code)

GCP project display name; SA display names; Firebase web-app display name (`crucix-web`, console only — do **not** create a second web app, `firebase apps:sdkconfig` picks the first); WIF condition/binding; ReliefWeb appname registration + `RELIEFWEB_APPNAME` in `deploy/extra-env.yaml`; optional scheduler job rename (pause/delete old); optional Cloud Run service rename + `firebase.json` + `firebase deploy --only hosting` + authorized-domain cleanup; GitHub repo rename, description, homepage, wiki check; GHCR old package `ghcr.io/texas697/crucix` deletion; Cloud Logging filter check; relay hosts (`rsanchez-server.com`) redeploy of `deploy/*-relay.py`; mobile app base URL (`CRUCIX_API_BASE_URL`) only if D8(b).

### 2d. Must NOT be renamed (or must be hand-edited, never scripted)

| Item | File:line | Reason |
|---|---|---|
| GCP/Firebase project id `crucix-intel-41718` | `.firebaserc:1`; `deploy/cloudrun.sh:13` (+ derived `:16,:17,:38,:162,:182`); `deploy/env.yaml:2,8` (gitignored, regenerated by `cloudrun.sh:24-31`); UA URLs in `apis/sources/{ships:18,firms:8,kiwisdr:12,fred:58,opensky:25}.mjs`; GitHub var `GCP_PROJECT`; project number `640576902539`; `crucix-intel-41718.firebaseapp.com` / `.web.app` / `.firebasestorage.app`; `server.mjs:162` (derived at runtime) | Immutable. A naive replace makes `deploy/cloudrun.sh` exit at `:25-26` (`set -euo pipefail`) and breaks `firebase deploy`. Changing it = new project + migrate Auth users, Firestore, secrets, bucket, mobile `google-services.json`. |
| Session cookie `__session` | `lib/auth/firebase.mjs:12` | Only cookie Firebase Hosting forwards. Mobile app uses `Authorization: Bearer` (`lib/auth/identity.mjs:3`), not the cookie. `docs/CLOUD_RUN.md:95` documenting `crucix_session` is a stale doc error — fix the doc, not the code. |
| Mobile/HTTP contract | `lib/auth/identity.mjs:29-48,123-131,135-203` (`/api/auth/{signin,signup,refresh,reset-password,verify-email}`, fields `token/refreshToken/user/ok/error{code,message}`); `server.mjs:154` (`/mfb-think-tank`, `/support`, `/privacy`, `/terms`); `server.mjs:197` globals; `server.mjs:241,251` `x-sweep-token`; `server.mjs:380-453` `/api/me`, `/api/feedback`, `/api/session`, `/api/logout`, `/api/data`, `/api/status`, `/api/health`, `/api/locales`, `/events` | Contain no name; listed so nobody "tidies" them. Only the header comment `identity.mjs:1` changes. |
| Firestore collections | `lib/auth/users.mjs:24`, `lib/feedback.mjs:52,63`, `lib/digest/store.mjs:17-18,74,88` | Name-free. |
| Delta memory | `lib/delta/memory.mjs:17,85,198`; `lib/delta/engine.mjs:60,166-167`; `runs/memory/hot.json`, `cold/*.json` | Already use `meta`. |
| **[rev2] Compat-shim source lines** | `dashboard/inject.mjs:150,406` (`prior.crucix`, `data.crucix`), `apis/save-briefing.mjs:16`, `lib/i18n.mjs:25` (`CRUCIX_LANG`), `server.mjs:824` (`CRUCIX_OPEN_BROWSER`), optional storage fallbacks | A case-insensitive replace would rewrite `data.meta ?? data.crucix` → `data.meta ?? data.meta` and `MFBI_LANG ?? CRUCIX_LANG` → `MFBI_LANG ?? MFBI_LANG`, silently deleting the compat layer in the same PR that flips the writer (the one real outage path). Token-level exclusions below. |
| Upstream attribution | `README.md:21` (subject "It" already refers to MFB Services Intelligence — keep verbatim), `README.md:446`, `dashboard/auth/login.html:68` (hand-edit only), `server.mjs:795` subtitle and `:808` / `diag.mjs:77` prose (hand-edit only), `lib/llm/openrouter.mjs:21` (hand-edit) | AGPL §4/§5; blind replace would produce "built on the open-source mfb-intelligence engine" and a dead `github.com/calesthio/mfb-intelligence` link. **[rev2]** `README.md:8` is the AGPL badge and contains no `Crucix`; it is untouched by any replace and is dropped from this list. Phrase-level exclusions below. |
| **[rev2] `docs/CLOUD_RUN.md` (whole file hand-edited)** | `:8` (`Cloud Run (crucix,`), `:42` (`create crucix-run --display-name "Crucix Cloud Run"`), `:60` (bare `crucix-run`), `:83,:107` (job names), `:123,:124,:125,:129` (bare service name `crucix`) | These name live resources that Phase C says to change only if D8(b)/D11 are executed; the `crucix-run@` exclusion covers `:43` but not `:42`/`:60`, and bare `crucix` cannot be excluded by token. Script-excluded file; Phase C lists the exact hand edits. |
| License | `LICENSE` (verbatim AGPL text, 0 `crucix` tokens), `package.json:25` `"AGPL-3.0-only"` | Must stay byte-identical / unchanged. |
| Generated/runtime data | `runs/latest.json`, `runs/briefing_*.json`, `.firebase/hosting.*.cache`, `deploy/env.yaml` | Never hand-edit; `latest.json` is rewritten on the next sweep. |
| Test fixtures `ops@crucix.live` etc. | `test/auth-email-verified.test.mjs:15,16,20,37,38,39` | Exclude from the case-insensitive replace (deliberate mixed-case fixtures). Optionally swap all six to `example.com` in PR-4. |
| Hard-coded infra names in `deploy/cloudrun.sh` | `:13,:15,:16,:17,:148-179`; `:26` is only an echo hint (safe) | Script is excluded from the replace except `:2` and `:26`. |
| Immutable auto-created GCP resources | Artifact Registry `cloud-run-source-deploy`, bucket `run-sources-crucix-intel-41718-us-central1` | Names derive from project id; prune old images in Phase F. |

**[rev2] Exclusion rules for the rename script (`scripts/rename-brand.sh`)** — the script must implement all three layers, and §4's leftover-grep uses the same list:

- *Token exclusions*: `crucix-intel-41718`, `calesthio/Crucix`, `crucix.live`, `crucix-run@`, `crucix-run` (bare), `crucix-deploy`, `crucix-sweep`, `crucix-digest`, `crucix-web`, `crucix_session`, `crucix-qa65slel7a`, `crucix-640576902539`, `CRUCIX_API_BASE_URL`, **`data.crucix`, `prior.crucix`, `process.env.CRUCIX_LANG`, `process.env.CRUCIX_OPEN_BROWSER`, `getItem('crucix_` (if storage fallbacks are added)**.
- *Phrase exclusions*: `built on the open-source Crucix`, `Crucix engine`, `[Crucix](https://github.com/calesthio/Crucix)`, `A previous Crucix instance`, `Crucix contributors`, `Crucix (AGPL`.
- *File exclusions*: `LICENSE`, `.firebaserc`, `firebase.json`, `deploy/cloudrun.sh` (except lines 2, 26, and 148-179 only under D11), `deploy/env.yaml`, `docs/CLOUD_RUN.md`, `dashboard/auth/login.html` (line 68 hand-edited; the four storage-key lines `:115,140,142,143` are done by a targeted `sed` on `crucix_google_redirect` only), `test/auth-email-verified.test.mjs`, `runs/`, `node_modules/`, `.git/`, `docs/*.png`, `docs/media/`.
- Script must be **idempotent** (second run is a no-op) and must `exit 1` if any excluded token count changes before/after.

---

## 3. Phased execution plan

Branch: `chore/rename-mfb-intelligence`, five stacked PRs plus cloud/GitHub steps. Every PR must pass `ci.yml` (`node --check` on every `.mjs`, `npm ci`, `npm test`). Deploys are manual `workflow_dispatch` of `deploy.yml` from `main` behind the `production` environment (reviewer texas697).

### Phase A — Prep + compat shims (deploy FIRST, so rollback is safe)

**A0. Pre-work (no code change, PR-0 is optional/empty)**
1. `git fetch upstream` (never fetched before: `refs/remotes/upstream/*` is empty). Create `git branch upstream-sync 3db7068 && git branch -u upstream/master upstream-sync` as the long-lived never-rebranded branch.
2. Decide which of the **[rev2] 13** local non-main branches to cherry-pick onto `main` **now**: the 11 `pr*` branches (`pr121 pr124 pr128 pr129 pr130 pr143 pr150 pr153 pr39 pr55 pr58`, e.g. `pr150` stored-XSS fix) **plus `docs/readme-rewrite` and `ui/dashboard-redesign`** (both touch heavily-renamed files — `README.md`, `jarvis.html` — and will conflict on every renamed line after PR-2). Delete the rest. Stale local `master` (24 behind) can be deleted after `upstream-sync` exists.
3. Register `mfb-intelligence` as a ReliefWeb appname (external, asynchronous; needed regardless of the rename, see D19).
4. Check Cloud Logging for log-based metrics/alerts matching `[Crucix]` (Q4).
5. Check whether anything polls `/api/status` or `/health` (uptime check / scheduler alert) that would page during a cold-start window (Q5).

**A1. Cloud: widen WIF before any repo rename** (safe to do now, both names accepted)
```
gcloud iam workload-identity-pools providers update-oidc github \
  --location global --workload-identity-pool github --project crucix-intel-41718 \
  --attribute-condition "assertion.repository in ['texas697/Crucix','texas697/mfb-intelligence']"
gcloud iam service-accounts add-iam-policy-binding \
  crucix-deploy@crucix-intel-41718.iam.gserviceaccount.com --project crucix-intel-41718 \
  --role roles/iam.workloadIdentityUser \
  --member 'principalSet://iam.googleapis.com/projects/640576902539/locations/global/workloadIdentityPools/github/attribute.repository/texas697/mfb-intelligence'
```

**A2. PR-1 `feat(compat): accept both run-meta keys and env names`** — one commit per contract, reviewed for behaviour, deployed and baked before PR-2.

| Step | File:line | Exact change |
|---|---|---|
| A2.1 | `dashboard/inject.mjs:406` (top of `synthesize`) | insert `const meta = data.meta ?? data.crucix ?? null;` **[rev2]** implemented as an exported pure helper `export function runMeta(data) { return data.meta ?? data.crucix ?? null; }` placed above `synthesize`, with `const meta = runMeta(data);` as the first line of `synthesize` — so it is unit-testable without network |
| A2.2 | `dashboard/inject.mjs:410` | `loadOpenSkyFallback(data.sources.OpenSky?.timestamp \|\| meta?.timestamp)` |
| A2.3 | `dashboard/inject.mjs:740` | `meta: meta,` |
| A2.4 | `dashboard/inject.mjs:745` | `... \|\| data.sources.OpenSky?.timestamp \|\| meta?.timestamp \|\| null` |
| A2.5 | `dashboard/inject.mjs:150` | `prior.sources?.OpenSky?.timestamp \|\| prior.meta?.timestamp \|\| prior.crucix?.timestamp \|\| null` (permanent) |
| A2.6 | `apis/save-briefing.mjs:16` | `new Date(runMeta(data).timestamp)` (import from `../dashboard/inject.mjs`, or duplicate the one-liner) |
| A2.7 | `server.mjs:834-836` | **[rev2] REQUIRED, not optional**: after `const data = await synthesize(existing);` add `if (!data.meta) throw new Error('unrecognised latest.json shape');` so a key-mismatched file falls into the existing `catch` → `'No existing data found — first sweep required'` branch (`server.mjs:839-840`) instead of serving a meta-less payload. Note this does **not** shorten any window (under `SWEEP_MODE=external` the branch still waits for the scheduler); it only makes the failure mode the documented one. With the shims intact there is no window at all. |
| A2.8 | `lib/i18n.mjs:25` | `process.env.MFBI_LANG ?? process.env.CRUCIX_LANG ?? process.env.LANGUAGE ...` (keep `\|\|` semantics for empty strings if preferred); update comment `:24` |
| A2.9 | `server.mjs:824` | `(process.env.MFBI_OPEN_BROWSER ?? process.env.CRUCIX_OPEN_BROWSER) !== 'false'` |
| A2.10 | `.env.example` | add documented `MFBI_LANG=en`, `MFBI_OPEN_BROWSER=true`, `RELIEFWEB_APPNAME=` entries (all three are undocumented today) |
| A2.11 | `docs/CLOUD_RUN.md:95` | `Session cookie \`__session\`, 14 days (\`AUTH_SESSION_DAYS\`). Firebase Hosting only forwards \`__session\`.` (stale doc fix; line 79 already says this) |
| A2.12 | `test/run-meta.test.mjs` (new) | **[rev2]** test `runMeta({crucix:{timestamp:'…'}})` and `runMeta({meta:{…}})` both return the object, and `runMeta({})` returns `null`. Do **not** call `synthesize()` in a unit test: it calls `fetchAllNews()` (`inject.mjs:733` → `fetchRSS` `:166-168`, real network) and reads `runs/briefing_*.json` (`:146-150`); `npm test` (`package.json:8`) only skips `*integration*` files, so a `synthesize` test would do network I/O in `ci.yml`. If a synthesize-level test is wanted, name it `test/synthesize.integration.test.mjs` and stub `globalThis.fetch`. |

Writer `apis/briefing.mjs:126` is **unchanged** in PR-1. Deploy PR-1 via `deploy.yml`. **[rev2]** `deploy/cloudrun.sh:179` already triggers `crucix-sweep` at the end of the deploy (silently: `>/dev/null 2>&1 || true`), so do not re-run it; instead **verify** it ran: `gcloud scheduler jobs describe crucix-sweep --location us-central1 --project crucix-intel-41718 --format='value(status.lastAttemptTime,status.code)'` and `/api/health` `sourcesOk > 0`; only if the trigger failed, run `gcloud scheduler jobs run crucix-sweep --location us-central1 --project crucix-intel-41718`. From here on, any rollback target is PR-1, which reads both keys.

### Phase B — Mechanical rename (code/config/package/tests)

**B1. PR-2 `chore(rename): config file + mechanical brand replace`**

Commit 2a — `git mv crucix.config.mjs mfb-intelligence.config.mjs` **with no content edits**, plus the three import lines in the same commit (so every commit runs): `server.mjs:11`, `dashboard/inject.mjs:13`, `diag.mjs:42`.

Commit 2b-pre — **[rev2] hand-edits that must land BEFORE the script runs** (so the script's phrase exclusions have nothing to miss): `dashboard/auth/login.html:68`, `server.mjs:795` banner, `server.mjs:808` + `diag.mjs:77` prose ("A previous Crucix instance" → "A previous MFB Intelligence instance"), `lib/llm/openrouter.mjs:21-22`, `lib/digest/research.mjs:42`, `docs/CLOUD_RUN.md` (per Phase C table), `test/auth-email-verified.test.mjs` (if D17 fixture swap), `README.md:21,446` left verbatim.

Commit 2b — add `scripts/rename-brand.sh` (committed, idempotent, with the three-layer exclusion list from §2d) and run it. **[rev2]** `scripts/` already exists (`scripts/clean.mjs`, wired to `npm run clean`) and `Dockerfile:10` `COPY . .` ships it into the image while `.dockerignore` does not exclude `scripts/`; add `scripts/rename-brand.sh` to `.dockerignore` in the same commit (harmless if shipped, but a shell tool has no business in the runtime image). It performs, case-aware:

| Target | Old → New |
|---|---|
| Log prefixes | `[Crucix]` → `[MFBI]`; in `server.mjs` extract `const LOG = '[MFBI]'` once; `diag.mjs:5` → `=== MFBI DIAGNOSTICS ===` (prose at `server.mjs:808`, `diag.mjs:77` already hand-edited in 2b-pre) |
| Header comments | `server.mjs:2`, `dashboard/inject.mjs:2`, `apis/briefing.mjs:3`, `diag.mjs:2`, `lib/auth/identity.mjs:1`, `.env.example:2`, `lib/delta/engine.mjs:6`, `lib/i18n.mjs:24`, `mfb-intelligence.config.mjs:1`, `deploy/cloudrun.sh:2` (only line allowed in that file besides `:26`) |
| Window global | `server.mjs:270` + `dashboard/public/jarvis.html:817` → `__MFBI_LOCALE__` |
| Env var names | `lib/i18n.mjs:25`, `server.mjs:824` — **only the `MFBI_*` side is new; the `process.env.CRUCIX_*` fallback tokens are excluded and must survive** (verify with the script's before/after count check) |
| Storage keys | all sites in §2a → `mfbi_theme`, `mfbi_low_perf`, `mfbi_markets_open`, `mfbi_region`, `mfbi_byok_prompted`, `mfbi_byok_banner_dismissed`, `mfbi_google_redirect`; optional read-fallback for theme (`jarvis.html:21,1055`, `loading.html:14`, `media.html:11`, `digest.html:13`), region (`:991`), byok_prompted (`:900`). `jarvis.html:894` writes inside a backtick template with single quotes rendered via `innerHTML` — verify in-browser (§4). Optionally delete the dead `togglePerfMode`/`isWeakMobileDevice`/`toggleMarkets` code (`jarvis.html:1239-1263`, `:843-846`) instead of renaming. `login.html:115,140,142,143` via a targeted `sed 's/crucix_google_redirect/mfbi_google_redirect/g'` (file is otherwise excluded). |
| UA strings | product token `Crucix/2.0` → `MFB-Intelligence/2.0`, `Crucix/1.0` → `MFB-Intelligence/1.0`; in the five long UAs keep `(MFB Services Intelligence dashboard; +https://crucix-intel-41718.firebaseapp.com)`; `firms.mjs:50` → use the `UA` constant from `:8`; `reddit.mjs:33,54,61` → `MFB-Intelligence/1.0 intelligence-engine`; `server.mjs:171` → `'mfb-intelligence'`; `lib/ais/stream.mjs:201`; `deploy/ais-relay.py:318` → `MFB-Intelligence/2.0 (relay)`; `deploy/opensky-relay.py:28` → `MFB-Intelligence/2.0 opensky-relay`; `apis/sources/reliefweb.mjs:24` → `MFB-Intelligence/1.0` and `:10` default → `'mfb-intelligence'` (only after D19 registration is confirmed; otherwise leave the default and rely on env) |
| OpenRouter (hand-edited in 2b-pre) | `lib/llm/openrouter.mjs:21` → `'https://github.com/texas697/Crucix'` now (switch to `/mfb-intelligence` in Phase E; GitHub redirects old→new, not new→old), `:22` → `'MFB Intelligence'` |
| Tests | `test/safe-fetch.test.mjs:147` → `'MFB-Intelligence/2.0'`; `test/llm-openrouter.test.mjs:35` → `'MFB Intelligence'`, `:36` → chosen Referer |
| Locales | `locales/fr.json:8` → `MFB Services Intelligence — Terminal de Renseignement`; `:9` → `MFB SERVICES INTELLIGENCE — MOTEUR DE RENSEIGNEMENT`; `:29` → `INITIALISATION MOTEUR MFB INTELLIGENCE v2.1.0` (mirrors `en.json:29`); `:259` → `Utilisez le dashboard MFB Intelligence ou l'agent Claude...`; `:262` → `🖥️ STATUT MFB INTEL`; `:280` → `📋 BRIEF MFB INTEL` |
| UI copy | `dashboard/public/jarvis.html:2388` → "...and MFB Intelligence will have your model read every sweep..." |
| Banner (hand-edited in 2b-pre) | `server.mjs:795` → `renderBanner('MFB SERVICES INTELLIGENCE', 'built on the open-source Crucix engine · 28 Sources', [` (`renderBanner` sizes dynamically, `server.mjs:771-789`) |
| Explicitly untouched by the script | `dashboard/auth/login.html` (except the targeted sed), `README.md:21,36-37,446`, `docs/CLOUD_RUN.md`, all §2d items, all compat-shim lines |

Commit 2c — persisted key writer rename: `apis/briefing.mjs:126` `crucix:` → `meta:` (**[rev2]** `version` stays `'2.0.0'`, D4), `apis/briefing.mjs:143` `output.meta.sourcesOk`. Readers already accept both (PR-1). **Pre-merge gate**: `grep -c 'data.crucix' dashboard/inject.mjs` must be ≥ 1 and `grep -c 'CRUCIX_LANG' lib/i18n.mjs` must be 1 — proves the shims survived the script.

Commit 2d — `.git-blame-ignore-revs` containing the SHA of 2b.

**B2. PR-3 `chore(infra): compose / Docker Hub / CI names`**

| File:line | New value |
|---|---|
| `docker-compose.yml:2` | `  mfb-intelligence:` (+ optional `container_name: mfb-intelligence`); run `docker compose down --remove-orphans` locally first; volume `./runs` bind mount is unaffected (`:9`) |
| `.github/workflows/docker-publish.yml:49` | `format('{0}/{1}', secrets.DOCKERHUB_USERNAME, 'mfb-intelligence')` (dormant; `DOCKERHUB_ENABLED` unset) |
| `.github/workflows/docker-publish.yml:12` | unchanged (`${{ github.repository }}` becomes `texas697/mfb-intelligence` after Phase E; `docker/metadata-action@v5` lowercases it) |
| `.github/workflows/deploy.yml:33-41` (**[rev2]** corrected lines) | optional: add `SERVICE`, `SERVICE_ACCOUNT`, `BUCKET`, `PUBLIC_URL` to the `env:` block (all honoured by `cloudrun.sh:15-17,38`) so a future D2 cutover needs no script edit; `PROJECT` line 35 unchanged |
| `.github/workflows/ci.yml`, `Dockerfile`, `.gcloudignore`, `hosting/404.html`, `.github/pull_request_template.md` | no name references; optionally add OCI label `org.opencontainers.image.title=mfb-intelligence` to `Dockerfile` |
| `.dockerignore` | **[rev2]** add `scripts/rename-brand.sh` (done in PR-2 commit 2b if not already) |
| `deploy/cloudrun.sh:26` | echo hint `firebase apps:create web mfb-intelligence-web` (text only; do not actually create a second web app) |
| `deploy/cloudrun.sh:148-179` | only if D11: `crucix-sweep` → `mfb-intelligence-sweep`, `crucix-digest` → `mfb-intelligence-digest`, **including the post-deploy trigger at `:179`** (script creates new jobs on next deploy; Phase D1 pauses/deletes the old) |
| `deploy/cloudrun.sh:13,15,16,17` | **unchanged** (add a comment: project id is historical/immutable) |

**B3. PR-5 `chore: rename npm package`** (last code PR, because it touches the lockfile)

`package.json:2` → `"name": "mfb-intelligence"`; `:4` → `"description": "MFB Services Intelligence - OSINT and markets dashboard built on the open-source Crucix engine: 30 open sources, Firebase login, per-user AI keys, Cloud Run deployment."` (actual wired source count is 30 — `apis/briefing.mjs:75-116`; the 27/28/29/25 figures in `package.json:4`, **[rev2]** `apis/briefing.mjs:71` (corrected from `:70`), `server.mjs:795`, `README.md:5,...`, `login/loading.html:10`, `jarvis.html:10`, `lib/llm/ideas.mjs:22`, `locales/*.json:296` are inconsistent — fix in the same PR or drop the number); `:24` → `"author": "MFB Services, Inc."` (if adding contributors use `"contributors": [{ "name": "calesthio", "url": "https://github.com/calesthio/Crucix" }]`, not the parenthesised shorthand); `:18` optionally add keyword `"mfb-intelligence"`; `:3` `"version": "2.0.0"` and `:25` unchanged. Then `npm install --package-lock-only` and commit `package.json` + `package-lock.json` together (`npm ci` in `ci.yml` and `Dockerfile` fails on a stale lock).

### Phase C — Docs / brand / legal (PR-4 `docs: rebrand + attribution`)

| File:line | Change |
|---|---|
| `README.md:3,16` | unchanged under D2(a) |
| `README.md:21,446` | **keep verbatim** (fork sentence, credits). Optionally append to `:446`: "This fork is maintained by MFB Services, Inc.; modifications since 2026-10-05 are recorded in git history." (AGPL §5(a) date). **[rev2]** `README.md:8` is the AGPL badge, name-free, nothing to do. |
| `README.md:36-37` | `git clone https://github.com/texas697/mfb-intelligence.git` / `cd mfb-intelligence` — merge this hunk only in Phase E (or merge now; the new URL 404s until the GitHub rename) |
| `README.md:125,128,203,395,417,427,428` | "Crucix" → "MFB Intelligence" |
| `README.md:210` | tree root `mfb-intelligence/` |
| `README.md:212,357` | `mfb-intelligence.config.mjs` |
| `README.md:216` | `├── docs/                      # Cloud Run guide + demo video` |
| `README.md:221` | unchanged |
| `README.md:284` | ReliefWeb key requirement "None" is stale → "approved `RELIEFWEB_APPNAME`" |
| `CONTRIBUTING.md:1,3` | title/prose rename; add an "Upstream" section describing the fork and the `upstream-sync` branch (Q7) |
| `SECURITY.md:5,7,11` | prose rename; `:7` → the monitored mailbox (`rsanchezdev697@gmail.com` per `crucix.config.mjs:27`, or a `security@` on an MFB domain); `:11` → `` `[MFB Intelligence Security] short description` ``; optionally keep a second line routing engine-level vulns to upstream |
| `.github/ISSUE_TEMPLATE/config.yml:4` | `url: mailto:<same address as SECURITY.md:7>` |
| `.github/ISSUE_TEMPLATE/bug_report.md:3`, `feature_request.md:15` | prose rename (issues are disabled on the fork; harmless) |
| `.github/CODEOWNERS:1` | `* @calesthio` → `* @texas697` (currently inert — GitHub shows "Unknown owner"; no branch protection or rulesets exist) |
| `docs/CLOUD_RUN.md` (**[rev2] all hand-edited; file is script-excluded**) | `:1,21,136` prose rename ("Crucix" → "MFB Intelligence"); `:20,70,71` placeholder `my-crucix` → `my-mfb-intelligence`; `:29` → `mfb-intelligence-web`; `:42` display-name string `"Crucix Cloud Run"` → `"MFB Intelligence Cloud Run"` but **keep `create crucix-run`**; `:8,43,60,83,107,123,124,125,129` **only** change for resources actually renamed in Phase D (keep `crucix-run`, `crucix` service, `crucix-sweep`/`-digest` unless D8(b)/D11 executed — add a one-line note "resource names are historical"); `:58` add "the WIF provider is restricted by repository name and must be updated on rename"; `:95` done in PR-1 |
| `apis/BRIEFING_PROMPT.md:1,21,120` | rename; `:24` → `npm run brief:save   # from the repository root` (**[rev2]** `npm run sweep` only prints JSON to stdout; `brief:save` is what writes `runs/latest.json`) |
| `apis/BRIEFING_TEMPLATE.md:1` | `# MFB Intelligence Briefing Template` |
| `dashboard/auth/login.html:68` | hand-edit (in PR-2 commit 2b-pre, or here): `<span style="opacity:0.6">MFB Services, Inc. · built on the open-source <a href="https://github.com/calesthio/Crucix" style="color:inherit">Crucix</a> engine (AGPL-3.0) · <a href="https://github.com/texas697/Crucix" style="color:inherit">Source</a></span>` (switch the Source href in Phase E) |
| `dashboard/site/layout.html:58` | add after it: `<div style="margin-top:4px;opacity:.7">Built on the open-source <a href="{{UPSTREAM_URL}}" rel="noopener">Crucix</a> engine (AGPL-3.0) · <a href="{{SOURCE_URL}}" rel="noopener">Source code</a></div>`; add `sourceUrl: process.env.SITE_SOURCE_URL \|\| 'https://github.com/texas697/Crucix'` and `upstreamUrl: 'https://github.com/calesthio/Crucix'` to the `site{}` block (`mfb-intelligence.config.mjs:24-33`) and `SOURCE_URL`/`UPSTREAM_URL` to `siteVars` (`server.mjs:128-139`). These pages are linked from the store listings, so this is where mobile users get the AGPL §13 source offer (they never see `login.html`). Optionally also `dashboard/site/terms.html:42`. `layout.html:6,7,52,57` are template vars, unchanged. |
| `NOTICE` (new, root) | `MFB Intelligence` / `Copyright (c) 2026 MFB Services, Inc.` / "This program is a modified version of Crucix (https://github.com/calesthio/Crucix), Copyright (c) 2026 the Crucix contributors, licensed under the GNU Affero General Public License v3.0 only (see LICENSE). Modifications by MFB Services, Inc. began 2026-10-05 and are recorded in this repository's git history. Corresponding Source for the running network service: <repo URL>." Cite AGPL §4, §5(a), §13 (not §7(b); upstream added no §7 terms). Do not invent an upstream copyright line beyond "the Crucix contributors". |
| `LICENSE`, `package.json:25` | unchanged |
| `.env.example:2` | header rename (done in PR-2) |
| `test/auth-email-verified.test.mjs:15,16,20,37,38,39` | optional: `ops@example.com` / `example.com` (all six consistently, preserving the mixed-case variants); hand-edit, file is script-excluded |
| `docs/boot.png`, `dashboard.png`, `globe.png`, `map.png` | unreferenced upstream screenshots showing the CRUCIX boot screen → delete, or re-capture with MFB branding and link from README (Q9) |
| `docs/media/mfb-services-demo.mp4` | unreferenced 18 MB duplicate of `mfbintelligence-demo.mp4` → delete (Q9) |
| `README.md:12` | unchanged (already points at `mfbintelligence-demo.mp4`) |
| `dashboard/auth/login.html:6-11,47`, `jarvis.html:6,9,10`, `loading.html:6,9,10,78`, `digest.html:6`, `media.html:6`, `dashboard/public/brand/*`, `locales/en.json`, `dashboard/site/{marketing,support,privacy,terms}.html` | unchanged under D2(a); fix og:description source counts (29 vs 28) with the count cleanup in PR-5 |
| GitHub repo description/homepage | Phase E |

### Phase D — Cloud cutover

**D0. Required (no resource renames)** — after PR-2…PR-5 merge:
1. `workflow_dispatch` `deploy.yml` from `main` (runs `deploy/cloudrun.sh`; service stays `crucix`, SA `crucix-run@`, bucket unchanged, scheduler jobs updated to the same URL). No `firebase deploy --only hosting` needed (firebase.json unchanged).
2. **[rev2]** `cloudrun.sh:179` triggers `crucix-sweep` automatically at the end of the deploy, silently. **Verify** it completed (`gcloud scheduler jobs describe crucix-sweep ... --format='value(status.lastAttemptTime,status.code)'`, then `gsutil cat gs://crucix-intel-41718-runs/latest.json | head -3` shows `"meta": {`). Only if it did not: `gcloud scheduler jobs run crucix-sweep --location us-central1 --project crucix-intel-41718`. With PR-1 shims in place this is hygiene, not an outage gate.
3. Put the ReliefWeb appname into the gitignored `deploy/extra-env.yaml` (`cloudrun.sh:124-125`): `RELIEFWEB_APPNAME: "mfb-intelligence"` (only once registered).
4. Cosmetic display names:
```
gcloud projects update crucix-intel-41718 --name="MFB Intelligence"
gcloud iam service-accounts update crucix-run@crucix-intel-41718.iam.gserviceaccount.com \
  --display-name="MFB Intelligence Cloud Run" --project crucix-intel-41718
gcloud iam service-accounts update crucix-deploy@crucix-intel-41718.iam.gserviceaccount.com \
  --display-name="MFB Intelligence deploy (GitHub Actions)" --project crucix-intel-41718
```
   Firebase console › Project settings › Your apps › rename `crucix-web` display name (app id and `FIREBASE_WEB_CONFIG` unchanged).
5. Redeploy `deploy/opensky-relay.py` and `deploy/ais-relay.py` on `rsanchez-server.com` by hand (UA change only; relay auth is `X-Relay-Token`).
6. If Cloud Logging had `[Crucix]` filters (A0.4), update them to `[MFBI]`.

**D1. Optional: scheduler job rename** (only if `cloudrun.sh:148-179` was changed in PR-3). The deploy in D0.1 creates `mfb-intelligence-sweep` / `mfb-intelligence-digest`; both pairs fire until the old are paused (double external-API usage, double digest LLM spend if `DIGEST_OPERATOR_WRITEUPS=true`):
```
gcloud scheduler jobs pause crucix-sweep  --location us-central1 --project crucix-intel-41718
gcloud scheduler jobs pause crucix-digest --location us-central1 --project crucix-intel-41718
# after one verified cycle of the new jobs:
gcloud scheduler jobs delete crucix-sweep  --location us-central1 --project crucix-intel-41718 --quiet
gcloud scheduler jobs delete crucix-digest --location us-central1 --project crucix-intel-41718 --quiet
```
Update `docs/CLOUD_RUN.md:83,107,124` in the same change.

**D2. Deferred: Cloud Run service rename behind a custom domain** (do **not** run in this migration unless the mobile app base URL has moved). Preconditions: Firebase Hosting custom domain `mfbintelligence.com` added in the console (already an authorized domain; no Cloud Run domain mapping needed); code made domain-aware — `server.mjs:189-191` `isHostingDomain` regex and `dashboard/public/jarvis.html:2850-2853` SSE-skip regex only match `*.firebaseapp.com|*.web.app`, so either extend them (drive from `PUBLIC_URL`) or set `AUTH_SAME_ORIGIN_HELPER=true` and add `https://mfbintelligence.com/__/auth/handler` to the Google OAuth client; new mobile builds shipped with `CRUCIX_API_BASE_URL=https://mfbintelligence.com` and adoption > 95%. Then:
```
# 1. new service in parallel (old keeps serving; both min-instances 1 until cleanup)
SERVICE=mfb-intelligence PUBLIC_URL=https://mfbintelligence.com bash deploy/cloudrun.sh   # also change cloudrun.sh:15 default + deploy.yml env in the same PR
# 2. smoke the new *.run.app URL
# 3. front-door cutover (atomic for Hosting users)
#    firebase.json:7 -> "serviceId": "mfb-intelligence"
firebase deploy --only hosting --project crucix-intel-41718
# 4. verify Google sign-in + /api/auth/* through the Hosting/custom domain
# 5. only after app adoption:
gcloud run services delete crucix --region us-central1 --project crucix-intel-41718 --quiet
# 6. drop stale hosts from Firebase Auth authorizedDomains (additive script never removes):
#    PATCH https://identitytoolkit.googleapis.com/admin/v2/projects/crucix-intel-41718/config?updateMask=authorizedDomains
#    minus crucix-qa65slel7a-uc.a.run.app, crucix-640576902539.us-central1.run.app (harmless if left)
```
Naive-rename reminder: editing `firebase.json:7` alone is inert until `firebase deploy --only hosting`; deploying it before the service exists is rejected by the CLI (previous release stays live). The real outage path is deleting the old `crucix` service while apps or the rewrite still point at it. `deploy/env.yaml:8` `PUBLIC_URL` and `cloudrun.sh:38,182` follow `PUBLIC_URL`. SA/bucket renames (D9/D10) are not recommended; if ever done, follow the inventory's create → grant roles (`datastore.user`, `firebaseauth.admin`, `secretmanager.secretAccessor`, `storage.objectAdmin` on the bucket, `iam.serviceAccountUser` for the deploy SA read from the `GCP_DEPLOY_SERVICE_ACCOUNT` variable) → deploy → **disable** (not delete) old SA sequence, and `gcloud storage rsync -r gs://crucix-intel-41718-runs gs://<new>` with sweeps paused.

### Phase E — GitHub repo + local directory

1. Confirm A1 (WIF widened) and that all five PRs are merged and deployed.
2. `gh repo rename mfb-intelligence -R texas697/Crucix`
3. `gh repo edit texas697/mfb-intelligence --description "MFB Services Intelligence — Firebase login, per-user BYOK LLM keys, Cloud Run deploy (built on the open-source Crucix engine, AGPL-3.0)" --homepage https://crucix-intel-41718.firebaseapp.com` (or the custom domain once live). Check the wiki (`has_wiki=true`) for Crucix pages.
4. `git remote set-url origin https://github.com/texas697/mfb-intelligence.git` (leave `upstream` as is).
5. Small follow-up PR: `README.md:36-37`, `login.html:68` Source href, `layout.html` `sourceUrl` default, `lib/llm/openrouter.mjs:21` + `test/llm-openrouter.test.mjs:36`, `NOTICE` repo URL → `https://github.com/texas697/mfb-intelligence`.
6. **[rev2]** The rename itself publishes nothing. `docker-publish.yml:4-5` triggers on `push: branches: [main]`, so **merging the step-5 follow-up PR is the event** that first publishes `ghcr.io/texas697/mfb-intelligence` (via `docker-publish.yml:12`, lowercased by `docker/metadata-action@v5`). Verify package visibility (new packages default private unless linked to the repo). `ghcr.io/texas697/crucix` (tags `latest`, `12e8826`) is orphaned, not moved.
7. Run one `deploy.yml` dispatch to prove WIF auth still works under the new name; then tighten:
```
gcloud iam workload-identity-pools providers update-oidc github --location global \
  --workload-identity-pool github --project crucix-intel-41718 \
  --attribute-condition "assertion.repository == 'texas697/mfb-intelligence'"
gcloud iam service-accounts remove-iam-policy-binding crucix-deploy@crucix-intel-41718.iam.gserviceaccount.com \
  --project crucix-intel-41718 --role roles/iam.workloadIdentityUser \
  --member 'principalSet://iam.googleapis.com/projects/640576902539/locations/global/workloadIdentityPools/github/attribute.repository/texas697/Crucix'
```
   GitHub variables (`GCP_PROJECT`, `GCP_DEPLOY_SERVICE_ACCOUNT`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, relay URLs, `FEEDBACK_ADMIN_EMAILS`), the `production` environment and its reviewer survive the rename unchanged.
8. Local (last, after every open terminal/session is closed):
```
cd /home/rsanchez/Development/texas697 && docker compose -f crucix/docker-compose.yml down --remove-orphans
mv crucix mfb-intelligence
cp -r ~/.claude/projects/-home-rsanchez-Development-texas697-crucix ~/.claude/projects/-home-rsanchez-Development-texas697-mfb-intelligence   # optional, carries Claude Code memory
```
   `~/.claude.json` references the old path twice; edit by hand or leave (a fresh project context is created). No `.vscode`/`.idea`/workspace files exist. Compose project/container names change with the directory; `./runs` bind mount is unaffected.

### Phase F — Cleanup after bake period (≥ 30 days and ≥ 1 successful sweep per environment)

| Item | Action |
|---|---|
| `dashboard/inject.mjs` `runMeta()` `?? data.crucix` and `apis/save-briefing.mjs:16` | remove the `crucix` branch (keep the `inject.mjs:150` archive fallback permanently, or delete any `runs/briefing_*.json` archives on the bucket — none exist today) |
| `lib/i18n.mjs:25`, `server.mjs:824` old-name fallbacks | remove; drop the matching tokens from the script's exclusion list |
| Storage read-fallbacks (if added) | remove |
| `scripts/rename-brand.sh` | keep (re-apply to upstream cherry-picks: `git merge --no-commit upstream-sync && scripts/rename-brand.sh && git commit`) |
| GHCR `ghcr.io/texas697/crucix` | `gh api -X DELETE /user/packages/container/crucix` (or keep as a frozen alias) |
| Old scheduler jobs (D1) / old service + authorized domains (D2) | delete as listed in D1/D2 |
| Artifact Registry | `gcloud artifacts docker images list us-central1-docker.pkg.dev/crucix-intel-41718/cloud-run-source-deploy/crucix` and delete stale images |
| Local branches | **[rev2]** delete `master`, consumed `pr*` branches, and `docs/readme-rewrite` / `ui/dashboard-redesign` once merged or abandoned |
| Optional hygiene | branch protection on `main` requiring CI; `.github/dependabot.yml` |

---

## 4. Verification checklist per phase

Static checks (every PR):
```
git ls-files '*.mjs' | xargs -n1 node --check
npm ci && npm test
```
Leftover grep (expected residuals are exactly the §2d keep-list; **[rev2]** same token/phrase list the script excludes):
```
grep -rIn -i 'crucix' . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=runs --exclude=LICENSE --exclude='*.png' --exclude='*.mp4' \
 | grep -vE 'crucix-intel-41718|calesthio/Crucix|crucix\.live|crucix-run|crucix-deploy|crucix-sweep|crucix-digest|crucix-web|crucix-qa65slel7a|crucix-640576902539|CRUCIX_API_BASE_URL|data\.crucix|prior\.crucix|CRUCIX_LANG|CRUCIX_OPEN_BROWSER|built on the open-source Crucix|Crucix engine|Crucix contributors|A previous Crucix instance|Crucix \(AGPL'
```
Must return nothing after PR-4; the excluded patterns shrink in Phase F (`data.crucix`, `CRUCIX_*` fallbacks disappear) and after Phase E (`crucix-sweep/-digest` if D1).

**[rev2] Shim-survival gate (PR-2, blocking)**: `grep -c 'data\.crucix' dashboard/inject.mjs` ≥ 1; `grep -c 'prior\.crucix' dashboard/inject.mjs` = 1; `grep -c 'CRUCIX_LANG' lib/i18n.mjs` = 1; `grep -c 'CRUCIX_OPEN_BROWSER' server.mjs` = 1; `grep -c 'calesthio/Crucix' dashboard/auth/login.html README.md` ≥ 1 each. Any 0 means the script clobbered a compat line — do not merge.

**Phase A**: `npm test` incl. new `runMeta` unit test; `node -e "import('./dashboard/inject.mjs').then(m=>console.log(m.runMeta(JSON.parse(require('fs').readFileSync('runs/latest.json','utf8'))).timestamp))"` prints a timestamp from the current `crucix`-keyed file; after deploy: `/api/status` 200 (not 503 `'stale'`), `/api/health` `sourcesOk` > 0, dashboard renders, login via Hosting URL works, `MFBI_LANG`/`CRUCIX_LANG` both honoured locally; `deploy.yml` still authenticates (WIF widened, old name still valid); `crucix-sweep` last-attempt status is OK after the deploy-triggered run.

**Phase B**: `node --check` on all `.mjs` (catches a missed import of the renamed config); `npm test` (UA/X-Title/Referer assertions); **[rev2]** `npm run brief:save` (not `npm run sweep`, which only prints JSON) writes `runs/latest.json` with top-level `meta` and `meta.version === '2.0.0'`; alternatively `npm start` and wait for the first sweep; `node diag.mjs` loads `./mfb-intelligence.config.mjs`; `/api/locales` with `MFBI_LANG=fr` shows no `CRUCIX` strings; browser: light theme persists across jarvis/loading/digest/media after one toggle, region persists, no theme flash; **[rev2]** dismiss the BYOK banner (`jarvis.html:887-894`, `innerHTML` template) and confirm it stays hidden for the session and reappears in a new tab; Google sign-in redirect completes and shows "Finishing Google sign-in…"; `docker compose up mfb-intelligence` boots; git: `git log --follow mfb-intelligence.config.mjs` shows history; `git blame` ignores 2b via `.git-blame-ignore-revs`; shim-survival gate above passes; `docker build .` then `docker run --rm <img> ls scripts` does not list `rename-brand.sh`.

**Phase C**: markdown link check on `README.md`, `NOTICE`; `/login`, `/mfb-think-tank`, `/support`, `/privacy`, `/terms` render the attribution + source links; `SECURITY.md:7` and `config.yml:4` agree; `gh api repos/<repo>/codeowners/errors` returns no errors after Phase E; `grep -n crucix docs/CLOUD_RUN.md` shows only the deliberately-kept resource names.

**Phase D**: deploy succeeds; the deploy-triggered sweep (`cloudrun.sh:179`) rewrites `gs://crucix-intel-41718-runs/latest.json` with `meta` (verify, do not assume — the trigger is silent on failure); `/api/status` stays 200 through the deploy (no `'stale'` page); scheduler jobs show last-run success; `gcloud run services logs tail crucix --region us-central1` shows `[MFBI]` prefixes; ReliefWeb source no longer logs `rwError` **and `hdxDatasets` is non-empty** once the registered appname is set (today both are empty); relays answer `/status` with the new UA; manual smoke: web login + session persistence across a reload (cookie `__session` untouched), mobile app signin/refresh/feedback via `https://crucix-qa65slel7a-uc.a.run.app/api/auth/*` (unchanged URL), digest page, media page.

**Phase E**: `git fetch origin` after `set-url` works; `deploy.yml` dispatch authenticates after tightening WIF; GHCR new package visible after the first post-rename push to `main`; old URL `https://github.com/texas697/Crucix` redirects; `npm test` passes in the moved directory; `docker compose ps` shows `mfb-intelligence-mfb-intelligence-1`.

**Phase F**: `npm test` after removing shims; grep command above with the fallback exclusions removed returns nothing; one full sweep + digest cycle green.

---

## 5. Rollback notes per phase

- **A**: revert PR-1 and redeploy; readers return to `data.crucix` only, and `latest.json` still has the old key (writer unchanged), so reverting PR-1 itself opens no window. **[rev2]** Generally: a cold-start window exists whenever the running code reads only one key and `latest.json` carries the other — that is why PR-1 must be deployed and verified before PR-2, and why the shim-survival gate is blocking. WIF widening is additive; leaving it is harmless.
- **B**: revert PR-2/3/5 to PR-1 and redeploy. PR-1 reads both keys, so a `meta`-keyed `latest.json` written by PR-2 is still loaded. If you must roll back *below* PR-1, expect one cold-start window (dashboard reload loop, `/api/status` 503 — or, with A2.7, the clean "first sweep required" branch) until the deploy-triggered sweep at `cloudrun.sh:179` completes; verify it ran, and run `gcloud scheduler jobs run crucix-sweep ...` by hand if not. Browser prefs: users who toggled under `mfbi_*` lose that pref once (cosmetic). Lockfile: reverting PR-5 restores the matching lock.
- **C**: docs-only; `git revert`. The `NOTICE`/footer additions are safe to leave.
- **D0**: redeploy the previous revision `gcloud run services update-traffic crucix --to-revisions=<prev>=100 --region us-central1` or re-dispatch `deploy.yml` from the previous SHA; display-name changes are cosmetic and reversible; relays: redeploy previous script. **D1**: resume paused jobs (`gcloud scheduler jobs resume crucix-sweep ...`) before deleting new ones. **D2**: revert `firebase.json:7` to `"crucix"` and `firebase deploy --only hosting`; the old service keeps running until step 5, which is the point of no return (recreating requires a full deploy and a new URL).
- **E**: `gh repo rename Crucix -R texas697/mfb-intelligence` restores the old name (redirects now go the other way); `git remote set-url` back; WIF condition widened again before renaming back. Local `mv` back; Claude memory dir copy is additive.
- **F**: shims are only removed after bake; if an old-key archive surfaces, re-add the one-line fallback.

---

## 6. Open questions / not verifiable from the repo

1. **Display name (D2)**: confirm `MFB Services Intelligence` stays the UI brand so no asset re-export is needed; if `MFB Intelligence`, add the asset list from D2(b) to PR-4.
2. **Mobile base URL migration**: the apps reportedly hard-code the `crucix-qa65slel7a-uc.a.run.app` host via `CRUCIX_API_BASE_URL` (paths cited in D8 are outside this repo and unverified here — please confirm). Is there a plan/date to ship builds pointing at `mfbintelligence.com`? That gates D2 entirely. Does the app embed any dashboard page in a WebView (affects whether storage keys matter to it)?
3. **ReliefWeb**: has MFB registered an appname? Both the ReliefWeb call and the HDX fallback are currently empty (HTTP 406 bot block from HDX, `hdxDatasets: []`); the live blocker may be the UA, not the appname.
4. **`[Crucix]` log filters**: any Cloud Logging metrics/alert policies on the prefix? Not visible in the repo.
5. **Uptime checks**: anything polling `/api/status` or `/health` that would page during a cold-start window?
6. **Security contact**: which mailbox is actually monitored (`rsanchezdev697@gmail.com` is the committed default in `crucix.config.mjs:27`; `SITE_CONTACT_EMAIL` may override at deploy time)? Keep upstream as secondary for engine-level vulns?
7. **CONTRIBUTING.md intent**: accept outside contributions on the fork, or redirect engine changes upstream?
8. **Upstream liveness**: last push 2026-05-20; if treated as dead, skip `upstream-sync` and vendor.
9. **Stale assets**: delete `docs/boot.png`, `dashboard.png`, `globe.png`, `map.png` and `docs/media/mfb-services-demo.mp4`, or re-capture/relink?
10. **Source-count inconsistency** (27/28/29/25 vs 30 wired sources): fix in PR-5 or separately?
11. **`CRUCIX_LANG` / `CRUCIX_OPEN_BROWSER`** set anywhere outside the repo (operator shells, `deploy/extra-env.yaml`)? None found in the repo or generated `deploy/env.yaml`.
12. **External readers of `latest.json`** on the bucket (BI, scripts, other repos) depending on the `crucix` key? None known; if any exist, extend the compat window.
13. **GitHub wiki**: any Crucix-branded pages?
14. **`crucix_byok_prompted`**: migrate silently (fallback read) or deliberately re-show the BYOK prompt once post-rebrand?
15. **Custom domain**: is `mfbintelligence.com` meant to become the front door (it is already a Firebase Auth authorized domain)? If yes, bundle the `server.mjs:190` / `jarvis.html:2853` regex changes and `PUBLIC_URL` into D2 and update `docs/CLOUD_RUN.md:129-130` (currently documents the Cloud Run domain-mapping route).
16. **[rev2] `docs/readme-rewrite` and `ui/dashboard-redesign` branches**: merge before the rename, or abandon?

---

## Appendix — Critic points rejected (or accepted only in part)

All critic points were verified against the files; every substantive one was accepted. Two were accepted only in part:

- **"Phase A rollback note says 'there is no window' — there is one."** Partly rejected. For the action the note describes (reverting PR-1 itself, with the writer at `apis/briefing.mjs:126` still emitting `crucix`), there is genuinely no window: `latest.json` keeps the old key and the reverted readers read the old key. The critic's window is the PR-2 cold-start case, which the Phase B rollback note already covered. Accepted the general principle (now stated in §5 A) and made A2.7 required, with the caveat that A2.7 does not shorten the window under `SWEEP_MODE=external` (`server.mjs:845`) — it only converts a meta-less payload into the documented "first sweep required" branch at `server.mjs:839-840`.
- **"Phase E step 6 should say the first publish happens on the next push to main, not on the rename."** Accepted, but rev. 1 already said "First push to `main` publishes…"; rev. 2 makes explicit that the step-5 follow-up PR merge is that push (`docker-publish.yml:4-5`).

Minor corrections accepted without argument: `README.md:8` is the AGPL badge (dropped from the keep-list); `apis/briefing.mjs:71` not `:70`; `deploy.yml:33-41` not `:34-43`; `CODEOWNERS:1` is `* @calesthio`; `npm run sweep` never writes `runs/latest.json` (verified: `apis/briefing.mjs` tail only `console.log(JSON.stringify(data, null, 2))`; writers are `server.mjs:707` and `apis/save-briefing.mjs:18`); `cloudrun.sh:179` already triggers the sweep post-deploy (`|| true`, silent); ReliefWeb is empty not degraded (`runs/latest.json:264-269`, `hdxDatasets: []`); `synthesize()` does network I/O (`inject.mjs:733` → `fetchRSS` `:166-168`) so the unit test targets a new pure `runMeta()`; `scripts/` already holds `scripts/clean.mjs` and `Dockerfile:10` `COPY . .` ships it (`.dockerignore` lacks `scripts`); `lib/digest/research.mjs:42` `MFBIntel/1.0 (research)` third UA token; `docs/readme-rewrite` / `ui/dashboard-redesign` branches; `docs/CLOUD_RUN.md:8,42,60,123,125,129` would be clobbered by a token-only exclusion list; `version` bump dropped.