#!/usr/bin/env node
// Crucix Intelligence Engine — Dev Server
// Serves the Jarvis dashboard, runs sweep cycle, pushes live updates via SSE

import express from 'express';
import { startAisStream, configureAisRelay, aisSnapshotAsync, aisEnabled, AIS_BOXES } from './lib/ais/stream.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { exec } from 'child_process';
import config from './crucix.config.mjs';
import { getLocale, currentLanguage, getSupportedLocales } from './lib/i18n.mjs';
import { fullBriefing } from './apis/briefing.mjs';
import { synthesize, generateIdeas } from './dashboard/inject.mjs';
import { MemoryManager } from './lib/delta/index.mjs';
import { createLLMProvider } from './lib/llm/index.mjs';
import { generateLLMIdeas } from './lib/llm/ideas.mjs';
import * as users from './lib/auth/users.mjs';
import * as feedback from './lib/feedback.mjs';
import { createDigest } from './lib/digest/index.mjs';
import { parseShape, placesInShape, collectArticles, writeBrief, createBudget } from './lib/map/region-news.mjs';
import { loadManifest, entryAssets, entryForSurface, hasSurface, renderSurfaceDocument, uiFlagsScript } from './dashboard/server/ui.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const RUNS_DIR = config.runsDir || join(ROOT, 'runs');
const MEMORY_DIR = join(RUNS_DIR, 'memory');
const IN_CONTAINER = !!process.env.K_SERVICE || existsSync('/.dockerenv');

// === Auth (Firebase) — loaded lazily so AUTH_MODE=off needs no Firebase at all ===
const AUTH_ENABLED = config.auth.mode !== 'off';
let authLib = null;
if (AUTH_ENABLED) {
  authLib = await import('./lib/auth/firebase.mjs');
  authLib.initFirebase();
  console.log(`[Crucix] Auth enabled (Firebase project ${authLib.parseWebConfig()?.projectId || process.env.FIREBASE_PROJECT_ID})`);
} else {
  console.warn('[Crucix] AUTH_MODE=off — dashboard and API are PUBLIC. Do not expose this to the internet.');
}

// === React UI flags (per surface: legacy | react) ===
// Server-selected so the public URL never changes; the value travels with the Cloud Run revision.
// Defaults to legacy. A missing frontend build forces legacy, so legacy-only mode still boots.
function uiFlag(name) {
  return process.env[name] === 'react' ? 'react' : 'legacy';
}
const UI_FLAGS = {
  dashboard: uiFlag('UI_DASHBOARD'),
  digest: uiFlag('UI_DIGEST'),
  media: uiFlag('UI_MEDIA'),
  login: uiFlag('UI_LOGIN'),
  site: uiFlag('UI_SITE'),
};
const UI_TITLES = { dashboard: 'Dashboard', digest: 'Readers Digest', media: 'Live media', login: 'Sign in' };
const uiManifest = loadManifest(ROOT);
const UI_DIST = join(ROOT, 'dashboard', 'dist');
// Dev-only Vite middleware adapter. Never mounted in production; see the mount site below.
const DEV_UI = process.env.NODE_ENV !== 'production' && process.env.UI_DEV === '1';
let viteDev = null;
if (Object.values(UI_FLAGS).includes('react') && !uiManifest && !DEV_UI) {
  console.error('[Crucix] FATAL: a UI_* flag is set to "react" but no frontend build was found (dashboard/dist). Run `npm run build`, or set every UI_* flag to legacy. Legacy-only mode still boots without a build.');
  process.exit(1);
}
function reactSurface(surface) {
  if (UI_FLAGS[surface] !== 'react') return false;
  return DEV_UI ? true : hasSurface(uiManifest, surface);
}
// Render a React surface document. In dev the Vite client + raw entry module are served by the
// middleware adapter; in production it is the manifest-resolved hashed entry.
function sendReactSurface(res, surface, { head = '', body = '' } = {}) {
  const title = `${config.site?.appName || 'Crucix'} — ${UI_TITLES[surface] || surface}`;
  const entry = entryForSurface(surface);
  const assets = viteDev
    ? { js: [`/@vite/client`, `/entries/${entry}.tsx`], css: [] }
    : entryAssets(uiManifest, entry);
  const html = renderSurfaceDocument({ surface: entry === 'login' ? 'login' : 'app', title, assets, head, body });
  res.set('Cache-Control', 'private, no-cache').type('html').send(html);
}
function spaHead() {
  const locale = getLocale();
  const localeScript = `<script>window.__CRUCIX_LOCALE__ = ${JSON.stringify(locale).replace(/<\/script>/gi, '<\\/script')};</script>`;
  const tavilyScript = `<script>window.__HAS_TAVILY__=${!!process.env.TAVILY_API_KEY};</script>`;
  return `${uiFlagsScript(UI_FLAGS)}\n  ${localeScript}\n  ${tavilyScript}`;
}

// Ensure directories exist
for (const dir of [RUNS_DIR, MEMORY_DIR, join(MEMORY_DIR, 'cold')]) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// === State ===
let currentData = null;    // Current synthesized dashboard data
let lastSweepTime = null;  // Timestamp of last sweep
let sweepStartedAt = null; // Timestamp when current/last sweep started
let sweepInProgress = false;
const startTime = Date.now();
const sseClients = new Set();

// === Delta/Memory ===
const memory = new MemoryManager(RUNS_DIR);

// === LLM ===
const llmProvider = createLLMProvider(config.llm);

if (llmProvider) console.log(`[Crucix] LLM enabled: ${llmProvider.name} (${llmProvider.model})`);

// === Readers Digest ===
const DIGEST_OPERATOR_WRITEUPS = (process.env.DIGEST_OPERATOR_WRITEUPS || 'false').toLowerCase() === 'true';
const digest = createDigest({ db: () => authLib.db(), authEnabled: AUTH_ENABLED, operatorProvider: DIGEST_OPERATOR_WRITEUPS && llmProvider?.isConfigured ? llmProvider : null });
if (llmProvider?.isConfigured && !DIGEST_OPERATOR_WRITEUPS) console.log('[Digest] operator write-ups off (set DIGEST_OPERATOR_WRITEUPS=true to spend the operator key on every ingested article)');
if (AUTH_ENABLED) digest.init().catch(err => console.error('[Digest] init failed:', err.message));
const DIGEST_AFTER_SWEEP = (process.env.DIGEST_AFTER_SWEEP || 'true').toLowerCase() !== 'false';
// === Express Server ===
const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');
// API responses never touch a cache. Pages and assets revalidate instead (ETag -> 304): `no-store` on the
// documents kept Chrome from using the back/forward cache, so every tab switch and Back was a cold reload,
// and `no-store` on /css, /js and /brand made each navigation redownload every asset.
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'private, no-store');
  else if (req.path.startsWith('/brand/')) res.setHeader('Cache-Control', 'public, max-age=86400');
  // Content-hashed Vite assets are immutable; this must be set here because express.static will
  // not override an already-set Cache-Control.
  else if (req.path.startsWith('/assets/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  else res.setHeader('Cache-Control', 'private, no-cache');
  next();
});
const jsonBody = express.json({ limit: '32kb' });
app.use((req, res, next) => (req.path === '/api/feedback' ? next() : jsonBody(req, res, next))); // feedback carries a screenshot; parsed on its route, after auth

