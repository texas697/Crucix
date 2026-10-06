// LLM write-up + topic tagging for one article, plus a rule-based fallback when no model is available.
const TAXONOMY = {
  geopolitics: /geopolit|diplomac|foreign policy|summit|alliance|nato|united nations|\bun\b/i,
  china: /\bchina|beijing|xi jinping|taiwan|pla\b/i,
  'russia-ukraine': /russia|kremlin|putin|ukrain|kyiv|moscow/i,
  'middle-east': /israel|gaza|iran|tehran|saudi|houthi|yemen|lebanon|hezbollah|hamas|syria|iraq|gulf/i,
  defense: /defen[cs]e|military|pentagon|missile|drone|army|navy|air force|weapon|arms/i,
  energy: /\boil\b|opec|crude|natural gas|lng|pipeline|energy|nuclear power|uranium/i,
  markets: /stocks?|equit|bond|yield|treasur|s&p|nasdaq|dow|wall street|investor|rally|sell-?off/i,
  macro: /inflation|gdp|recession|growth|jobs report|unemployment|consumer|tariff/i,
  'central-banks': /federal reserve|\bfed\b|ecb|boj|bank of england|rate (hike|cut)|interest rate|powell/i,
  trade: /tariff|trade war|export|import|sanction|supply chain|shipping/i,
  sanctions: /sanction|embargo|ofac|export control/i,
  technology: /\btech\b|semiconductor|chip|software|startup|silicon valley|quantum/i,
  ai: /\bai\b|artificial intelligence|llm|openai|anthropic|model|machine learning/i,
  cyber: /cyber|hack|ransomware|breach|malware|espionage/i,
  elections: /election|ballot|campaign|candidate|primary|congress|senate|parliament|vote/i,
  'climate-policy': /climate|emissions|carbon|net zero|cop\d\d/i,
  africa: /africa|nigeria|kenya|ethiopia|sudan|sahel|congo/i,
  'latin-america': /mexico|brazil|argentina|venezuela|colombia|chile|latin america/i,
  'asia-pacific': /japan|korea|india|pakistan|indonesia|philippines|australia|asean|indo-pacific/i,
  europe: /europe|\beu\b|brussels|germany|france|britain|\buk\b|poland|italy/i,
};

export function ruleTopics(text) {
  const out = [];
  for (const [t, re] of Object.entries(TAXONOMY)) if (re.test(text)) out.push(t);
  return out.slice(0, 6);
}

export function ruleSummary(article) {
  const paras = (article.text || '').split(/\n\n+/).filter(p => !p.startsWith('## ')).slice(0, 3);
  const body = paras.join('\n\n').slice(0, 900);
  return `**Excerpt** — ${body}${body.length >= 900 ? '…' : ''}\n\n_Add your AI key to get a full write-up with key points and why it matters._`;
}

const SYSTEM = `You write the Readers Digest for an intelligence terminal used by analysts and traders. Given one article, produce a clean, dense markdown write-up — no preamble, no fluff, no first person.

Format exactly:
## TL;DR
One or two sentences.
## Key points
3-6 bullets, each a concrete fact or claim from the article (numbers, names, dates).
## Why it matters
2-4 sentences on the geopolitical, security, economic or market significance. Be specific about who is affected and what could change.
## Watch for
2-3 bullets: what to monitor next (events, data releases, decisions, indicators).

Finish with one line: TOPICS: tag1, tag2, tag3 (3-6 short lowercase kebab-case topics such as geopolitics, china, energy, central-banks, defense, ai).
Only use facts from the article. Never invent figures.`;

function parseTopicsLine(md) {
  const m = md.match(/^TOPICS?:\s*(.+)$/im);
  if (!m) return { md, topics: [] };
  const topics = m[1].split(/[,;]/).map(t => t.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')).filter(Boolean).slice(0, 6);
  return { md: md.replace(m[0], '').trim(), topics };
}

export async function llmSummarize(provider, article) {
  const user = `Source: ${article.source}\nTitle: ${article.title}\nPublished: ${article.publishedAt || 'unknown'}\nURL: ${article.url}\n\nArticle text:\n${(article.text || article.description || '').slice(0, 14000)}`;
  const r = await provider.complete(SYSTEM, user, { maxTokens: 1400, timeout: 60000 });
  const text = String(r?.text || '').trim();
  if (text.length < 80) throw new Error('empty write-up');
  const { md, topics } = parseTopicsLine(text);
  return { summaryMd: md, topics: topics.length ? topics : ruleTopics(`${article.title} ${article.text}`) };
}
