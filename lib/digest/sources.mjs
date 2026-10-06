// Readers Digest publisher list. Curated for intelligence, geopolitics, security, economics and
// technology policy — no sports, weather, entertainment or lifestyle feeds.
// Every URL here was verified to return items on 2026-10-05. CSIS, Chatham House, Cato, FPRI,
// IISS and ECFR either have no live RSS or sit behind a bot wall, so they are intentionally absent.

export const SOURCES = [
  // ── Think tanks & policy institutes ───────────────────────────────────────
  { key: 'brookings',        name: 'Brookings Institution',       kind: 'thinktank', url: 'https://www.brookings.edu/feed/?post_type=article' },
  { key: 'cfr',              name: 'Council on Foreign Relations', kind: 'thinktank', url: 'https://feeds.cfr.org/cfr_main' },
  { key: 'rand',             name: 'RAND Commentary',             kind: 'thinktank', url: 'https://www.rand.org/blog.xml' },
  { key: 'rand-press',       name: 'RAND',                        kind: 'thinktank', url: 'https://www.rand.org/news/press.xml' },
  { key: 'atlantic-council', name: 'Atlantic Council',            kind: 'thinktank', url: 'https://www.atlanticcouncil.org/feed/' },
  { key: 'hoover',           name: 'Hoover Institution',          kind: 'thinktank', url: 'https://www.hoover.org/rss.xml' },
  { key: 'heritage',         name: 'Heritage Foundation',         kind: 'thinktank', url: 'https://www.heritage.org/rss' },
  { key: 'aei',              name: 'American Enterprise Institute', kind: 'thinktank', url: 'https://www.aei.org/feed/' },
  { key: 'stimson',          name: 'Stimson Center',              kind: 'thinktank', url: 'https://www.stimson.org/feed/' },
  { key: 'crisis-group',     name: 'International Crisis Group',  kind: 'thinktank', url: 'https://www.crisisgroup.org/rss' },
  { key: 'lowy',             name: 'Lowy Institute',              kind: 'thinktank', url: 'https://www.lowyinstitute.org/the-interpreter/rss.xml' },
  { key: 'wotr',             name: 'War on the Rocks',            kind: 'thinktank', url: 'https://warontherocks.com/feed/' },
  { key: 'nber',             name: 'NBER Working Papers',         kind: 'thinktank', url: 'https://www.nber.org/rss/new.xml' },
  { key: 'foreign-affairs',  name: 'Foreign Affairs',             kind: 'thinktank', url: 'https://www.foreignaffairs.com/rss.xml' },
  // ── Policy & defense press ────────────────────────────────────────────────
  { key: 'foreign-policy',   name: 'Foreign Policy',              kind: 'news', url: 'https://foreignpolicy.com/feed/' },
  { key: 'defense-one',      name: 'Defense One',                 kind: 'news', url: 'https://www.defenseone.com/rss/all/' },
  { key: 'breaking-defense', name: 'Breaking Defense',            kind: 'news', url: 'https://breakingdefense.com/feed/' },
  { key: 'politico',         name: 'Politico',                    kind: 'news', url: 'https://rss.politico.com/politics-news.xml' },
  { key: 'propublica',       name: 'ProPublica',                  kind: 'news', url: 'https://www.propublica.org/feeds/propublica/main' },
  { key: 'fed',              name: 'Federal Reserve',             kind: 'news', url: 'https://www.federalreserve.gov/feeds/press_all.xml' },
  // ── World & markets ───────────────────────────────────────────────────────
  { key: 'economist-intl',   name: 'The Economist',               kind: 'news', url: 'https://www.economist.com/international/rss.xml' },
  { key: 'economist-fin',    name: 'The Economist · Finance',     kind: 'news', url: 'https://www.economist.com/finance-and-economics/rss.xml' },
  { key: 'guardian-world',   name: 'The Guardian',                kind: 'news', url: 'https://www.theguardian.com/world/rss' },
  { key: 'nyt-world',        name: 'NYT World',                   kind: 'news', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml' },
  { key: 'bbc-world',        name: 'BBC World',                   kind: 'news', url: 'http://feeds.bbci.co.uk/news/world/rss.xml' },
  { key: 'aljazeera',        name: 'Al Jazeera',                  kind: 'news', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { key: 'dw',               name: 'DW',                          kind: 'news', url: 'https://rss.dw.com/rdf/rss-en-all' },
  { key: 'france24',         name: 'France 24',                   kind: 'news', url: 'https://www.france24.com/en/rss' },
  { key: 'cnbc-world',       name: 'CNBC World',                  kind: 'news', url: 'https://www.cnbc.com/id/100727362/device/rss/rss.html' },
  { key: 'marketwatch',      name: 'MarketWatch',                 kind: 'news', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories' },
];

export const SOURCE_BY_KEY = new Map(SOURCES.map(s => [s.key, s]));

// Anything matching these is dropped before extraction: the digest is intelligence-only.
const EXCLUDE_PATTERNS = [
  /\b(sports?|nfl|nba|mlb|nhl|fifa|premier league|world cup|olympics?|tennis|golf|cricket|rugby|formula 1|f1 grand prix|super bowl|playoffs?|touchdown|quarterback)\b/i,
  /\b(weather|forecast|heatwave|snowstorm|blizzard|hurricane season|tornado warning|rain(fall)? warning)\b/i,
  /\b(celebrity|celebrities|kardashian|royal family|red carpet|box office|movie review|film review|tv review|album review|grammys?|oscars?|emmys?|bafta|netflix series|reality tv|bachelor|love island)\b/i,
  /\b(recipe|recipes|horoscope|lottery|crossword|wordle|sudoku|gardening|fashion week|lifestyle|travel guide|holiday deals|black friday|gift guide|obituary)\b/i,
  /\/(sport|sports|weather|entertainment|celebrity|lifestyle|travel|food|recipes|arts|culture|music|film|tv|fashion|horoscopes|puzzles|games)\//i,
];

export function isExcluded(item) {
  const hay = `${item.title || ''} ${item.description || ''} ${item.url || ''}`;
  return EXCLUDE_PATTERNS.some(re => re.test(hay));
}
