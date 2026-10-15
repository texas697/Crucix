// Loopback fixture server (P0).
//
// Serves the UNMODIFIED legacy pages from dashboard/public against deterministic fixture data so
// Playwright can capture and protect the current behavior before the React migration. It speaks the
// same routes the browser expects (/api/data, /api/health, /api/me, /events, the page routes) but
// never runs a sweep, never contacts a collector, provider or Firebase, and holds no secrets.
//
// Configuration (all optional, defaults in brackets):
//   PORT            listen port                                    [4173]
//   FIXTURE         test/fixtures/synthesized/<name>.json           [minimal]
//   FIXTURE_STATE   'ready' | 'no-data' (emulates pre-first-sweep)  [ready]
//   AUTH_MODE       'off' | 'on' (emulates the server auth gate)    [off]
//   HOSTING_PROXY   'true' makes /events answer 204 like Hosting    [false]
//   LOCALE          'en' | 'fr'                                     [en]
import express from 'express';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadManifest, entryAssets, hasSurface, renderSurfaceDocument } from '../../dashboard/server/ui.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

const PORT = parseInt(process.env.PORT) || 4173;
const FIXTURE = process.env.FIXTURE || 'minimal';
const STATE = process.env.FIXTURE_STATE || 'ready';
const AUTH = (process.env.AUTH_MODE || 'off') === 'on';
const HOSTING_PROXY = (process.env.HOSTING_PROXY || 'false') === 'true';
const LOCALE = process.env.LOCALE || 'en';
// FIXTURE_UI=react serves the built React surfaces (dashboard/dist) instead of the legacy pages, so
// the browser harness can exercise migrated surfaces the same way it exercises legacy ones.
const FIXTURE_UI = process.env.FIXTURE_UI || 'legacy';
const reactManifest = FIXTURE_UI === 'react' ? loadManifest(ROOT) : null;
const reactSurface = (surface) => FIXTURE_UI === 'react' && hasSurface(reactManifest, surface);

// Synthetic digest items so the React digest (and the legacy one) render cards deterministically.
const DIGEST_ITEMS = [
  { id: 'dg-1', title: 'Example think-tank piece', source: 'Carnegie', kind: 'thinktank', publishedAt: '2026-10-14T12:00:00.000Z', description: 'A short description.', topics: ['AI', 'Policy'], hasWriteup: false, vote: 0 },
  { id: 'dg-2', title: 'Example news piece', source: 'BBC', kind: 'news', publishedAt: '2026-10-14T12:00:00.000Z', description: 'Another description.', topics: ['Europe'], hasWriteup: true, vote: 0 },
];

// Fixed instant so anything time-derived in the legacy UI is reproducible.
const NOW = Date.parse('2026-10-14T12:00:00.000Z');
const SWEEP_ISO = new Date(NOW).toISOString();

function loadFixture(name) {
  const p = join(HERE, 'synthesized', `${name}.json`);
  if (!existsSync(p)) {
    console.error(`[fixture-server] missing synthesized fixture: ${p} (run: npm run fixtures:build)`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(p, 'utf8'));
}

const data = loadFixture(FIXTURE);
const locale = JSON.parse(readFileSync(join(ROOT, 'locales', `${LOCALE}.json`), 'utf8'));
const publicDir = join(ROOT, 'dashboard', 'public');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

// Mirror the production cache-header posture so browser/cache tests see the same headers.
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'private, no-store');
  else if (req.path.startsWith('/brand/')) res.setHeader('Cache-Control', 'public, max-age=86400');
  else res.setHeader('Cache-Control', 'private, no-cache');
  next();
});

const ready = () => STATE === 'ready';

// ─── Public probes ─────────────────────────────────────────────────────────
app.get('/api/healthz', (req, res) => res.json({ status: 'ok', uptime: 1 }));
app.get('/api/status', (req, res) => {
  const ok = ready();
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ok' : 'stale',
    checkedAt: SWEEP_ISO,
    run: ok ? SWEEP_ISO : null,
    runAgeMin: ok ? 0 : null,
    failed: ok ? [] : ['run'],
    warnings: [],
    checks: [],
  });
});

