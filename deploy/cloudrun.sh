#!/usr/bin/env bash
# Deploy Crucix to Google Cloud Run (always-on single instance, Cloud Storage volume for state,
# Cloud Scheduler for sweeps, Firebase Auth + Firestore for login/BYOK).
#
# One-time setup this script expects (see docs/CLOUD_RUN.md):
#   - APIs enabled: run, cloudbuild, artifactregistry, firestore, identitytoolkit, secretmanager, cloudscheduler
#   - Firestore database created; Firebase Auth email/password enabled; a Firebase web app created
#   - Secrets BYOK_ENCRYPTION_KEY and SWEEP_TRIGGER_TOKEN in Secret Manager
#   - Service account $SERVICE_ACCOUNT with datastore.user, firebaseauth.admin, secretmanager.secretAccessor,
#     and storage.objectAdmin on $BUCKET
set -euo pipefail

PROJECT="${PROJECT:-crucix-intel-41718}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-crucix}"
BUCKET="${BUCKET:-${PROJECT}-runs}"
SERVICE_ACCOUNT="${SERVICE_ACCOUNT:-crucix-run@${PROJECT}.iam.gserviceaccount.com}"
REFRESH_MINUTES="${REFRESH_MINUTES:-15}"
ALLOWED_EMAILS="${AUTH_ALLOWED_EMAILS:-}"
ALLOW_SIGNUP="${AUTH_ALLOW_SIGNUP:-true}"

cd "$(dirname "$0")/.."

echo "▶ Fetching Firebase web config for $PROJECT"
WEB_CONFIG="$(firebase apps:sdkconfig web --project "$PROJECT" 2>/dev/null | sed -n '/{/,/}/p' | tr -d '\n' | sed 's/  */ /g')"
[ -n "$WEB_CONFIG" ] || { echo "No Firebase web app found. Run: firebase apps:create web crucix-web --project $PROJECT"; exit 1; }

mkdir -p deploy
cat > deploy/env.yaml <<YAML
AUTH_MODE: "firebase"
FIREBASE_WEB_CONFIG: '$WEB_CONFIG'
AUTH_ALLOWED_EMAILS: "$ALLOWED_EMAILS"
AUTH_ALLOW_SIGNUP: "$ALLOW_SIGNUP"
RUNS_DIR: "/data/runs"
SWEEP_MODE: "external"
REFRESH_INTERVAL_MINUTES: "$REFRESH_MINUTES"
PUBLIC_URL: "${PUBLIC_URL:-https://${PROJECT}.firebaseapp.com}"
NODE_ENV: "production"
YAML
# Optional operator keys: anything in deploy/extra-env.yaml (gitignored) is merged in
if [ -f deploy/extra-env.yaml ]; then tail -n +1 deploy/extra-env.yaml >> deploy/env.yaml; fi

echo "▶ Deploying $SERVICE to Cloud Run ($REGION)"
gcloud run deploy "$SERVICE" \
  --project "$PROJECT" --region "$REGION" \
  --source . \
  --service-account "$SERVICE_ACCOUNT" \
  --allow-unauthenticated \
  --min-instances 1 --max-instances 1 --concurrency 80 \
  --cpu 1 --memory 1Gi --timeout 3600 \
  --session-affinity \
  --env-vars-file deploy/env.yaml \
  --set-secrets "BYOK_ENCRYPTION_KEY=BYOK_ENCRYPTION_KEY:latest,SWEEP_TRIGGER_TOKEN=SWEEP_TRIGGER_TOKEN:latest" \
  --add-volume "name=runs,type=cloud-storage,bucket=$BUCKET" \
  --add-volume-mount "volume=runs,mount-path=/data/runs" \
  --quiet

URL="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format 'value(status.url)')"
echo "▶ Service URL: $URL"

echo "▶ Ensuring Cloud Scheduler sweep job (every $REFRESH_MINUTES min)"
TOKEN="$(gcloud secrets versions access latest --secret SWEEP_TRIGGER_TOKEN --project "$PROJECT")"
SCHEDULE="*/$REFRESH_MINUTES * * * *"
if gcloud scheduler jobs describe crucix-sweep --project "$PROJECT" --location "$REGION" >/dev/null 2>&1; then
  gcloud scheduler jobs update http crucix-sweep --project "$PROJECT" --location "$REGION" \
    --schedule "$SCHEDULE" --uri "$URL/api/internal/sweep" --http-method POST \
    --update-headers "X-Sweep-Token=$TOKEN" --attempt-deadline 900s --quiet >/dev/null
else
  gcloud scheduler jobs create http crucix-sweep --project "$PROJECT" --location "$REGION" \
    --schedule "$SCHEDULE" --uri "$URL/api/internal/sweep" --http-method POST \
    --headers "X-Sweep-Token=$TOKEN" --attempt-deadline 900s --quiet >/dev/null
fi

echo "▶ Authorizing $URL for Firebase Auth"
HOST="${URL#https://}"
ACCESS="$(gcloud auth print-access-token)"
CUR="$(curl -s "https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT/config" -H "Authorization: Bearer $ACCESS" -H "x-goog-user-project: $PROJECT")"
DOMS="$(printf '%s' "$CUR" | python3 -c 'import json,sys;d=json.load(sys.stdin).get("authorizedDomains",[]);d+=[h for h in sys.argv[1:] if h and h not in d];print(json.dumps(d))' "$HOST" "${PROJECT}.firebaseapp.com" "${PUBLIC_URL:+${PUBLIC_URL#https://}}")"
curl -s -X PATCH "https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT/config?updateMask=authorizedDomains" \
  -H "Authorization: Bearer $ACCESS" -H "x-goog-user-project: $PROJECT" -H "Content-Type: application/json" \
  -d "{\"authorizedDomains\":$DOMS}" >/dev/null

echo "▶ Ensuring Cloud Scheduler digest job (every 30 min)"
if gcloud scheduler jobs describe crucix-digest --project "$PROJECT" --location "$REGION" >/dev/null 2>&1; then
  gcloud scheduler jobs update http crucix-digest --project "$PROJECT" --location "$REGION" \
    --schedule "7,37 * * * *" --uri "$URL/api/internal/digest" --http-method POST \
    --update-headers "X-Sweep-Token=$TOKEN" --attempt-deadline 900s --quiet >/dev/null
else
  gcloud scheduler jobs create http crucix-digest --project "$PROJECT" --location "$REGION" \
    --schedule "7,37 * * * *" --uri "$URL/api/internal/digest" --http-method POST \
    --headers "X-Sweep-Token=$TOKEN" --attempt-deadline 900s --quiet >/dev/null
fi

echo "▶ Kicking off a sweep now (startup sweeps run CPU-throttled; a scheduler-driven one is fast)"
gcloud scheduler jobs run crucix-sweep --project "$PROJECT" --location "$REGION" --quiet >/dev/null 2>&1 || true

echo
echo "✔ Deployed: $URL  (front door: https://${PROJECT}.firebaseapp.com — run: firebase deploy --only hosting)"
echo "  Login:    $URL/login"
echo "  Logs:     gcloud run services logs tail $SERVICE --project $PROJECT --region $REGION"
