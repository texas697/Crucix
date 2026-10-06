// Readers Digest façade used by server.mjs
import { createStore, articleId } from './store.mjs';
import { runIngest, buildArticle } from './ingest.mjs';
import { runResearch } from './research.mjs';
import { orderForUser, tasteSummary, MIN_VOTES_FOR_AFFINITY } from './prefs.mjs';
import { llmSummarize } from './summarize.mjs';
import { SOURCES, SOURCE_BY_KEY } from './sources.mjs';

export function createDigest({ db, authEnabled, operatorProvider = null, log = console }) {
  const store = createStore({ db, authEnabled });
  const researchJobs = new Map();   // `${uid}|${id}` -> Promise
  const openJobs = new Map();       // id -> Promise (dashboard on-demand ingest)
  let ingestJob = null;

  function card(a, vote) {
    return {
      id: a.id, url: a.url, title: a.title, source: a.source, sourceKey: a.sourceKey, kind: a.kind,
      publishedAt: a.publishedAt, fetchedAt: a.fetchedAt, description: a.description, image: a.image,
      topics: a.topics || [], hasWriteup: a.summarizedBy != null, vote: vote?.rating || 0,
    };
  }

  async function list({ uid, filter = 'all', q = '', topic = '', limit = 120 } = {}) {
    let items = store.all();
    if (filter === 'thinktank' || filter === 'news') items = items.filter(a => a.kind === filter);
    if (topic) items = items.filter(a => (a.topics || []).includes(topic));
    if (q) {
      const needle = q.toLowerCase();
      items = items.filter(a => `${a.title} ${a.description} ${a.source} ${(a.topics || []).join(' ')} ${a.summaryMd || ''}`.toLowerCase().includes(needle));
    }
    const votes = uid ? await store.listVotes(uid) : [];
    const voteMap = new Map(votes.map(v => [v.id, v]));
    if (filter === 'foryou') {
      items = items.filter(a => !voteMap.has(a.id) || voteMap.get(a.id).rating > 0);
    }
    const { ordered, mode, total } = (filter === 'foryou' || filter === 'all') ? orderForUser(items, votes) : { ordered: items, mode: 'chrono', total: votes.length };
    const topicCounts = new Map();
    for (const a of store.all()) for (const t of a.topics || []) topicCounts.set(t, (topicCounts.get(t) || 0) + 1);
    const topics = [...topicCounts.entries()].sort((x, y) => y[1] - x[1]).slice(0, 24).map(([t, n]) => ({ topic: t, count: n }));
    return {
      items: ordered.slice(0, limit).map(a => card(a, voteMap.get(a.id))),
      total: ordered.length, mode, votes: total, minVotesForAffinity: MIN_VOTES_FOR_AFFINITY,
      topics, taste: tasteSummary(votes), sources: SOURCES.map(s => ({ key: s.key, name: s.name, kind: s.kind })),
      storeSize: store.size(),
    };
  }

  async function getFull(id, uid) {
    const a = await store.get(id);
    if (!a) return null;
    const votes = uid ? await store.listVotes(uid) : [];
    const v = votes.find(x => x.id === id);
    const research = uid ? await store.getResearch(uid, id) : null;
    return { ...card(a, v), summaryMd: a.summaryMd, summarizedBy: a.summarizedBy, summaryModel: a.summaryModel, author: a.author, extracted: a.extracted, textPreview: (a.text || '').slice(0, 1200), research: research ? { state: research.state, stage: research.stage, progress: research.progress, error: research.error, markdown: research.markdown || null, sources: research.sources || [], model: research.model || null, completedAt: research.completedAt || null } : null };
  }

  /** Dashboard click: make sure the article exists (extract on demand), then return it. */
  async function openByUrl({ url, title, source }, { provider } = {}) {
    const id = articleId(url);
    const existing = await store.get(id);
    if (existing) return existing;
    if (openJobs.has(id)) return openJobs.get(id);
    const job = (async () => {
      const item = { url, title: title || '', source: source || (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'web'; } })(), kind: 'news', publishedAt: null, description: '' };
      const a = await buildArticle(item, { provider: provider || operatorProvider, log });
      a.origin = 'dashboard';
      await store.put(a);
      return a;
    })().finally(() => openJobs.delete(id));
    openJobs.set(id, job);
    return job;
  }

  async function summarize(id, provider, who = 'user') {
    const a = await store.get(id);
    if (!a) throw Object.assign(new Error('Article not found'), { status: 404 });
    if (!provider?.isConfigured) throw Object.assign(new Error('No LLM configured — add your API key in settings'), { status: 400 });
    if (!a.text || a.text.length < 300) throw Object.assign(new Error('Could not read enough of this article to summarize it (paywall or bot wall). Open the original instead.'), { status: 422 });
    const r = await llmSummarize(provider, a);
    await store.patch(id, { summaryMd: r.summaryMd, topics: r.topics, summarizedBy: who, summaryModel: `${provider.name}/${provider.model || ''}` });
    return store.get(id);
  }

  async function vote(uid, id, rating) {
    const a = await store.get(id);
    if (!a) throw Object.assign(new Error('Article not found'), { status: 404 });
    const votes = await store.listVotes(uid);
    const cur = votes.find(v => v.id === id);
    if (!rating || (cur && cur.rating === rating)) { await store.clearVote(uid, id); return { rating: 0 }; }
    await store.setVote(uid, id, rating, a.topics || []);
    return { rating };
  }

  function startResearch(uid, id, provider) {
    const key = `${uid}|${id}`;
    if (researchJobs.has(key)) return researchJobs.get(key);
    const job = (async () => {
      const article = await store.get(id);
      if (!article) throw Object.assign(new Error('Article not found'), { status: 404 });
      if (!provider?.isConfigured) throw Object.assign(new Error('No LLM configured — add your API key in settings'), { status: 400 });
      try { await runResearch({ article, provider, store, uid, log }); }
      catch (err) { await store.setResearch(uid, id, { state: 'error', stage: 'error', error: err.message }); throw err; }
    })().finally(() => researchJobs.delete(key));
    researchJobs.set(key, job);
    job.catch(() => {});
    return job;
  }

  async function ingest(opts = {}) {
    if (ingestJob) return { status: 'already-running' };
    ingestJob = runIngest(store, { provider: operatorProvider, log, ...opts }).finally(() => { ingestJob = null; });
    return ingestJob;
  }

  return { init: () => store.init(), list, getFull, openByUrl, summarize, vote, startResearch, ingest, store, articleId, SOURCES, SOURCE_BY_KEY, isIngesting: () => !!ingestJob };
}