// ─── Public site pages ─────────────────────────────────────────────────────
app.use('/brand', express.static(join(publicDir, 'brand')));
// Built React assets (dashboard/dist/assets) so the FIXTURE_UI=react surfaces actually boot.
const DIST_ASSETS = join(ROOT, 'dashboard', 'dist', 'assets');
if (existsSync(DIST_ASSETS)) {
  app.use('/assets', express.static(DIST_ASSETS, { index: false, immutable: true, maxAge: '1y' }));
}
for (const [route, file] of [['/mfb-think-tank', null], ['/support', null], ['/privacy', null], ['/terms', null]]) {
  app.get(route, (req, res) => res.status(200).type('html').send(`<!doctype html><title>${file || route}</title>`));
}

// ─── Auth surface ──────────────────────────────────────────────────────────
function sessionUser() { return { uid: 'fixture', email: 'fixture@example.com', name: 'Fixture' }; }

app.get('/__/firebase/init.json', (req, res) => res.json({ projectId: 'fixture', apiKey: 'fixture', authDomain: req.hostname }));
app.get('/login', (req, res) => {
  const html = readFileSync(join(ROOT, 'dashboard', 'auth', 'login.html'), 'utf8')
    .replace('</head>', `<script>window.__FIREBASE_CONFIG__={"projectId":"fixture","apiKey":"fixture","authDomain":"${req.hostname}"};window.__ALLOW_SIGNUP__=true;</script>\n</head>`);
  res.type('html').send(html);
});
app.post('/api/session', (req, res) => res.status(400).json({ error: 'fixture server does not exchange sessions' }));
app.post('/api/logout', (req, res) => res.json({ ok: true }));
// /api/* must never fall back to an HTML page.
app.use('/__/auth', (req, res) => res.status(404).send('auth helper not available in fixtures'));

// ─── Gated surface (public here when AUTH_MODE=off, like the real server) ───
if (AUTH) {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/events') {
      return res.status(401).json({ error: 'Authentication required', login: '/login' });
    }
    if (req.headers.accept?.includes('text/html')) {
      return res.redirect(302, `/login?next=${encodeURIComponent(req.originalUrl)}`);
    }
    return res.status(401).json({ error: 'Authentication required', login: '/login' });
  });
}

// ─── Page routes ───────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  if (!ready()) return res.sendFile('loading.html', { root: publicDir });
  let html = readFileSync(join(publicDir, 'jarvis.html'), 'utf8');
  const localeScript = `<script>window.__CRUCIX_LOCALE__ = ${JSON.stringify(locale).replace(/<\/script>/gi, '<\\/script')};</script>`;
  html = html.replace('</head>', `${localeScript}\n</head>`);
  res.type('html').send(html);
});
app.get(['/digest', '/digest/:id'], (req, res) => {
  if (reactSurface('digest')) {
    const html = renderSurfaceDocument({
      surface: 'digest',
      title: 'Readers Digest',
      assets: entryAssets(reactManifest, 'digest'),
      head: '<script>window.__HAS_TAVILY__=false;</script>',
      navigation: true,
    });
    return res.type('html').send(html);
  }
  const html = readFileSync(join(publicDir, 'digest.html'), 'utf8')
    .replace('</head>', `<script>window.__HAS_TAVILY__=false;</script>\n</head>`);
  res.type('html').send(html);
});
app.get(['/media', '/media/:id'], (req, res) => res.sendFile('media.html', { root: publicDir }));

// ─── Data API ──────────────────────────────────────────────────────────────
app.get('/api/data', (req, res) => {
  if (!ready()) return res.status(503).json({ error: 'No data yet — first sweep in progress' });
  res.json(data);
});
app.get('/api/health', (req, res) => res.json({
  status: ready() ? 'ok' : 'starting',
  uptime: 1,
  lastSweep: ready() ? SWEEP_ISO : null,
  nextSweep: null,
  sweepInProgress: false,
  sweepStartedAt: null,
  sourcesOk: data.meta?.sourcesOk || 0,
  sourcesFailed: data.meta?.sourcesFailed || 0,
  llmEnabled: false,
  llmProvider: null,
  authEnabled: AUTH,
  byokEnabled: AUTH,
  sweepMode: 'external',
  refreshIntervalMinutes: 15,
  language: LOCALE,
}));
app.get('/api/locales', (req, res) => res.json({ current: LOCALE, supported: ['en', 'fr'] }));