// ─── Public routes (no auth) ───────────────────────────────────────────────
// Minimal liveness probe for Docker/Cloud Run — leaks nothing. (Google's front end swallows a bare /healthz.)
app.get('/api/healthz', (req, res) => res.json({ status: 'ok', uptime: Math.floor((Date.now() - startTime) / 1000) }));

// Public freshness probe for external monitoring (Cloud Monitoring uptime check). Validates the same synthesized
// data the dashboard renders: the run must be recent, the sources healthy, and every tile must have something to
// show. Returns 200 only when all checks pass, 503 otherwise, with counts and ages but no payload content.
const STATUS_MAX_RUN_AGE_MIN = parseInt(process.env.STATUS_MAX_RUN_AGE_MIN) || 45;
app.get('/api/status', (req, res) => {
  const now = Date.now();
  const d = currentData;
  const ageMin = iso => iso ? Math.round((now - new Date(iso).getTime()) / 60000) : null;
  const checks = [];
  const check = (name, ok, detail, soft = false) => checks.push({ name, ok: !!ok, soft, detail });
  if (!d || !d.meta) {
    check('run', false, 'no sweep data loaded');
  } else {
    const runAge = ageMin(d.meta.timestamp);
    check('run', runAge != null && runAge <= STATUS_MAX_RUN_AGE_MIN, `run ${runAge} min old (limit ${STATUS_MAX_RUN_AGE_MIN})`);
    check('sources', d.meta.sourcesOk >= Math.ceil(d.meta.sourcesQueried * 0.9), `${d.meta.sourcesOk}/${d.meta.sourcesQueried} sources ok`);
    check('air', (d.air || []).reduce((s, a) => s + (a.total || 0), 0) > 0, `${(d.air || []).reduce((s, a) => s + (a.total || 0), 0)} aircraft across theaters`);
    check('thermal', (d.thermal || []).reduce((s, t) => s + (t.det || 0), 0) > 0, `${(d.thermal || []).reduce((s, t) => s + (t.det || 0), 0)} detections`);
    check('conflict', (d.gdelt?.conflictEvents || 0) > 0 && Object.keys(d.gdelt?.byRegion || {}).length >= 5, `${d.gdelt?.conflictEvents || 0} GDELT conflict events, ${Object.keys(d.gdelt?.byRegion || {}).length} theaters`);
    check('nuclear', (d.nuke || []).filter(n => n.coverage === 'live').length > 0, `${(d.nuke || []).filter(n => n.coverage === 'live').length}/${(d.nuke || []).length} sites live`);
    check('risk', (d.fred || []).filter(f => f.value != null).length >= 5, `${(d.fred || []).filter(f => f.value != null).length} FRED indicators`);
    check('space', d.space?.iss?.lat != null && (d.space?.stations || []).length > 0, `ISS ${d.space?.iss?.lat != null ? 'tracked' : 'missing'}, ${(d.space?.stations || []).length} stations`);
    check('spaceWeather', d.spaceWeather?.kp?.time && ageMin(d.spaceWeather.kp.time) <= 480, `Kp ${d.spaceWeather?.kp?.now ?? 'n/a'} from ${ageMin(d.spaceWeather?.kp?.time)} min ago`);
    // Soft: the receivers are hobbyist boxes probed live, and one bad probe round should not page anyone.
    check('sdr', (d.sdr?.online || 0) > 0, `${d.sdr?.online || 0} of ${d.sdr?.probed || 0} probed receivers online`, true);
    check('maritime', (d.chokepoints || []).length >= 20 && d.maritimeMeta?.asOf && (now - new Date(d.maritimeMeta.asOf).getTime()) < 14 * 86400000, `${(d.chokepoints || []).length} chokepoints to ${d.maritimeMeta?.asOf || 'n/a'}`);
    check('ships', (d.shipsMeta?.liveVessels || 0) > 0 && !d.shipsMeta?.error, `${d.shipsMeta?.liveVessels || 0} live vessels${d.shipsMeta?.error ? ' · ' + d.shipsMeta.error : ''}`, true);
    check('health', ((d.healthWatch?.outbreaks || []).length + (d.healthWatch?.travel || []).length) > 0 && !d.healthWatch?.error, `${(d.healthWatch?.outbreaks || []).length} outbreaks, ${(d.healthWatch?.travel || []).length} CDC notices`);
    check('disasters', !d.disasters?.error && Array.isArray(d.disasters?.events), `${(d.disasters?.events || []).length} GDACS events${d.disasters?.error ? ' · ' + d.disasters.error : ''}`);
    check('outages', !d.outages?.error && (d.outages?.counts?.critical ?? 0) >= 0 && Array.isArray(d.outages?.countries), `${d.outages?.counts?.critical ?? 0} IODA alerts${d.outages?.error ? ' · ' + d.outages.error : ''}`);
    check('news', (d.news || []).length > 0 && (d.newsFeed || []).length > 0, `${(d.news || []).length} news, ${(d.newsFeed || []).length} ticker items`);
  }
  const failed = checks.filter(c => !c.ok && !c.soft), warnings = checks.filter(c => !c.ok && c.soft);
  const ok = failed.length === 0;
  res.status(ok ? 200 : 503).json({
    status: ok ? (warnings.length ? 'degraded' : 'ok') : 'stale',
    checkedAt: new Date(now).toISOString(),
    run: d?.meta?.timestamp || null, runAgeMin: ageMin(d?.meta?.timestamp),
    failed: failed.map(c => c.name), warnings: warnings.map(c => c.name), checks,
  });
});

app.use('/brand', express.static(join(ROOT, 'dashboard/public/brand'))); // logos/favicons for the public pages below
app.use('/brand', (req, res) => res.status(404).type('text/plain').send('Not found'));

// Content-hashed React assets. Public (no secrets), immutable; a missing asset is a real 404,
// never the HTML shell, so a stale lazy chunk fails loudly instead of returning a document.
const DIST_ASSETS = join(UI_DIST, 'assets');
if (existsSync(DIST_ASSETS)) {
  app.use('/assets', express.static(DIST_ASSETS, { index: false, immutable: true, maxAge: '1y' }));
}
app.use('/assets', (req, res) => res.status(404).type('text/plain').send('Not found'));

