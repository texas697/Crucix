// Preference learning (ported from the Reading Room): thumbs votes → per-topic Beta-prior scores
// → affinity ordering once the user has voted enough to mean something.
const ALPHA = 0.5, BETA = 1.5;
const PRIOR = ALPHA / (ALPHA + BETA);
export const MIN_VOTES_FOR_AFFINITY = 5;

export function topicScores(votes) {
  const up = new Map(), down = new Map();
  for (const v of votes) {
    for (const t of v.topics || []) {
      const w = Number.isFinite(v.weight) && v.weight > 0 ? v.weight : 1;
      if (v.rating > 0) up.set(t, (up.get(t) || 0) + w); else down.set(t, (down.get(t) || 0) + w);
    }
  }
  const scores = new Map(), observations = new Map();
  for (const t of new Set([...up.keys(), ...down.keys()])) {
    const u = up.get(t) || 0, d = down.get(t) || 0;
    observations.set(t, u + d);
    scores.set(t, u + d < 2 ? PRIOR : (u + ALPHA) / (u + d + ALPHA + BETA));
  }
  return { scores, observations };
}

export function articleAffinity(topics, scores) {
  let sum = 0, n = 0;
  for (const t of topics || []) { if (scores.has(t)) { sum += scores.get(t); n++; } }
  return n ? sum / n : PRIOR;
}

/** Order articles: chronological until the user has MIN_VOTES_FOR_AFFINITY votes, then affinity-weighted recency. */
export function orderForUser(articles, votes) {
  const total = votes.length;
  if (total < MIN_VOTES_FOR_AFFINITY) return { ordered: articles, mode: 'chrono', total };
  const { scores } = topicScores(votes);
  const now = Date.now();
  const scored = articles.map(a => {
    const ageH = Math.max(0, (now - new Date(a.publishedAt || a.fetchedAt || now).getTime()) / 3600000);
    const recency = Math.exp(-ageH / 48);          // half-life ~ 33h
    const aff = articleAffinity(a.topics, scores);  // 0..1, prior 0.25
    return { a, s: 0.55 * aff + 0.45 * recency };
  });
  scored.sort((x, y) => y.s - x.s);
  return { ordered: scored.map(x => x.a), mode: 'affinity', total };
}

export function tasteSummary(votes, limit = 8) {
  const { scores, observations } = topicScores(votes);
  const rows = [...scores.entries()].filter(([t]) => (observations.get(t) || 0) >= 2)
    .map(([t, s]) => ({ topic: t, score: +s.toFixed(2), votes: observations.get(t) }));
  rows.sort((a, b) => b.score - a.score);
  return { likes: rows.slice(0, limit), dislikes: rows.slice(-limit).reverse().filter(r => r.score < PRIOR) };
}
