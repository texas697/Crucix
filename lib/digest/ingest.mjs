// Pull every source feed, extract new articles, write them up (LLM if available, rules otherwise).
import { SOURCES, isExcluded } from './sources.mjs';
import { fetchFeed } from './rss.mjs';
import { extractFromUrl } from './extract.mjs';
import { articleId } from './store.mjs';
import { llmSummarize, ruleSummary, ruleTopics } from './summarize.mjs';

const MAX_AGE_DAYS = parseInt(process.env.DIGEST_MAX_AGE_DAYS) || 4;
const MAX_PER_RUN = parseInt(process.env.DIGEST_MAX_PER_RUN) || 40;
const MAX_PER_SOURCE = parseInt(process.env.DIGEST_MAX_PER_SOURCE) || 6;
const CONCURRENCY = 4;

async function mapLimit(items, limit, fn) {
  const out = []; let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]); }
  });
  await Promise.all(workers);
  return out;
}

export async function buildArticle(item, { provider, log = console } = {}) {
  const id = articleId(item.url);
  let ex = null;
  try { ex = await extractFromUrl(item.url); }
  catch (err) { log.warn?.(`[Digest] extract failed ${item.source}: ${err.message}`); }
  const article = {
    id, url: ex?.finalUrl || item.url,
    title: (item.title || ex?.title || '').slice(0, 220),
    source: item.source, sourceKey: item.sourceKey || null, kind: item.kind || 'news',
    author: item.author || ex?.author || null,
    image: ex?.image || null,
    publishedAt: item.publishedAt || ex?.publishedAt || null,
    fetchedAt: new Date().toISOString(),
    description: (item.description || ex?.description || '').slice(0, 600),
    text: ex?.text || '',
    paragraphs: ex?.paragraphs || 0,
    extracted: !!(ex && ex.text && ex.text.length > 400),
    summaryMd: null, topics: [], summarizedBy: null, summaryModel: null,
  };
  if (!article.text && article.description) article.text = article.description;
  if (provider?.isConfigured && article.text.length > 300) {
    try {
      const r = await llmSummarize(provider, article);
      article.summaryMd = r.summaryMd; article.topics = r.topics;
      article.summarizedBy = 'operator'; article.summaryModel = `${provider.name}/${provider.model || ''}`;
    } catch (err) { log.warn?.(`[Digest] write-up failed ${item.source}: ${err.message}`); }
  }
  if (!article.topics.length) article.topics = ruleTopics(`${article.title} ${article.description} ${article.text.slice(0, 3000)}`);
  if (!article.summaryMd) article.summaryMd = ruleSummary(article);
  return article;
}

export async function runIngest(store, { provider, log = console, maxPerRun = MAX_PER_RUN } = {}) {
  const started = Date.now();
  const cutoff = Date.now() - MAX_AGE_DAYS * 86400000;
  const stats = { sources: SOURCES.length, feedsOk: 0, feedsFailed: 0, seen: 0, excluded: 0, known: 0, queued: 0, stored: 0, llm: 0, errors: [] };

  const feedResults = await mapLimit(SOURCES, 6, async (src) => {
    try { const items = await fetchFeed(src); stats.feedsOk++; return items; }
    catch (err) { stats.feedsFailed++; stats.errors.push(`${src.key}: ${err.message}`); return []; }
  });

  const candidates = [];
  for (const items of feedResults) {
    let n = 0;
    for (const it of items) {
      stats.seen++;
      if (!it.title || !it.url) continue;
      if (it.publishedAt && new Date(it.publishedAt).getTime() < cutoff) continue;
      if (isExcluded(it)) { stats.excluded++; continue; }
      const id = articleId(it.url);
      if (store.has(id)) { stats.known++; continue; }
      if (n++ >= MAX_PER_SOURCE) break;
      candidates.push(it);
    }
  }
  // newest first, cap per run so a cold start doesn't try to summarize 300 articles
  candidates.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  const batch = candidates.slice(0, maxPerRun);
  stats.queued = batch.length;

  await mapLimit(batch, CONCURRENCY, async (item) => {
    try {
      const a = await buildArticle(item, { provider, log });
      if (!a.title) return;
      await store.put(a);
      stats.stored++; if (a.summarizedBy === 'operator') stats.llm++;
    } catch (err) { stats.errors.push(`${item.source}: ${err.message}`); }
  });
  stats.ms = Date.now() - started;
  log.log?.(`[Digest] ingest: ${stats.stored} stored (${stats.llm} LLM write-ups), ${stats.known} known, ${stats.excluded} excluded, ${stats.feedsFailed} feeds failed, ${stats.ms}ms`);
  return stats;
}