// MFB Think Tank mobile app's public pages (store listing URLs) — no auth, so reviewers and signed-out users can read them.
const site = config.site;
const siteLayout = readFileSync(join(ROOT, 'dashboard/site/layout.html'), 'utf-8');
const escHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const storeLinks = [[site.appStoreUrl, 'Download on the App Store'], [site.playStoreUrl, 'Get it on Google Play']].filter(([u]) => u);
const siteVars = {
  APP_NAME: escHtml(site.appName),
  APP_NAME_URL: encodeURIComponent(site.appName),
  OPERATOR: escHtml(site.operator),
  CONTACT_EMAIL: escHtml(site.contactEmail),
  JURISDICTION: escHtml(site.jurisdiction),
  POSTAL_ADDRESS_LINE: site.postalAddress ? `<br>Mail: ${escHtml(site.postalAddress)}` : '',
  STORE_LINKS: storeLinks.length
    ? `<div class="stores">${storeLinks.map(([u, label]) => `<a class="store" href="${escHtml(u)}" rel="noopener">${label}</a>`).join('')}</div>`
    : '<p class="soon">Coming soon to iPhone and Android</p>',
  YEAR: String(new Date().getFullYear()),
};
const fillSite = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => vars[k] ?? m);
const legalMeta = `<div class="meta">Effective ${escHtml(site.legalEffectiveDate)} · Last updated ${escHtml(site.legalEffectiveDate)}</div>`;
function renderSitePage({ file, title, docTitle, description, meta = '' }) {
  const body = fillSite(readFileSync(join(ROOT, 'dashboard/site', file), 'utf-8'), siteVars);
  return fillSite(siteLayout, { ...siteVars, TITLE: escHtml(title), DOC_TITLE: escHtml(docTitle), DESCRIPTION: escHtml(description), META: meta, BODY: body });
}
// React public pages (P7) render once at import from a separately built server entry
// (dashboard/dist/site/server.js, produced by vite.site.config.ts); the legacy template filling is
// the fallback and stays authoritative until every page passes parity.
let reactSitePages = null;
if (UI_FLAGS.site === 'react') {
  try {
    const mod = await import(pathToFileURL(join(ROOT, 'dashboard', 'dist', 'site', 'server.js')).href);
    reactSitePages = mod.buildSitePages(config.site);
  } catch (err) {
    console.error('[Crucix] UI_SITE=react but dashboard/dist/site/server.js is missing — using legacy templates:', err.message);
  }
}
const legacySitePages = {
  marketing: renderSitePage({ file: 'marketing.html', title: `${site.appName}: policy analysis, briefed`, docTitle: site.appName,
    description: `${site.appName} brings long-form analysis from think tanks, policy journals and global newsrooms into one feed, with AI summaries and cited deep dives.` }),
  support: renderSitePage({ file: 'support.html', title: 'Support', docTitle: `Support — ${site.appName}`, description: `Get help with ${site.appName}: contact support, FAQs and account deletion.` }),
  privacy: renderSitePage({ file: 'privacy.html', title: 'Privacy Policy', docTitle: `Privacy Policy — ${site.appName}`, description: `How ${site.operator} handles your information in ${site.appName}.`, meta: legalMeta }),
  terms: renderSitePage({ file: 'terms.html', title: 'Terms of Service', docTitle: `Terms of Service — ${site.appName}`, description: `Terms of Service for ${site.appName}.`, meta: legalMeta }),
};
const sitePages = reactSitePages ?? legacySitePages;
const sendSitePage = name => (req, res) => res.set('Cache-Control', 'public, max-age=3600').type('html').send(sitePages[name]);
app.get('/mfb-think-tank', sendSitePage('marketing'));
app.get('/support', sendSitePage('support'));
app.get(['/privacy', '/privacy-policy'], sendSitePage('privacy'));
app.get(['/terms', '/terms-of-service'], sendSitePage('terms'));

if (AUTH_ENABLED) {
  const loginHtml = readFileSync(join(ROOT, 'dashboard/auth/login.html'), 'utf-8');
  const webConfig = authLib.parseWebConfig();
  const firebaseAuthOrigin = `https://${webConfig.projectId}.firebaseapp.com`;

  // Same-origin auth helper. Browsers now block the third-party storage that Firebase's popup/redirect
  // flow needs when authDomain is *.firebaseapp.com, so we serve /__/auth/* from our own hostname and
  // tell the SDK to use this host as authDomain (Firebase's documented "proxy" option).
  app.use('/__/auth', async (req, res) => {
    try {
      const upstream = await fetch(`${firebaseAuthOrigin}/__/auth${req.url}`, {
        method: req.method,
        headers: { 'accept': req.headers.accept || '*/*', 'user-agent': req.headers['user-agent'] || 'crucix' },
        redirect: 'manual',
      });
      res.status(upstream.status);
      for (const h of ['content-type', 'cache-control', 'location', 'content-security-policy']) {
        const v = upstream.headers.get(h);
        if (v) res.setHeader(h, v);
      }
      res.send(Buffer.from(await upstream.arrayBuffer()));
    } catch (err) {
      console.error('[Auth] helper proxy failed:', err.message);
      res.status(502).send('auth helper unavailable');
    }
  });
  // Same-origin authDomain needs `https://<host>/__/auth/handler` added to the Google OAuth client's
  // redirect URIs (Cloud Console → APIs & Services → Credentials). Until then keep Firebase's default.
  // On Firebase Hosting domains (*.firebaseapp.com / *.web.app) the helper is served natively by Hosting
  // and the OAuth client already trusts them, so same-origin auth works there with no extra setup.
  const sameOriginAuth = (process.env.AUTH_SAME_ORIGIN_HELPER || 'false').toLowerCase() === 'true';
  const isHostingDomain = (h) => /\.firebaseapp\.com$|\.web\.app$/i.test(h || '');
  const configFor = (req) => ((sameOriginAuth || isHostingDomain(req.hostname)) ? { ...webConfig, authDomain: req.hostname } : webConfig);
  app.get('/__/firebase/init.json', (req, res) => res.json(configFor(req)));

  app.get('/login', (req, res) => {
    const cfg = JSON.stringify(configFor(req)).replace(/<\/script>/gi, '<\\/script>');
    const boot = `<script>window.__FIREBASE_CONFIG__=${cfg};window.__ALLOW_SIGNUP__=${authLib.allowSignup};</script>`;
    if (reactSurface('login')) {
      // The React login reads the compat SDK as globals, so the entry document loads it (gstatic).
      const sdk = '<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>'
        + '<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"></script>';
      return sendReactSurface(res, 'login', { head: `${sdk}\n${boot}` });
    }
    res.type('html').send(loginHtml.replace('</head>', `${boot}\n</head>`));
  });

  // Exchange a fresh Firebase ID token for an httpOnly session cookie
  app.post('/api/session', async (req, res) => {
    try {
      const idToken = String(req.body?.idToken || '');
      if (!idToken) return res.status(400).json({ error: 'idToken required' });
      const { cookie, user } = await authLib.createSession(idToken);
      authLib.setSessionCookie(req, res, cookie);
      users.touchUser(user).catch(() => {});
      res.json({ ok: true, user });
    } catch (err) {
      const status = err.status || 401;
      if (status >= 500) console.error('[Auth] session error:', err.message);
      res.status(status).json({ error: status === 401 ? 'Invalid or expired sign-in token' : err.message });
    }
  });

  app.post('/api/logout', async (req, res) => {
    const cookie = authLib.readCookie(req, authLib.COOKIE_NAME);
    authLib.clearSessionCookie(req, res);
    if (cookie) {
      try { const u = await authLib.verifySession(cookie); await authLib.revokeSessions(u.uid); } catch { /* already invalid */ }
    }
    res.json({ ok: true });
  });

  // Public mobile auth endpoints — a Firebase-SDK-free client exchanges credentials here for an
  // ID token it then sends as `Authorization: Bearer`. Must stay above the gate.
  const { mountMobileAuthRoutes } = await import('./lib/auth/identity.mjs');
  mountMobileAuthRoutes(app);

  // Everything below this line requires a valid session
  const gate = authLib.requireAuth();
  app.use((req, res, next) => (req.path.startsWith('/api/internal/') ? next() : gate(req, res, next)));
} else {
  // No sign-in exists when auth is off: /login lands on the dashboard instead of a 404.
  app.get('/login', (req, res) => res.redirect(302, '/'));
  app.use((req, res, next) => { req.user = { uid: 'local', email: 'local@localhost' }; next(); });
}

