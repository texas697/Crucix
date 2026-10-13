// User feedback store (Firestore). The mobile app POSTs /api/feedback with a description, a snapshot of
// client state and an optional screenshot.
//   feedback/{id}             = { uid, email, category, description, platform, appVersion, page, stateJson, hasScreenshot, createdAt, status }
//   feedback_screenshots/{id} = { uid, contentType, data: Bytes }   (kept apart so listing feedback stays small)
// expireAt drives a Firestore TTL policy (24-month retention promised in the Privacy Policy); enable it once per collection:
//   gcloud firestore fields ttls update expireAt --collection-group=feedback --enable-ttl
//   gcloud firestore fields ttls update expireAt --collection-group=feedback_screenshots --enable-ttl
// stateJson is a string, not a map: client state is arbitrary and would otherwise be indexed field by field.

import { db } from './auth/firebase.mjs';

export const CATEGORIES = ['bug', 'idea', 'data', 'other'];
const MAX_DESCRIPTION = 5000;
const MAX_STATE_JSON = 64 * 1024;
const MAX_SCREENSHOT_BYTES = 900 * 1024; // Firestore caps a document at 1 MiB
const RETENTION_MS = 730 * 24 * 3600 * 1000;
const PER_HOUR = parseInt(process.env.FEEDBACK_PER_HOUR) || 10;

const admins = (process.env.FEEDBACK_ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
export const isFeedbackAdmin = (user) => !!user?.email && admins.includes(user.email.toLowerCase());

const recent = new Map(); // uid -> submit timestamps in the last hour

const bad = (msg) => Object.assign(new Error(msg), { status: 400 });
const str = (v, max) => String(v ?? '').trim().slice(0, max);

function parseScreenshot(input) {
  if (!input) return null;
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(input));
  if (!m) throw bad('screenshot must be a base64 JPEG, PNG or WebP data URL');
  const data = Buffer.from(m[2], 'base64');
  if (data.length > MAX_SCREENSHOT_BYTES) throw Object.assign(new Error(`screenshot too large (max ${Math.round(MAX_SCREENSHOT_BYTES / 1024)} KB)`), { status: 413 });
  return { contentType: m[1], data };
}

export async function submitFeedback(user, body = {}) {
  const now = Date.now();
  const times = (recent.get(user.uid) || []).filter(t => now - t < 3600000);
  if (times.length >= PER_HOUR) throw Object.assign(new Error('Too much feedback in the last hour — please try again later'), { status: 429 });

  const description = str(body.description, MAX_DESCRIPTION);
  if (description.length < 3) throw bad('Please describe the problem or idea');
  const category = CATEGORIES.includes(body.category) ? body.category : 'other';
  let stateJson = null;
  if (body.state != null) {
    stateJson = JSON.stringify(body.state);
    if (stateJson.length > MAX_STATE_JSON) stateJson = stateJson.slice(0, MAX_STATE_JSON) + '…[truncated]';
  }
  const shot = parseScreenshot(body.screenshot);

  const ref = db().collection('feedback').doc();
  const createdAt = new Date().toISOString();
  const expireAt = new Date(now + RETENTION_MS);
  const batch = db().batch();
  batch.set(ref, {
    uid: user.uid, email: user.email || null, category, description,
    platform: str(body.platform, 40) || null, // 'ios' | 'android'
    appVersion: str(body.appVersion, 40) || null,
    page: str(body.page, 500) || null,
    stateJson, hasScreenshot: !!shot, status: 'new', createdAt, expireAt,
  });
  if (shot) batch.set(db().collection('feedback_screenshots').doc(ref.id), { uid: user.uid, contentType: shot.contentType, data: shot.data, createdAt, expireAt });
  await batch.commit();

  times.push(now); recent.set(user.uid, times);
  return { id: ref.id, createdAt };
}

export async function listFeedback({ limit = 100 } = {}) {
  const snap = await db().collection('feedback').orderBy('createdAt', 'desc').limit(limit).get();
  return snap.docs.map(d => {
    const { stateJson, ...rest } = d.data();
    let state = null; try { state = stateJson ? JSON.parse(stateJson) : null; } catch { state = stateJson; }
    return { id: d.id, ...rest, state };
  });
}

export async function getScreenshot(id) {
  const d = await db().collection('feedback_screenshots').doc(id).get();
  return d.exists ? d.data() : null;
}

/** Account deletion: remove everything this user submitted. */
export async function deleteFeedbackForUser(uid) {
  for (const name of ['feedback', 'feedback_screenshots']) {
    const snap = await db().collection(name).where('uid', '==', uid).get();
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = db().batch();
      snap.docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  }
}
