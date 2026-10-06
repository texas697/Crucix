// Fetch a publisher page and pull out the readable article body. Pure Node, no DOM library:
// strip chrome, prefer <article>, fall back to the paragraphs of the densest container.
import { decodeEntities, stripTags } from './rss.mjs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const MAX_BYTES = 3 * 1024 * 1024;
const BOILERPLATE = /\b(cookie|cookies|subscribe|subscription|sign up|sign in|log in|newsletter|all rights reserved|privacy policy|terms of (use|service)|advertisement|read more:|related:|share this|follow us)\b/i;

export async function fetchHtml(url, { timeout = 12000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow', headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.8' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get('content-type') || '';
    if (!/html|xml|text/i.test(ct)) throw new Error(`not html (${ct})`);
    const reader = res.body.getReader();
    const chunks = []; let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); total += value.length;
      if (total > MAX_BYTES) { controller.abort(); break; }
    }
    return { html: Buffer.concat(chunks).toString('utf8'), finalUrl: res.url || url };
  } finally { clearTimeout(timer); }
}

function meta(html, names) {
  for (const n of names) {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]+content=["']([^"']*)["']`, 'i');
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${n}["']`, 'i');
    const m = html.match(re) || html.match(re2);
    if (m && m[1]) return decodeEntities(m[1]).trim();
  }
  return '';
}

function paragraphsOf(fragment) {
  const ps = [];
  const re = /<(p|h2|h3|li|blockquote)[\s>][\s\S]*?<\/\1>/gi;
  let m;
  while ((m = re.exec(fragment))) {
    const t = stripTags(m[0]);
    if (t.length < 40 && !/^<h[23]/i.test(m[0])) continue;
    if (BOILERPLATE.test(t) && t.length < 160) continue;
    ps.push(/^<h[23]/i.test(m[0]) ? `## ${t}` : t);
  }
  return ps;
}

export function extractArticle(html, url) {
  let h = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|svg|iframe|form|nav|header|footer|aside|figure|button)[\s>][\s\S]*?<\/\1>/gi, ' ');
  const title = meta(h, ['og:title', 'twitter:title']) || stripTags((h.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
  const description = meta(h, ['og:description', 'description', 'twitter:description']);
  const publishedAt = meta(h, ['article:published_time', 'og:published_time', 'datePublished', 'pubdate', 'date']);
  const author = meta(h, ['author', 'article:author', 'byl']);
  const image = meta(h, ['og:image', 'twitter:image']);

  let paras = [];
  const article = h.match(/<article[\s>][\s\S]*?<\/article>/i);
  if (article) paras = paragraphsOf(article[0]);
  if (paras.join(' ').length < 600) {
    // densest container: split on block containers and keep the one with the most paragraph text
    const candidates = h.split(/<\/(?:div|section|main)>/i);
    let best = [];
    for (const c of candidates) {
      const ps = paragraphsOf(c);
      const len = ps.join(' ').length;
      if (len > best.join(' ').length) best = ps;
    }
    if (best.join(' ').length > paras.join(' ').length) paras = best;
  }
  // de-dup consecutive duplicates (nested containers)
  const seen = new Set(); const out = [];
  for (const p of paras) { if (seen.has(p)) continue; seen.add(p); out.push(p); }
  const text = out.join('\n\n').slice(0, 24000);
  return { title, description, publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null, author, image, text, paragraphs: out.length };
}

export async function extractFromUrl(url) {
  const { html, finalUrl } = await fetchHtml(url);
  const a = extractArticle(html, finalUrl);
  return { ...a, finalUrl };
}