// External digest ingest trigger (Cloud Scheduler). Same shared secret as the sweep.
app.post('/api/internal/digest', async (req, res) => {
  const token = config.sweep.triggerToken;
  if (!token) return res.status(404).json({ error: 'External trigger disabled (SWEEP_TRIGGER_TOKEN unset)' });
  const given = req.headers['x-sweep-token'] || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (given !== token) return res.status(401).json({ error: 'bad token' });
  try { res.json(await digest.ingest()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// External sweep trigger (Cloud Scheduler / cron). Shared secret in header, never a cookie.
app.post('/api/internal/sweep', async (req, res) => {
  const token = config.sweep.triggerToken;
  if (!token) return res.status(404).json({ error: 'External sweep trigger disabled (SWEEP_TRIGGER_TOKEN unset)' });
  const given = req.headers['x-sweep-token'] || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (given !== token) return res.status(401).json({ error: 'bad token' });
  if (sweepInProgress) return res.status(202).json({ status: 'already-running', sweepStartedAt });
  await runSweepCycle();
  res.json({ status: 'done', lastSweep: lastSweepTime, sourcesOk: currentData?.meta?.sourcesOk ?? null });
});

// Dev-only Vite middleware (HMR + module serving). Mounted before the page routes and static
// handlers; never present in production. vite.config.ts (fs.strict + fs.allow/deny) keeps it inside
// dashboard/react so it can never serve server.mjs, deploy/** or runs/**.
if (DEV_UI) {
  const { createServer } = await import('vite');
  viteDev = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  app.use(viteDev.middlewares);
  console.warn('[Crucix] UI_DEV=1 — Vite dev middleware mounted; not for production use.');
}

app.use(express.static(join(ROOT, 'dashboard/public'), { index: false }));

// Serve loading page until first sweep completes, then the dashboard with injected locale
app.get('/', (req, res) => {
  // Root's loading screen follows the dashboard flag: the React dashboard owns both the startup and
  // ready states once selected.
  if (reactSurface('dashboard')) return sendReactSurface(res, 'dashboard', { head: spaHead() });
  if (!currentData) {
    // Express 5.2 / send 1.2 resolve an absolute sendFile path as not-found; use the {@code root}
    // form so the pre-first-sweep startup page actually loads.
    res.sendFile('loading.html', { root: join(ROOT, 'dashboard/public') });
  } else {
    const htmlPath = join(ROOT, 'dashboard/public/jarvis.html');
    let html = readFileSync(htmlPath, 'utf-8');
    
    // Inject locale data into the HTML
    const locale = getLocale();
    const localeScript = `<script>window.__CRUCIX_LOCALE__ = ${JSON.stringify(locale).replace(/<\/script>/gi, '<\\/script>')};</script>`;
    html = html.replace('</head>', `${localeScript}\n</head>`);
    
    res.type('html').send(html);
  }
});

// API: current data
app.get('/api/data', (req, res) => {
  if (!currentData) return res.status(503).json({ error: 'No data yet — first sweep in progress' });
  res.json(currentData);
});

// API: health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    lastSweep: lastSweepTime,
    nextSweep: lastSweepTime
      ? new Date(new Date(lastSweepTime).getTime() + config.refreshIntervalMinutes * 60000).toISOString()
      : null,
    sweepInProgress,
    sweepStartedAt,
    sourcesOk: currentData?.meta?.sourcesOk || 0,
    sourcesFailed: currentData?.meta?.sourcesFailed || 0,
    llmEnabled: !!config.llm.provider,
    llmProvider: config.llm.provider,
    authEnabled: AUTH_ENABLED,
    byokEnabled: AUTH_ENABLED && !!process.env.BYOK_ENCRYPTION_KEY,
    sweepMode: config.sweep.mode,
    refreshIntervalMinutes: config.refreshIntervalMinutes,
    language: currentLanguage,
  });
});

// API: available locales
app.get('/api/locales', (req, res) => {
  res.json({
    current: currentLanguage,
    supported: getSupportedLocales(),
  });
});

// SSE: live updates
// Firebase Hosting (mfbintelligence.com rewrites to this service) buffers responses, so a stream opened
// through it never reaches the browser: the client gives up and reconnects every few seconds while each
// abandoned request stays open here until the Cloud Run request timeout (1h). Those piled up to the
// instance's concurrency cap and every request, website and mobile app alike, got 429. Refuse the stream
// for proxied requests (the 60s poll covers them) and cap the lifetime of every stream as a backstop.
const SSE_MAX_LIFETIME_MS = 10 * 60 * 1000;
const isProxiedThroughHosting = req => {
  const fwd = req.headers['x-forwarded-host'] || req.headers['x-fh-requested-host'];
  return !!fwd && fwd !== req.headers.host;
};
app.get('/events', (req, res) => {
  if (isProxiedThroughHosting(req)) return res.status(204).end();
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('data: {"type":"connected"}\n\n');
  sseClients.add(res);
  // Keep proxies (Cloud Run, Cloudflare) from closing idle streams
  const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch { /* closed */ } }, 25000);
  const lifetime = setTimeout(() => { try { res.end(); } catch { /* closed */ } }, SSE_MAX_LIFETIME_MS); // EventSource reconnects
  req.on('close', () => { clearInterval(ping); clearTimeout(lifetime); sseClients.delete(res); });
});

// ─── Per-user BYOK (bring your own key) + personal ideas ───────────────────
const ideaJobs = new Map();          // uid -> Promise (in-flight guard)
const ideaLastRun = new Map();       // uid -> epoch ms (rate limit)
const IDEAS_MIN_INTERVAL_MS = (parseInt(process.env.BYOK_IDEAS_MIN_INTERVAL_S) || 60) * 1000;

