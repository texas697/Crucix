// Firestore-backed article store with an in-memory cache of the newest articles.
//   digest/{id}                         shared article + write-up
//   users/{uid}/digest_votes/{id}       thumbs (rating ±1, topics snapshot)
//   users/{uid}/digest_research/{id}    "read more about it" deep dive
import { createHash } from 'crypto';

const CACHE_LIMIT = parseInt(process.env.DIGEST_CACHE_LIMIT) || 600;

export function articleId(url) {
  const u = String(url).trim().replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();
  return createHash('sha1').update(u).digest('hex').slice(0, 20);
}

export function createStore({ db, authEnabled }) {
  const cache = new Map();           // id -> article (newest first maintained on read)
  let loaded = false;
  const col = () => db().collection('digest');
  const userCol = (uid, name) => db().collection('users').doc(uid).collection(name);

  function sortDesc(list) {
    return list.sort((a, b) => new Date(b.publishedAt || b.fetchedAt || 0) - new Date(a.publishedAt || a.fetchedAt || 0));
  }
  function trim() {
    if (cache.size <= CACHE_LIMIT) return;
    const all = sortDesc([...cache.values()]);
    cache.clear();
    for (const a of all.slice(0, CACHE_LIMIT)) cache.set(a.id, a);
  }

  async function init() {
    if (loaded || !authEnabled) { loaded = true; return; }
    try {
      const snap = await col().orderBy('fetchedAt', 'desc').limit(CACHE_LIMIT).get();
      for (const d of snap.docs) cache.set(d.id, d.data());
      loaded = true;
      console.log(`[Digest] Loaded ${cache.size} articles from Firestore`);
    } catch (err) {
      console.error('[Digest] Failed to load cache:', err.message);
      loaded = true;
    }
  }

  async function put(article) {
    cache.set(article.id, article);
    trim();
    if (authEnabled) await col().doc(article.id).set(article, { merge: true });
    return article;
  }

  async function patch(id, fields) {
    const cur = cache.get(id);
    if (cur) Object.assign(cur, fields);
    if (authEnabled) await col().doc(id).set(fields, { merge: true });
    return cur;
  }

  async function get(id) {
    if (cache.has(id)) return cache.get(id);
    if (!authEnabled) return null;
    const d = await col().doc(id).get();
    if (!d.exists) return null;
    cache.set(id, d.data());
    return d.data();
  }

  function has(id) { return cache.has(id); }
  function all() { return sortDesc([...cache.values()]); }

  // ── per-user ───────────────────────────────────────────────────────────────
  const localVotes = new Map(), localResearch = new Map(); // AUTH_MODE=off fallback
  async function setVote(uid, id, rating, topics) {
    const rec = { rating, topics: topics || [], ts: Date.now() };
    if (!authEnabled) { localVotes.set(`${uid}|${id}`, rec); return rec; }
    await userCol(uid, 'digest_votes').doc(id).set(rec);
    return rec;
  }
  async function clearVote(uid, id) {
    if (!authEnabled) { localVotes.delete(`${uid}|${id}`); return; }
    await userCol(uid, 'digest_votes').doc(id).delete();
  }
  async function listVotes(uid) {
    if (!authEnabled) return [...localVotes.entries()].filter(([k]) => k.startsWith(`${uid}|`)).map(([k, v]) => ({ id: k.split('|')[1], ...v }));
    const snap = await userCol(uid, 'digest_votes').orderBy('ts', 'desc').limit(1000).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  async function getResearch(uid, id) {
    if (!authEnabled) return localResearch.get(`${uid}|${id}`) || null;
    const d = await userCol(uid, 'digest_research').doc(id).get();
    return d.exists ? d.data() : null;
  }
  async function setResearch(uid, id, fields) {
    const rec = { ...(await getResearch(uid, id) || {}), ...fields, updatedAt: new Date().toISOString() };
    if (!authEnabled) { localResearch.set(`${uid}|${id}`, rec); return rec; }
    await userCol(uid, 'digest_research').doc(id).set(rec, { merge: true });
    return rec;
  }

  return { init, put, patch, get, has, all, setVote, clearVote, listVotes, getResearch, setResearch, size: () => cache.size };
}