// SSE: deterministic. Connected immediately; never emits update (the fixture data is static).
app.get('/events', (req, res) => {
  if (HOSTING_PROXY) return res.status(204).end();
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.write('data: {"type":"connected"}\n\n');
  const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch { /* closed */ } }, 25000);
  req.on('close', () => clearInterval(ping));
});

if (AUTH) {
  app.get('/api/me', (req, res) => res.json({
    ...sessionUser(), ideas: null, providers: [], byokEnabled: true, sharedLlm: null,
  }));
  app.put('/api/me/llm', (req, res) => res.json({ ok: true, llm: null }));
  app.delete('/api/me/llm', (req, res) => res.json({ ok: true }));
  app.post('/api/me/llm/test', (req, res) => res.json({ ok: true, provider: 'fixture', model: 'fixture', ms: 1, reply: 'ok' }));
  app.post('/api/ideas', (req, res) => res.json({ ideas: [], generatedAt: SWEEP_ISO, provider: 'fixture', model: 'fixture' }));
}

// ─── Feeds (deterministic empty/known stubs) ───────────────────────────────
app.get('/api/alerts', (req, res) => res.json({ source: 'fixture', updated: SWEEP_ISO, items: [] }));
app.get('/api/ais', (req, res) => res.json({ enabled: false, vessels: [], boxes: [] }));
app.get('/api/tracks', (req, res) => res.json({ updated: SWEEP_ISO, count: 0, tracks: [] }));
app.post('/api/map/region', (req, res) => res.json({ places: [], fallback: false, articles: [], total: 0, liveErr: null, ms: 1 }));

// ─── Digest API ────────────────────────────────────────────────────────────
app.get('/api/digest/list', (req, res) => {
  const filter = String(req.query.filter || 'all');
  const topic = String(req.query.topic || '');
  const q = String(req.query.q || '').toLowerCase();
  let items = DIGEST_ITEMS;
  if (filter === 'thinktank') items = items.filter((i) => i.kind === 'thinktank');
  if (filter === 'news') items = items.filter((i) => i.kind === 'news');
  if (topic) items = items.filter((i) => (i.topics || []).includes(topic));
  if (q) items = items.filter((i) => i.title.toLowerCase().includes(q));
  res.json({
    items, total: items.length, mode: 'all', votes: {}, minVotesForAffinity: 5,
    topics: [{ topic: 'AI', count: 1 }, { topic: 'Policy', count: 1 }, { topic: 'Europe', count: 1 }],
    taste: null, sources: [], storeSize: items.length,
  });
});
app.get('/api/digest/article/:id', (req, res) => {
  const item = DIGEST_ITEMS.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  res.json({ ...item, summaryMd: '## Write-up\n\nA **summary** with a [link](https://example.com).', extracted: true, research: { state: 'none' } });
});
app.post('/api/digest/open', (req, res) => {
  res.json({ ...DIGEST_ITEMS[0], summaryMd: 'Opened by URL.', extracted: true, research: { state: 'none' } });
});
app.post('/api/digest/:id/feedback', (req, res) => res.json({ rating: req.body?.rating ?? null }));
app.post('/api/digest/:id/summarize', (req, res) => res.status(404).json({ error: 'not found' }));
app.post('/api/digest/:id/research', (req, res) => res.json({ state: 'none' }));
app.get('/api/digest/:id/research', (req, res) => res.json({ state: 'none' }));

// ─── Static assets ─────────────────────────────────────────────────────────
app.use(express.static(publicDir, { index: false }));

// Any unmatched /api path is a real 404, never HTML.
app.use('/api', (req, res) => res.status(404).json({ error: 'not found' }));

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`[fixture-server] http://127.0.0.1:${PORT} fixture=${FIXTURE} state=${STATE} auth=${AUTH ? 'on' : 'off'} proxy=${HOSTING_PROXY}`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