async function generateIdeasForUser(uid, { force = false } = {}) {
  if (!currentData) throw Object.assign(new Error('No sweep data yet — try again in a minute'), { status: 503 });
  if (ideaJobs.has(uid)) return ideaJobs.get(uid);
  const last = ideaLastRun.get(uid) || 0;
  if (!force && Date.now() - last < IDEAS_MIN_INTERVAL_MS) {
    throw Object.assign(new Error(`Rate limited — wait ${Math.ceil((IDEAS_MIN_INTERVAL_MS - (Date.now() - last)) / 1000)}s`), { status: 429 });
  }
  const job = (async () => {
    const provider = await users.providerForUser(uid);
    if (!provider) throw Object.assign(new Error('No LLM key configured — add one in Settings'), { status: 400 });
    ideaLastRun.set(uid, Date.now());
    const previous = (await users.getUser({ uid })).ideas?.ideas || [];
    const ideas = await generateLLMIdeas(provider, currentData, memory.getLastDelta(), previous);
    if (!ideas) throw Object.assign(new Error('Provider returned no usable ideas (check key/model)'), { status: 502 });
    const payload = {
      ideas, generatedAt: new Date().toISOString(), sweepTimestamp: currentData.meta?.timestamp || null,
      provider: provider.name, model: provider.model || null,
    };
    await users.saveUserIdeas(uid, payload);
    return payload;
  })().finally(() => ideaJobs.delete(uid));
  ideaJobs.set(uid, job);
  return job;
}

// After each sweep, refresh ideas for users who opted into auto mode (their key, their cost).
async function runAutoIdeas() {
  if (!AUTH_ENABLED) return;
  let list = [];
  try { list = await users.listAutoIdeaUsers(); } catch (err) { console.error('[BYOK] auto-ideas query failed:', err.message); return; }
  if (!list.length) return;
  console.log(`[BYOK] Auto-generating ideas for ${list.length} user(s)`);
  const queue = [...list];
  const worker = async () => {
    while (queue.length) {
      const { uid, email } = queue.shift();
      try {
        const r = await generateIdeasForUser(uid, { force: true });
        console.log(`[BYOK] ${email}: ${r.ideas.length} ideas via ${r.provider}`);
      } catch (err) { console.error(`[BYOK] ${email}: ${err.message}`); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, queue.length) }, worker));
}

