# Running Crucix in the cloud (Google Cloud Run + Firebase)

This fork runs 100% in the cloud: Cloud Run hosts the Node server, Cloud Scheduler
drives the 15-minute sweeps, a Cloud Storage volume keeps sweep history across restarts,
Firebase Auth gates every page, and Firestore stores each user's encrypted LLM key (BYOK).

```
Browser ──► Cloud Run (crucix, 1 always-on instance)
              ├─ /login            Firebase Web SDK → /api/session → httpOnly cookie
              ├─ /, /api/*, /events   require the cookie (firebase-admin verifies it)
              ├─ /api/me/llm       per-user provider/key/model, AES-256-GCM in Firestore
              ├─ /api/ideas        generates ideas with THAT user's key
              └─ /api/internal/sweep  ◄── Cloud Scheduler every 15 min (X-Sweep-Token)
            /data/runs ── Cloud Storage bucket (latest.json, delta memory)
```

## One-time setup

```bash
PROJECT=my-crucix
gcloud projects create $PROJECT --name Crucix
gcloud billing projects link $PROJECT --billing-account=XXXXXX-XXXXXX-XXXXXX
gcloud config set project $PROJECT
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  firestore.googleapis.com identitytoolkit.googleapis.com secretmanager.googleapis.com \
  firebase.googleapis.com storage.googleapis.com cloudscheduler.googleapis.com

firebase projects:addfirebase $PROJECT
firebase apps:create web crucix-web --project $PROJECT
gcloud firestore databases create --location=nam5

# Enable email/password sign-in (or click it in the Firebase console → Authentication)
TOKEN=$(gcloud auth print-access-token)
curl -s -X POST "https://identitytoolkit.googleapis.com/v2/projects/$PROJECT/identityPlatform:initializeAuth" \
  -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: $PROJECT" -d '{}'
curl -s -X PATCH "https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT/config?updateMask=signIn.email.enabled,signIn.email.passwordRequired" \
  -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: $PROJECT" -H "Content-Type: application/json" \
  -d '{"signIn":{"email":{"enabled":true,"passwordRequired":true}}}'

# State bucket + runtime service account
gcloud storage buckets create gs://$PROJECT-runs --location=us-central1 --uniform-bucket-level-access
gcloud iam service-accounts create crucix-run --display-name "Crucix Cloud Run"
SA=crucix-run@$PROJECT.iam.gserviceaccount.com
for r in roles/datastore.user roles/firebaseauth.admin roles/secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding $PROJECT --member=serviceAccount:$SA --role=$r; done
gcloud storage buckets add-iam-policy-binding gs://$PROJECT-runs --member=serviceAccount:$SA --role=roles/storage.objectAdmin

# Secrets
openssl rand -hex 32 | gcloud secrets create BYOK_ENCRYPTION_KEY --data-file=-
openssl rand -hex 24 | gcloud secrets create SWEEP_TRIGGER_TOKEN --data-file=-
```

## Deploy / redeploy

```bash
PROJECT=my-crucix ./deploy/cloudrun.sh
```

The script builds the image with Cloud Build, deploys with the env below, creates or updates the
`crucix-sweep` scheduler job, and adds the service hostname to Firebase's authorized domains.
Optional operator keys (FRED, FIRMS, a server-wide `LLM_API_KEY` for Telegram alerts, …) go in
`deploy/extra-env.yaml` (gitignored, `KEY: "value"` per line) and are merged in.

Useful overrides: `AUTH_ALLOWED_EMAILS=a@x.com,b@y.com` (lock the app to specific people),
`AUTH_ALLOW_SIGNUP=false` (invite-only: create users in the Firebase console),
`REFRESH_MINUTES=10`, `REGION`, `SERVICE`.

## How the pieces fit

| Concern | Setting | Notes |
|---|---|---|
| Login | `AUTH_MODE=firebase`, `FIREBASE_WEB_CONFIG` | Session cookie `crucix_session`, 14 days (`AUTH_SESSION_DAYS`). `AUTH_MODE=off` only for a private laptop. |
| BYOK | `BYOK_ENCRYPTION_KEY` (Secret Manager) | Rotating this key invalidates every stored user key; users just re-enter theirs. |
| Sweeps | `SWEEP_MODE=external`, `SWEEP_TRIGGER_TOKEN` | Cloud Run throttles CPU outside requests, so the scheduler's request *is* the sweep; there is no startup sweep in this mode (the deploy script fires one). Telegram/Discord bots need `internal` mode + `--no-cpu-throttling` (≈5× the cost). |
| State | `RUNS_DIR=/data/runs` | Cloud Storage FUSE volume. Delta memory and `latest.json` survive redeploys. |
| Health | `/api/healthz` (public) | `/api/health` with full detail requires login. Google's front end swallows a bare `/healthz`, hence the prefix. |

## Cost (approximate, us-central1)

One always-on instance with CPU throttling: ≈ $7–10/month idle + a few dollars of request time for
sweeps and open dashboards. Firestore, Firebase Auth, Secret Manager and the bucket sit inside free tiers
at personal scale. Users pay their own LLM provider through BYOK.

## Operations

```bash
gcloud run services logs tail crucix --region us-central1          # live logs
gcloud scheduler jobs run crucix-sweep --location us-central1       # force a sweep now
gcloud run services update crucix --region us-central1 --update-env-vars AUTH_ALLOW_SIGNUP=false
firebase auth:export users.json --project $PROJECT                   # list accounts
```

Custom domain: `gcloud run domain-mappings create --service crucix --domain intel.example.com`,
then redeploy with `PUBLIC_URL=https://intel.example.com` so Firebase authorizes it.

## Other hosts

The Dockerfile is host-agnostic. Fly.io / Railway / Render work with `SWEEP_MODE=internal`
(they don't throttle CPU), a persistent disk mounted at `/data/runs`, and the same Firebase env.
Vercel/Netlify/Firebase Hosting cannot run it: Crucix needs a long-lived process and SSE.
