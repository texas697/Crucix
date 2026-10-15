# Staging provisioning runbook

One-time setup for the `crucix-staging` environment the migration plan's gates depend on.
These are the commands **you** run (owner of the cloud account); nothing here is executed by an agent.

Fill in the angle-bracket placeholders. Everything is in the **existing project** by default
(`crucix-intel-41718`), which is what the plan assumes.

```sh
PROJECT=crucix-intel-41718
REGION=us-central1
SA=crucix-run@${PROJECT}.iam.gserviceaccount.com          # existing runtime service account
STAGING_SERVICE=crucix-staging
STAGING_BUCKET=${PROJECT}-staging-runs
STAGING_SITE=crucix-staging                                # Firebase Hosting site id (globally unique)
TEST_EMAIL="staging-tester@your-domain.com"                # replace with a real address you can sign in with
```

> Note: never put bare `<...>` in a shell command — zsh treats it as a redirection. The
> placeholders below are shown as quoted examples for that reason.

---

## 0. Prerequisites

```sh
gcloud auth login
gcloud config set project "$PROJECT"
firebase login
# APIs the script relies on (already enabled for production; harmless if already on):
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  firestore.googleapis.com identitytoolkit.googleapis.com secretmanager.googleapis.com \
  cloudscheduler.googleapis.com --project "$PROJECT"
```

> **Shared-service caveat.** Staging lives in the same GCP project, so it shares **Firestore, Firebase
> Auth and Secret Manager** with production: staging test accounts are real accounts in the same
> Firestore, and it reuses `BYOK_ENCRYPTION_KEY` / `SWEEP_TRIGGER_TOKEN`. That is what the plan
> intends, but treat staging accounts as production accounts. If you want full isolation, use a
> separate project instead and change `PROJECT` throughout.

## 1. Staging state bucket + IAM

Staging sweep history must not mix with production's bucket.

```sh
gcloud storage buckets create "gs://${STAGING_BUCKET}" \
  --project "$PROJECT" --location "$REGION" --uniform-bucket-level-access

gcloud storage buckets add-iam-policy-binding "gs://${STAGING_BUCKET}" \
  --member "serviceAccount:${SA}" --role roles/storage.objectAdmin
```

## 2. Operator LLM key: deliberately NOT created

`deploy/cloudrun.sh` attaches the project's `LLM_API_KEY` secret whenever it exists, so staging would
inherit the **production** operator key. Point staging at a secret name that does not exist instead —
then the script skips the operator LLM entirely and staging users must BYOK:

```sh
# do NOT create LLM_API_KEY_STAGING — its absence is the point:
LLM_SECRET_NAME=LLM_API_KEY_STAGING
```

(If you later want a capped staging key, create that secret with a low-quota key and staging will pick
it up as `LLM_API_KEY` automatically.)

## 3. Deploy the staging service

Run from the repository root of the migration branch. This creates the service, its own bucket mount,
and the **staging-named** scheduler jobs (so production jobs are never repointed):

```sh
cd deploy/..   # repo root
PROJECT="$PROJECT" REGION="$REGION" SERVICE="$STAGING_SERVICE" \
BUCKET="$STAGING_BUCKET" SWEEP_JOB=crucix-staging-sweep DIGEST_JOB=crucix-staging-digest \
LLM_SECRET="$LLM_SECRET_NAME" \
AUTH_ALLOWED_EMAILS="$TEST_EMAIL" AUTH_ALLOW_SIGNUP=false \
PUBLIC_URL=https://${STAGING_SITE}.web.app \
UI_DASHBOARD=legacy UI_DIGEST=legacy UI_MEDIA=legacy UI_LOGIN=legacy UI_SITE=legacy \
bash deploy/cloudrun.sh
```

The script prints the staging service URL and adds it (plus `PUBLIC_URL`) to Firebase Auth's
authorized domains. Capture that URL:

```sh
STAGING_URL=$(gcloud run services describe "$STAGING_SERVICE" --project "$PROJECT" \
  --region "$REGION" --format 'value(status.url)')
echo "$STAGING_URL"
```

## 4. Firebase Hosting staging site + target