if (AUTH_ENABLED) {
  app.get('/api/me', async (req, res) => {
    try {
      const me = await users.getUser(req.user);
      const sharedLlm = llmProvider?.isConfigured ? { provider: llmProvider.name, model: llmProvider.model || null } : null;
      res.json({ ...me, providers: users.SUPPORTED_PROVIDERS, byokEnabled: !!process.env.BYOK_ENCRYPTION_KEY, sharedLlm });
    } catch (err) { console.error('[BYOK] /api/me:', err.message); res.status(500).json({ error: 'Failed to load profile' }); }
  });

  // Permanent account deletion (App Store 5.1.1(v) / Google Play account-deletion policy). Works for both the
  // session cookie and mobile Bearer tokens. Firestore data goes first so a failed Auth delete can be retried.
  app.delete('/api/me', async (req, res) => {
    const { uid } = req.user;
    try {
      await authLib.revokeSessions(uid).catch(() => {});
      await users.deleteUserData(uid);
      await feedback.deleteFeedbackForUser(uid);
      await authLib.deleteAuthUser(uid);
      authLib.clearSessionCookie(req, res);
      console.log(`[Account] deleted ${uid}`);
      res.json({ ok: true });
      // A research job still running would write its result back after the wipe — sweep again once it settles.
      const jobs = digest.researchJobsFor(uid);
      if (jobs.length) Promise.allSettled(jobs).then(() => users.deleteUserData(uid)).catch(err => console.error(`[Account] ${uid} cleanup:`, err.message));
    } catch (err) {
      console.error(`[Account] delete ${uid}:`, err.message);
      res.status(500).json({ error: 'Account deletion failed — please retry or contact support' });
    }
  });

  // ─── Feedback (MFB Think Tank mobile app's "Send feedback") ───────────────────
  app.post('/api/feedback', express.json({ limit: '1600kb' }), async (req, res) => {
    try { res.status(201).json({ ok: true, ...(await feedback.submitFeedback(req.user, req.body || {})) }); }
    catch (err) {
      if ((err.status || 500) >= 500) console.error('[Feedback] submit:', err.message);
      res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not save feedback' });
    }
  });
  // Triage for FEEDBACK_ADMIN_EMAILS only.
  app.get('/api/feedback', async (req, res) => {
    if (!feedback.isFeedbackAdmin(req.user)) return res.status(403).json({ error: 'Forbidden' });
    try { res.json({ items: await feedback.listFeedback({ limit: Math.min(500, parseInt(req.query.limit) || 100) }) }); }
    catch (err) { console.error('[Feedback] list:', err.message); res.status(500).json({ error: 'Could not load feedback' }); }
  });
  app.get('/api/feedback/:id/screenshot', async (req, res) => {
    if (!feedback.isFeedbackAdmin(req.user)) return res.status(403).json({ error: 'Forbidden' });
    try {
      const shot = await feedback.getScreenshot(String(req.params.id).slice(0, 40));
      if (!shot) return res.status(404).json({ error: 'No screenshot' });
      res.type(shot.contentType).send(Buffer.from(shot.data));
    } catch (err) { console.error('[Feedback] screenshot:', err.message); res.status(500).json({ error: 'Could not load screenshot' }); }
  });

  app.put('/api/me/llm', async (req, res) => {
    try { res.json({ ok: true, llm: await users.saveLlmSettings(req.user, req.body || {}) }); }
    catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  });

  app.delete('/api/me/llm', async (req, res) => {
    try { await users.clearLlmSettings(req.user); res.json({ ok: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Cheap round-trip to prove the key works before the user relies on it
  app.post('/api/me/llm/test', async (req, res) => {
    try {
      const provider = await users.providerForUser(req.user.uid);
      if (!provider) return res.status(400).json({ error: 'No LLM configured' });
      const t0 = Date.now();
      const r = await provider.complete('You are a connectivity check. Reply with exactly: OK', 'ping', { maxTokens: 16, timeout: 20000 });
      res.json({ ok: true, provider: provider.name, model: provider.model, ms: Date.now() - t0, reply: String(r?.text || '').slice(0, 40) });
    } catch (err) { res.status(502).json({ error: `Provider call failed: ${err.message}` }); }
  });

  app.post('/api/ideas', async (req, res) => {
    try { res.json(await generateIdeasForUser(req.user.uid)); }
    catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  });
}

// ─── Readers Digest ───────────────────────────────────────────────────────
const digestHtml = readFileSync(join(ROOT, 'dashboard/public/digest.html'), 'utf-8');
app.get(['/digest', '/digest/:id'], (req, res) => {
  if (reactSurface('digest')) return sendReactSurface(res, 'digest', { head: spaHead() });
  res.type('html').send(digestHtml.replace('</head>', `<script>window.__HAS_TAVILY__=${!!process.env.TAVILY_API_KEY};</script>\n</head>`));
});

// ─── Live media (broadcaster HLS channels) ─────────────────────────────────
const mediaHtml = readFileSync(join(ROOT, 'dashboard/public/media.html'), 'utf-8');
app.get(['/media', '/media/:id'], (req, res) => {
  if (reactSurface('media')) return sendReactSurface(res, 'media', { head: spaHead() });
  res.type('html').send(mediaHtml);
});

// ─── Neptun live tracks (drone / missile) + Ukraine alerts via WebSocket ────
const neptun = { tracks: new Map(), alerts: null, updated: null, backoff: 1000 };
function startNeptunStream() {
  if (typeof WebSocket === 'undefined') return;
  try {
    const ws = new WebSocket('wss://neptun.in.ua/api/v1/stream');
    ws.onopen = () => { neptun.backoff = 1000; console.log('[Neptun] stream connected'); };
    ws.onmessage = (ev) => {
      let msg; try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.type === 'snapshot' && msg.data && Array.isArray(msg.data.threats)) {
        neptun.tracks.clear();
        for (const t of msg.data.threats) if (t && t.id) neptun.tracks.set(t.id, t);
        neptun.updated = Date.now();
      } else if (msg.type === 'upsert' && msg.data && msg.data.id) {
        neptun.tracks.set(msg.data.id, msg.data); neptun.updated = Date.now();
      } else if (msg.type === 'remove' && msg.data && msg.data.id) {
        neptun.tracks.delete(msg.data.id); neptun.updated = Date.now();
      } else if (msg.type === 'alerts' && msg.data) {
        neptun.alerts = msg.data;
      }
    };
    ws.onerror = () => {};
    ws.onclose = () => {
      const wait = Math.min(30000, neptun.backoff); neptun.backoff = Math.min(30000, neptun.backoff * 2);
      setTimeout(startNeptunStream, wait);
    };
  } catch { setTimeout(startNeptunStream, 30000); }
}
startNeptunStream();

// ─── Live AIS vessel positions near chokepoints (aisstream.io WebSocket, see lib/ais/stream.mjs) ───────────
// Prefer a relay (deploy/ais-relay.py on an always-on host): Cloud Run throttles CPU between requests, which
// starves a WebSocket held in this process. Without a relay, hold the stream here (fine on an always-on box).
if (process.env.AIS_RELAY_URL) {
  configureAisRelay(process.env.AIS_RELAY_URL, process.env.AIS_RELAY_TOKEN || process.env.OPENSKY_RELAY_TOKEN);
  console.log('[Crucix] AIS via relay', process.env.AIS_RELAY_URL);
} else if (process.env.AISSTREAM_API_KEY) {
  startAisStream(process.env.AISSTREAM_API_KEY);
  console.log('[Crucix] AIS stream enabled (aisstream.io) for', Object.keys(AIS_BOXES).length, 'chokepoint boxes');
}
app.get('/api/ais', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!aisEnabled()) return res.json({ enabled: false, vessels: [], boxes: {} });
  try { res.json(await aisSnapshotAsync({ maxVessels: Math.min(parseInt(req.query.max) || 1500, 4000) })); }
  catch (err) { res.status(502).json({ enabled: true, connected: false, error: err.message, vessels: [], boxes: {} }); }
});

app.get('/api/tracks', (req, res) => {
  const tracks = [...neptun.tracks.values()]
    .filter(t => t && t.lat != null && t.lon != null && t.status !== 'expired')
    .map(t => ({
      id: t.id, type: t.type, title: t.title, region: t.region, locality: t.locality,
      lat: t.lat, lon: t.lon, heading: t.heading, confidence: t.displayConfidence || t.confidenceLevel,
      sourceCount: t.sourceCount || 1, updatedAt: t.updatedAt, uncertaintyKm: t.uncertaintyKm,
      positionQuality: t.positionQuality, lifecycle: t.lifecycle, trail: t.trail || [], explanation: t.explanationShort || ''
    }))
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  res.set('Cache-Control', 'no-store');
  res.json({ updated: neptun.updated ? new Date(neptun.updated).toISOString() : null, count: tracks.length, tracks });
});

// ─── Air-raid alerts (Tzeva Adom / Pikud HaOref + Neptun Ukraine) ───────────
let alertsCache = { at: 0, data: null };
app.get('/api/alerts', async (req, res) => {
  try {
    if (alertsCache.data && Date.now() - alertsCache.at < 20000) return res.json(alertsCache.data);
    const items = [];
    let source = 'Tzeva Adom (Pikud HaOref)';
    try {
      const r = await fetch('https://api.tzevaadom.co.il/alerts-history', { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const hist = await r.json();
      const cut = Date.now() / 1000 - 6 * 3600;
      for (const h of (hist || [])) {
        for (const a of (h.alerts || [])) {
          if (a.time < cut) continue;
          items.push({ time: a.time, cities: a.cities || [], threat: a.threat, drill: !!a.isDrill, src: 'IL' });
        }
      }
    } catch { /* upstream unavailable */ }
    if (neptun.alerts && Array.isArray(neptun.alerts.raions)) {
      for (const r of neptun.alerts.raions) {
        const time = r.since ? Math.floor(new Date(r.since).getTime() / 1000) : Math.floor(Date.now() / 1000);
        items.push({ time, cities: [`${r.name || ''}, ${r.oblast || ''}`.replace(/^,\s*|,\s*$/g, '')], threat: r.level === 'red' ? 0 : 1, drill: false, src: 'UA', level: r.level });
      }
      source += ' + Neptun (UA)';
    }
    items.sort((a, b) => b.time - a.time);
    const data = { source, updated: Date.now(), items: items.slice(0, 80) };
    alertsCache = { at: Date.now(), data };
    res.json(data);
  } catch (e) { res.status(502).json({ error: 'alerts unavailable' }); }
});
// Digest write-ups and deep dives: the user's own key when saved, else the operator's shared key (budgeted) so
// people can use the app before they bring a key. Returns { provider, keyOwner } or throws a 400/429.
const digestBudget = createBudget({
  perUserPerHour: parseInt(process.env.DIGEST_SHARED_PER_USER_HOUR) || 20,
  perDay: parseInt(process.env.DIGEST_SHARED_PER_DAY) || 600,
  unit: 'write-ups',
});
async function digestProvider(req) {
  if (AUTH_ENABLED) {
    const own = await users.providerForUser(req.user.uid);
    if (own) return { provider: own, keyOwner: 'user' };
  }
  if (llmProvider?.isConfigured) {
    if (AUTH_ENABLED) {
      const b = digestBudget.take(req.user.uid);
      if (!b.ok) throw Object.assign(new Error(b.reason), { status: 429 });
    }
    return { provider: llmProvider, keyOwner: 'operator' };
  }
  throw Object.assign(new Error('No LLM configured — add your API key in settings'), { status: 400 });
}
const sendErr = (res, err) => res.status(err.status || 500).json({ error: err.message });

// ─── Map area brief: draw a shape → places inside → recent news → (optional) LLM brief ──────────────
// LLM key choice: the signed-in user's own key when they saved one, else the operator's shared key (budgeted).
const briefBudget = createBudget({
  perUserPerHour: parseInt(process.env.BRIEF_SHARED_PER_USER_HOUR) || 30,
  perDay: parseInt(process.env.BRIEF_SHARED_PER_DAY) || 400,
});
app.post('/api/map/region', async (req, res) => {
  const t0 = Date.now();
  try {
    const shape = parseShape(req.body?.shape);
    const mode = req.body?.mode === 'brief' ? 'brief' : 'articles';
    const markers = req.body?.markers && typeof req.body.markers === 'object' ? {
      counts: Object.fromEntries(Object.entries(req.body.markers.counts || {}).slice(0, 20).map(([k, v]) => [String(k).slice(0, 20), parseInt(v) || 0])),
      samples: Array.isArray(req.body.markers.samples) ? req.body.markers.samples.slice(0, 14).map(x => String(x).slice(0, 120)) : [],
    } : null;
    const { places, fallback } = placesInShape(shape);
    const { articles, total, liveErr } = await collectArticles(shape, places, {
      sweepNews: currentData?.news || [],
      digestArticles: digest.store.all(),
      live: true,
    });
    const base = { places: places.map(p => ({ name: p.name, lat: p.lat, lon: p.lon })), fallback, articles, total, liveErr, ms: Date.now() - t0 };
    if (mode !== 'brief') return res.json(base);

    // pick the key
    let provider = null, keyOwner = null;
    if (AUTH_ENABLED) { provider = await users.providerForUser(req.user.uid); if (provider) keyOwner = 'user'; }
    if (!provider && llmProvider?.isConfigured) {
      const b = briefBudget.take(req.user.uid);
      if (!b.ok) return res.status(429).json({ ...base, error: b.reason, budget: 'shared' });
      provider = llmProvider; keyOwner = 'operator';
    }
    if (!provider) return res.status(402).json({ ...base, error: 'No AI key available. Add your own key in Settings to get area briefs.', budget: 'none' });
    if (!articles.length && !(markers?.counts && Object.keys(markers.counts).length)) {
      return res.json({ ...base, brief: { headline: 'Nothing recent here', summary: 'No headlines or live markers fall inside this area in the last week.', developments: [], watch: '', tone: 'calm' }, llm: null });
    }
    const { brief, llm } = await writeBrief(provider, keyOwner, { places, articles, markers, fallback });
    res.json({ ...base, brief, llm, ms: Date.now() - t0 });
  } catch (err) {
    console.error('[MapBrief]', err.message);
    res.status(err.status || 502).json({ error: err.status ? err.message : `Brief failed: ${err.message}` });
  }
});

app.get('/api/digest/list', async (req, res) => {
  try { res.json(await digest.list({ uid: req.user.uid, filter: String(req.query.filter || 'all'), q: String(req.query.q || '').slice(0, 100), topic: String(req.query.topic || '').slice(0, 40), limit: Math.min(300, parseInt(req.query.limit) || 120) })); }
  catch (err) { console.error('[Digest] list:', err.message); sendErr(res, err); }
});
app.get('/api/digest/article/:id', async (req, res) => {
  try { const a = await digest.getFull(String(req.params.id).slice(0, 40), req.user.uid); if (!a) return res.status(404).json({ error: 'Article not found' }); res.json(a); }
  catch (err) { sendErr(res, err); }
});
app.post('/api/digest/open', async (req, res) => {
  try {
    const url = String(req.body?.url || '');
    let u; try { u = new URL(url); } catch { return res.status(400).json({ error: 'url required' }); }
    if (!['http:', 'https:'].includes(u.protocol)) return res.status(400).json({ error: 'http(s) only' });
    const a = await digest.openByUrl({ url: u.toString(), title: String(req.body?.title || '').slice(0, 220), source: String(req.body?.source || '').slice(0, 60) });
    res.json(await digest.getFull(a.id, req.user.uid));
  } catch (err) { console.error('[Digest] open:', err.message); sendErr(res, err); }
});
app.post('/api/digest/:id/feedback', async (req, res) => {
  try { const rating = Math.sign(parseInt(req.body?.rating) || 0); res.json(await digest.vote(req.user.uid, String(req.params.id).slice(0, 40), rating)); }
  catch (err) { sendErr(res, err); }
});
app.post('/api/digest/:id/summarize', async (req, res) => {
  try { const { provider, keyOwner } = await digestProvider(req); await digest.summarize(String(req.params.id).slice(0, 40), provider, keyOwner); res.json(await digest.getFull(String(req.params.id).slice(0, 40), req.user.uid)); }
  catch (err) { sendErr(res, err); }
});
app.post('/api/digest/:id/research', async (req, res) => {
  try {
    const { provider } = await digestProvider(req);
    const id = String(req.params.id).slice(0, 40);
    const existing = await digest.store.getResearch(req.user.uid, id);
    if (existing?.state === 'running' && Date.now() - new Date(existing.updatedAt || 0).getTime() < 5 * 60000) return res.status(202).json({ state: 'running' });
    digest.startResearch(req.user.uid, id, provider).catch(() => {});
    res.status(202).json({ state: 'running' });
  } catch (err) { sendErr(res, err); }
});
app.get('/api/digest/:id/research', async (req, res) => {
  try { const r = await digest.store.getResearch(req.user.uid, String(req.params.id).slice(0, 40)); res.json(r || { state: 'none' }); }
  catch (err) { sendErr(res, err); }
});

function broadcast(data) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try { client.write(msg); } catch { sseClients.delete(client); }
  }
}

// === Sweep Cycle ===
const SWEEP_STALE_MS = 12 * 60 * 1000;
async function runSweepCycle() {
  if (sweepInProgress) {
    const age = sweepStartedAt ? Date.now() - new Date(sweepStartedAt).getTime() : 0;
    if (age < SWEEP_STALE_MS) {
      console.log('[Crucix] Sweep already in progress, skipping');
      return;
    }
    // A sweep that started outside a request on a CPU-throttled host can stall; don't let it block forever
    console.warn(`[Crucix] Previous sweep has been running ${Math.round(age / 1000)}s — treating as stale and starting a new one`);
  }

  sweepInProgress = true;
  sweepStartedAt = new Date().toISOString();
  broadcast({ type: 'sweep_start', timestamp: sweepStartedAt });
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[Crucix] Starting sweep at ${new Date().toLocaleTimeString()}`);
  console.log(`${'='.repeat(60)}`);

  try {
    // 1. Run the full briefing sweep
    const rawData = await fullBriefing();

    // 2. Synthesize into dashboard format
    console.log('[Crucix] Synthesizing dashboard data...');
    const synthesized = await synthesize(rawData);

    // 3. Save to runs/latest.json, with the geo-tagged news so a cold-started instance can reuse it
    rawData.news = synthesized.news || [];
    writeFileSync(join(RUNS_DIR, 'latest.json'), JSON.stringify(rawData, null, 2));
    lastSweepTime = new Date().toISOString();

    // 4. Delta computation + memory
    const delta = memory.addRun(synthesized);
    synthesized.delta = delta;

    // 5. LLM-powered trade ideas (LLM-only feature) — isolated so failures don't kill sweep
    if (llmProvider?.isConfigured) {
      try {
        console.log('[Crucix] Generating LLM trade ideas...');
        const previousIdeas = memory.getLastRun()?.ideas || [];
        const llmIdeas = await generateLLMIdeas(llmProvider, synthesized, delta, previousIdeas);
        if (llmIdeas) {
          synthesized.ideas = llmIdeas;
          synthesized.ideasSource = 'llm';
          console.log(`[Crucix] LLM generated ${llmIdeas.length} ideas`);
        } else {
          synthesized.ideas = generateIdeas(synthesized);
          synthesized.ideasSource = 'rules';
        }
      } catch (llmErr) {
        console.error('[Crucix] LLM ideas failed (non-fatal):', llmErr.message);
        synthesized.ideas = generateIdeas(synthesized);
        synthesized.ideasSource = 'rules';
      }
    } else {
      synthesized.ideas = generateIdeas(synthesized);
      synthesized.ideasSource = 'rules';
    }

    currentData = synthesized;

    // 6. Push to all connected browsers
    broadcast({ type: 'update', data: currentData });

    // 7. Per-user BYOK ideas for opted-in users (non-blocking)
    runAutoIdeas().catch(err => console.error('[BYOK] auto-ideas error:', err.message));

    // 8. Readers Digest ingest — awaited so it gets CPU inside the scheduler request on Cloud Run
    if (DIGEST_AFTER_SWEEP) {
      try { await digest.ingest(); } catch (err) { console.error('[Digest] ingest error:', err.message); }
    }

    console.log(`[Crucix] Sweep complete — ${currentData.meta.sourcesOk}/${currentData.meta.sourcesQueried} sources OK`);
    console.log(`[Crucix] ${currentData.ideas.length} ideas (${synthesized.ideasSource}) | ${currentData.news.length} news | ${currentData.newsFeed.length} feed items`);
    if (delta?.summary) console.log(`[Crucix] Delta: ${delta.summary.totalChanges} changes, ${delta.summary.criticalChanges} critical, direction: ${delta.summary.direction}`);
    console.log(`[Crucix] Next sweep at ${new Date(Date.now() + config.refreshIntervalMinutes * 60000).toLocaleTimeString()}`);

  } catch (err) {
    console.error('[Crucix] Sweep failed:', err.message);
    broadcast({ type: 'sweep_error', error: err.message });
  } finally {
    sweepInProgress = false;
  }
}

// Any unmatched /api path is a JSON 404, never the HTML shell or a page. Previously the default
// Express 404 answered unknown API paths with HTML, which the migration contract forbids.
app.use('/api', (req, res) => res.status(404).json({ error: 'not found' }));

// === Startup ===
// Render the startup banner. The frame width is derived from the contents so the
// box stays aligned — and nothing is truncated — for any port, refresh interval
// or provider name. The previous hand-counted padding assumed a 4-digit port and
// threw `RangeError: Invalid count value: -1` for anything above 9999.
const BANNER_MIN_WIDTH = 46;

function renderBanner(title, subtitle, rows) {
  const body = rows.map(([label, value]) => `  ${label.padEnd(12)}${value}`);
  const width = Math.max(BANNER_MIN_WIDTH, ...body.map(l => l.length), title.length + 2, subtitle.length + 2);
  const center = (s) => {
    const left = Math.floor((width - s.length) / 2);
    return ' '.repeat(left) + s + ' '.repeat(width - s.length - left);
  };
  const rule = '═'.repeat(width);

  return [
    '',
    `  ╔${rule}╗`,
    `  ║${center(title)}║`,
    `  ║${center(subtitle)}║`,
    `  ╠${rule}╣`,
    ...body.map(l => `  ║${l.padEnd(width)}║`),
    `  ╚${rule}╝`,
    '  ',
  ].join('\n');
}

async function start() {
  const port = config.port;

  console.log(renderBanner('MFB SERVICES INTELLIGENCE', 'Crucix engine · 28 Sources', [
    ['Dashboard:', `http://localhost:${port}`],
    ['Health:', `http://localhost:${port}/api/health`],
    ['LLM:', config.llm.provider || 'disabled (users may BYOK)'],
    ['Auth:', AUTH_ENABLED ? 'firebase' : 'OFF'],
    ['Sweeps:', config.sweep.mode === 'external' ? 'external trigger' : `every ${config.refreshIntervalMinutes} min`],
  ]));

  // With the dev adapter enabled, bind loopback only so the Vite-backed dev origin is never exposed
  // on every interface; production keeps the existing default bind.
  const server = DEV_UI && !process.env.HOST ? app.listen(port, '127.0.0.1') : app.listen(port);

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[Crucix] FATAL: Port ${port} is already in use!`);
      console.error(`[Crucix] A previous Crucix instance may still be running.`);
      console.error(`[Crucix] Fix:  taskkill /F /IM node.exe   (Windows)`);
      console.error(`[Crucix]       kill $(lsof -ti:${port})   (macOS/Linux)`);
      console.error(`[Crucix] Or change PORT in .env\n`);
    } else {
      console.error(`[Crucix] Server error:`, err.stack || err.message);
    }
    process.exit(1);
  });

  server.on('listening', async () => {
    console.log(`[Crucix] Server running on http://localhost:${port}`);

    // Auto-open browser
    // NOTE: On Windows, `start` in PowerShell is an alias for Start-Service, not cmd's start.
    // We must use `cmd /c start ""` to ensure it works in both cmd.exe and PowerShell.
    if (!IN_CONTAINER && process.env.CRUCIX_OPEN_BROWSER !== 'false') {
      const openCmd = process.platform === 'win32' ? 'cmd /c start ""' :
                      process.platform === 'darwin' ? 'open' : 'xdg-open';
      exec(`${openCmd} "http://localhost:${port}"`, (err) => {
        if (err) console.log('[Crucix] Could not auto-open browser:', err.message);
      });
    }

    // Try to load existing data first for instant display (await so dashboard shows immediately)
    try {
      const existing = JSON.parse(readFileSync(join(RUNS_DIR, 'latest.json'), 'utf8'));
      const data = await synthesize(existing);
      currentData = data;
      console.log('[Crucix] Loaded existing data from runs/latest.json — dashboard ready instantly');
      broadcast({ type: 'update', data: currentData });
    } catch {
      console.log('[Crucix] No existing data found — first sweep required');
    }

    if (config.sweep.mode === 'external') {
      // Cloud Run-style hosts only give CPU during requests, so the scheduler's POST *is* the sweep.
      // Running one here would crawl and block the first scheduled sweep.
      console.log('[Crucix] SWEEP_MODE=external — sweeps run on POST /api/internal/sweep (no startup sweep)');
    } else {
      // Run first sweep (refreshes data in background)
      console.log('[Crucix] Running initial sweep...');
      runSweepCycle().catch(err => {
        console.error('[Crucix] Initial sweep failed:', err.message || err);
      });
      // Schedule recurring sweeps
      setInterval(runSweepCycle, config.refreshIntervalMinutes * 60 * 1000);
    }
  });
}

// Graceful error handling — log full stack traces for diagnosis
process.on('unhandledRejection', (err) => {
  console.error('[Crucix] Unhandled rejection:', err?.stack || err?.message || err);
});
process.on('uncaughtException', (err) => {
  console.error('[Crucix] Uncaught exception:', err?.stack || err?.message || err);
});

start().catch(err => {
  console.error('[Crucix] FATAL — Server failed to start:', err?.stack || err?.message || err);
  process.exit(1);
});