Create the second site, then add a staging Hosting config so the site rewrites to the staging
service (this keeps production's `firebase.json` semantics untouched):

```sh
firebase hosting:sites:create "$STAGING_SITE" --project "$PROJECT"
firebase target:apply hosting staging "$STAGING_SITE" --project "$PROJECT"
```

Add `firebase.staging.json` at the repo root (same `public` dir, rewriting to `crucix-staging`):

```json
{
  "hosting": {
    "target": "staging",
    "public": "hosting",
    "ignore": ["**/.*"],
    "cleanUrls": false,
    "rewrites": [{ "source": "**", "run": { "serviceId": "crucix-staging", "region": "us-central1" } }]
  }
}
```

Deploy it (and later, re-deploy after any `firebase.json` change):

```sh
firebase deploy --only hosting:staging --config firebase.staging.json --project "$PROJECT"
```

Add the staging Hosting host to Auth authorized domains too:

```sh
gcloud auth print-access-token >/dev/null   # sanity
ACCESS="$(gcloud auth print-access-token)"
HOST="${STAGING_SITE}.web.app"
CUR="$(curl -s "https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT/config" \
  -H "Authorization: Bearer $ACCESS" -H "x-goog-user-project: $PROJECT")"
DOMS="$(printf '%s' "$CUR" | python3 -c 'import json,sys;d=json.load(sys.stdin).get("authorizedDomains",[]);d+=[h for h in sys.argv[1:] if h and h not in d];print(json.dumps(d))' "$HOST")"
curl -s -X PATCH "https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT/config?updateMask=authorizedDomains" \
  -H "Authorization: Bearer $ACCESS" -H "x-goog-user-project: $PROJECT" -H "Content-Type: application/json" \
  -d "{\"authorizedDomains\":$DOMS}" >/dev/null
```

## 5. GitHub `staging` environment

In **Settings → Environments**, create `staging` with **no required reviewers** (production keeps its
approval), and set these **variables** (Actions → Variables, per environment):

| Variable | Value |
| --- | --- |
| `GCP_PROJECT` | `crucix-intel-41718` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | same as production |
| `GCP_DEPLOY_SERVICE_ACCOUNT` | same as production |
| `SERVICE` | `crucix-staging` |
| `BUCKET` | `crucix-intel-41718-staging-runs` |
| `SWEEP_JOB` | `crucix-staging-sweep` |
| `DIGEST_JOB` | `crucix-staging-digest` |
| `LLM_SECRET` | `LLM_API_KEY_STAGING` |
| `PUBLIC_URL` | `https://crucix-staging.web.app` |
| `REGION` | `us-central1` |
| `UI_DASHBOARD` / `UI_DIGEST` / `UI_MEDIA` / `UI_LOGIN` / `UI_SITE` | `legacy` initially |

Then `deploy.yml` runs against staging with `target: staging` and the `flags-only` job flips flags in
seconds.

## 6. Verify

```sh
curl -s -o /dev/null -w '%{http_code}\n' "$STAGING_URL/api/healthz"     # 200
curl -s -o /dev/null -w '%{http_code}\n' "$STAGING_URL/login"           # 200
# Hosting front door (should rewrite to the staging service):
curl -s -o /dev/null -w '%{http_code}\n' "https://${STAGING_SITE}.web.app/"
```

Expected: staging boots with no operator LLM (BYOK only), `AUTH_MODE=firebase`, only `TEST_EMAIL`
can sign in, and the scheduler jobs `crucix-staging-sweep` / `crucix-staging-digest` point at the
staging URL while `crucix-sweep` / `crucix-digest` still point at production.

## 7. Rollback rehearsal (do this before flipping anything)

With staging up and flags `legacy`:

```sh
# flip one React surface on staging without a rebuild:
gcloud run services update "$STAGING_SERVICE" --project "$PROJECT" --region "$REGION" \
  --update-env-vars UI_DIGEST=react --quiet
# ...verify, then flip it back to legacy the same way and confirm recovery + timing.
```

Record the revision id and recovery time in the release checklist, then set the GitHub env var to
match so the next full deploy agrees.

---

When this is done, tell me the staging URL and I can drive a **read-only** browser session (test
account only) to run the plan's staging gates: map WebGL/canvas, HLS playback, and login
popup/redirect. I will not flip production flags or run a cutover without your explicit go-ahead.
