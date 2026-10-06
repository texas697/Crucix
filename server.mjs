#!/usr/bin/env node
// Crucix Intelligence Engine — Dev Server
// Serves the Jarvis dashboard, runs sweep cycle, pushes live updates via SSE

import express from 'express';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import config from './crucix.config.mjs';
import { getLocale, currentLanguage, getSupportedLocales } from './lib/i18n.mjs';
import { fullBriefing } from './apis/briefing.mjs';
import { synthesize, generateIdeas } from './dashboard/inject.mjs';
import { MemoryManager } from './lib/delta/index.mjs';
import { createLLMProvider } from './lib/llm/index.mjs';
import { generateLLMIdeas } from './lib/llm/ideas.mjs';
import { TelegramAlerter } from './lib/alerts/telegram.mjs';
import { DiscordAlerter } from './lib/alerts/discord.mjs';
import * as users from './lib/auth/users.mjs';
import { createDigest } from './lib/digest/index.mjs';

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

// === LLM + Telegram + Discord ===
const llmProvider = createLLMProvider(config.llm);
const telegramAlerter = new TelegramAlerter(config.telegram);
const discordAlerter = new DiscordAlerter(config.discord || {});

if (llmProvider) console.log(`[Crucix] LLM enabled: ${llmProvider.name} (${llmProvider.model})`);

// === Readers Digest ===
const digest = createDigest({ db: () => authLib.db(), authEnabled: AUTH_ENABLED, operatorProvider: llmProvider?.isConfigured ? llmProvider : null });
if (AUTH_ENABLED) digest.init().catch(err => console.error('[Digest] init failed:', err.message));
const DIGEST_AFTER_SWEEP = (process.env.DIGEST_AFTER_SWEEP || 'true').toLowerCase() !== 'false';
if (telegramAlerter.isConfigured) {
  console.log('[Crucix] Telegram alerts enabled');

  // ─── Two-Way Bot Commands ───────────────────────────────────────────────

  telegramAlerter.onCommand('/status', async () => {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const sourcesOk = currentData?.meta?.sourcesOk || 0;
    const sourcesTotal = currentData?.meta?.sourcesQueried || 0;
    const sourcesFailed = currentData?.meta?.sourcesFailed || 0;
    const llmStatus = llmProvider?.isConfigured ? `✅ ${llmProvider.name}` : '❌ Disabled';
    const nextSweep = lastSweepTime
      ? new Date(new Date(lastSweepTime).getTime() + config.refreshIntervalMinutes * 60000).toLocaleTimeString()
      : 'pending';

    return [
      `🖥️ *CRUCIX STATUS*`,
      ``,
      `Uptime: ${h}h ${m}m`,
      `Last sweep: ${lastSweepTime ? new Date(lastSweepTime).toLocaleTimeString() + ' UTC' : 'never'}`,
      `Next sweep: ${nextSweep} UTC`,
      `Sweep in progress: ${sweepInProgress ? '🔄 Yes' : '⏸️ No'}`,
      `Sources: ${sourcesOk}/${sourcesTotal} OK${sourcesFailed > 0 ? ` (${sourcesFailed} failed)` : ''}`,
      `LLM: ${llmStatus}`,
      `SSE clients: ${sseClients.size}`,
      `Dashboard: ${config.publicUrl || `http://localhost:${config.port}`}`,
    ].join('\n');
  });

  telegramAlerter.onCommand('/sweep', async () => {
    if (sweepInProgress) return '🔄 Sweep already in progress. Please wait.';
    // Fire and forget — don't block the bot response
    runSweepCycle().catch(err => console.error('[Crucix] Manual sweep failed:', err.message));
    return '🚀 Manual sweep triggered. You\'ll receive alerts if anything significant is detected.';
  });

  telegramAlerter.onCommand('/brief', async () => {
    if (!currentData) return '⏳ No data yet — waiting for first sweep to complete.';

    const tg = currentData.tg || {};
    const energy = currentData.energy || {};
    const metals = currentData.metals || {};
    const delta = memory.getLastDelta();
    const ideas = (currentData.ideas || []).slice(0, 3);

    const sections = [
      `📋 *CRUCIX BRIEF*`,
      `_${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC_`,
      ``,
    ];

    // Delta direction
    if (delta?.summary) {
      const dirEmoji = { 'risk-off': '📉', 'risk-on': '📈', 'mixed': '↔️' }[delta.summary.direction] || '↔️';
      sections.push(`${dirEmoji} Direction: *${delta.summary.direction.toUpperCase()}* | ${delta.summary.totalChanges} changes, ${delta.summary.criticalChanges} critical`);
      sections.push('');
    }

    // Key metrics
    const vix = currentData.fred?.find(f => f.id === 'VIXCLS');
    const hy = currentData.fred?.find(f => f.id === 'BAMLH0A0HYM2');
    if (vix || energy.wti || metals.gold || metals.silver) {
      sections.push(`📊 VIX: ${vix?.value || '--'} | WTI: $${energy.wti || '--'} | Brent: $${energy.brent || '--'}`);
      sections.push(`   Gold: $${metals.gold || '--'} | Silver: $${metals.silver || '--'}${hy ? ` | HY Spread: ${hy.value}` : ''}`);
      sections.push(`   NatGas: $${energy.natgas || '--'}`);
      sections.push('');
    }

    // OSINT
    if (tg.urgent?.length > 0) {
      sections.push(`📡 OSINT: ${tg.urgent.length} urgent signals, ${tg.posts || 0} total posts`);
      // Top 2 urgent
      for (const p of tg.urgent.slice(0, 2)) {
        sections.push(`  • ${(p.text || '').substring(0, 80)}`);
      }
      sections.push('');
    }

    // Top ideas
    if (ideas.length > 0) {
      sections.push(`💡 *Top Ideas:*`);
      for (const idea of ideas) {
        sections.push(`  ${idea.type === 'long' ? '📈' : idea.type === 'hedge' ? '🛡️' : '👁️'} ${idea.title}`);
      }
    }

    return sections.join('\n');
  });

  telegramAlerter.onCommand('/portfolio', async () => {
    return '📊 Portfolio integration requires Alpaca MCP connection.\nUse the Crucix dashboard or Claude agent for portfolio queries.';
  });

  // Start polling for bot commands
  telegramAlerter.startPolling(config.telegram.botPollingInterval);
}

// === Discord Bot ===
if (discordAlerter.isConfigured) {
  console.log('[Crucix] Discord bot enabled');

  // Reuse the same command handlers as Telegram (DRY)
  discordAlerter.onCommand('status', async () => {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const sourcesOk = currentData?.meta?.sourcesOk || 0;
    const sourcesTotal = currentData?.meta?.sourcesQueried || 0;
    const sourcesFailed = currentData?.meta?.sourcesFailed || 0;
    const llmStatus = llmProvider?.isConfigured ? `✅ ${llmProvider.name}` : '❌ Disabled';
    const nextSweep = lastSweepTime
      ? new Date(new Date(lastSweepTime).getTime() + config.refreshIntervalMinutes * 60000).toLocaleTimeString()
      : 'pending';

    return [
      `**🖥️ CRUCIX STATUS**\n`,
      `Uptime: ${h}h ${m}m`,
      `Last sweep: ${lastSweepTime ? new Date(lastSweepTime).toLocaleTimeString() + ' UTC' : 'never'}`,
      `Next sweep: ${nextSweep} UTC`,
      `Sweep in progress: ${sweepInProgress ? '🔄 Yes' : '⏸️ No'}`,
      `Sources: ${sourcesOk}/${sourcesTotal} OK${sourcesFailed > 0 ? ` (${sourcesFailed} failed)` : ''}`,
      `LLM: ${llmStatus}`,
      `SSE clients: ${sseClients.size}`,
      `Dashboard: ${config.publicUrl || `http://localhost:${config.port}`}`,
    ].join('\n');
  });

  discordAlerter.onCommand('sweep', async () => {
    if (sweepInProgress) return '🔄 Sweep already in progress. Please wait.';
    runSweepCycle().catch(err => console.error('[Crucix] Manual sweep failed:', err.message));
    return '🚀 Manual sweep triggered. You\'ll receive alerts if anything significant is detected.';
  });

  discordAlerter.onCommand('brief', async () => {
    if (!currentData) return '⏳ No data yet — waiting for first sweep to complete.';

    const tg = currentData.tg || {};
    const energy = currentData.energy || {};
    const metals = currentData.metals || {};
    const delta = memory.getLastDelta();
    const ideas = (currentData.ideas || []).slice(0, 3);

    const sections = [`**📋 CRUCIX BRIEF**\n_${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC_\n`];

    if (delta?.summary) {
      const dirEmoji = { 'risk-off': '📉', 'risk-on': '📈', 'mixed': '↔️' }[delta.summary.direction] || '↔️';
      sections.push(`${dirEmoji} Direction: **${delta.summary.direction.toUpperCase()}** | ${delta.summary.totalChanges} changes, ${delta.summary.criticalChanges} critical\n`);
    }

    const vix = currentData.fred?.find(f => f.id === 'VIXCLS');
    const hy = currentData.fred?.find(f => f.id === 'BAMLH0A0HYM2');
    if (vix || energy.wti || metals.gold || metals.silver) {
      sections.push(`📊 VIX: ${vix?.value || '--'} | WTI: $${energy.wti || '--'} | Brent: $${energy.brent || '--'}`);
      sections.push(`   Gold: $${metals.gold || '--'} | Silver: $${metals.silver || '--'}${hy ? ` | HY Spread: ${hy.value}` : ''}`);
      sections.push(`   NatGas: $${energy.natgas || '--'}`);
      sections.push('');
    }

    if (tg.urgent?.length > 0) {
      sections.push(`📡 OSINT: ${tg.urgent.length} urgent signals, ${tg.posts || 0} total posts`);
      for (const p of tg.urgent.slice(0, 2)) {
        sections.push(`  • ${(p.text || '').substring(0, 80)}`);
      }
      sections.push('');
    }

    if (ideas.length > 0) {
      sections.push(`**💡 Top Ideas:**`);
      for (const idea of ideas) {
        sections.push(`  ${idea.type === 'long' ? '📈' : idea.type === 'hedge' ? '🛡️' : '👁️'} ${idea.title}`);
      }
    }

    return sections.join('\n');
  });

  discordAlerter.onCommand('portfolio', async () => {
    return '📊 Portfolio integration requires Alpaca MCP connection.\nUse the Crucix dashboard or Claude agent for portfolio queries.';
  });

  // Start the Discord bot (non-blocking — connection happens async)
  discordAlerter.start().catch(err => {
    console.error('[Crucix] Discord bot startup failed (non-fatal):', err.message);
  });
}

// === Express Server ===
const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');
app.use((req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next(); });
app.use(express.json({ limit: '32kb' }));

// ─── Public routes (no auth) ───────────────────────────────────────────────
// Minimal liveness probe for Docker/Cloud Run — leaks nothing. (Google's front end swallows a bare /healthz.)
app.get('/api/healthz', (req, res) => res.json({ status: 'ok', uptime: Math.floor((Date.now() - startTime) / 1000) }));

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

  // Everything below this line requires a valid session
  const gate = authLib.requireAuth();
  app.use((req, res, next) => (req.path.startsWith('/api/internal/') ? next() : gate(req, res, next)));
} else {
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

app.use(express.static(join(ROOT, 'dashboard/public'), { index: false }));

// Serve loading page until first sweep completes, then the dashboard with injected locale
app.get('/', (req, res) => {
  if (!currentData) {
    res.sendFile(join(ROOT, 'dashboard/public/loading.html'));
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
    telegramEnabled: !!(config.telegram.botToken && config.telegram.chatId),
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
app.get('/events', (req, res) => {
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
  req.on('close', () => { clearInterval(ping); sseClients.delete(res); });
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
      res.json({ ...me, providers: users.SUPPORTED_PROVIDERS, byokEnabled: !!process.env.BYOK_ENCRYPTION_KEY });
    } catch (err) { console.error('[BYOK] /api/me:', err.message); res.status(500).json({ error: 'Failed to load profile' }); }
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
app.get('/digest', (req, res) => {
  res.type('html').send(digestHtml.replace('</head>', `<script>window.__HAS_TAVILY__=${!!process.env.TAVILY_API_KEY};</script>\n</head>`));
});
const userProvider = async (req) => (AUTH_ENABLED ? users.providerForUser(req.user.uid) : (llmProvider?.isConfigured ? llmProvider : null));
const sendErr = (res, err) => res.status(err.status || 500).json({ error: err.message });

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
  try { await digest.summarize(String(req.params.id).slice(0, 40), await userProvider(req), AUTH_ENABLED ? 'user' : 'operator'); res.json(await digest.getFull(String(req.params.id).slice(0, 40), req.user.uid)); }
  catch (err) { sendErr(res, err); }
});
app.post('/api/digest/:id/research', async (req, res) => {
  try {
    const provider = await userProvider(req);
    if (!provider) return res.status(400).json({ error: 'No LLM configured — add your API key in settings' });
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

    // 2. Save to runs/latest.json
    writeFileSync(join(RUNS_DIR, 'latest.json'), JSON.stringify(rawData, null, 2));
    lastSweepTime = new Date().toISOString();

    // 3. Synthesize into dashboard format
    console.log('[Crucix] Synthesizing dashboard data...');
    const synthesized = await synthesize(rawData);

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

    // 6. Alert evaluation — Telegram + Discord (LLM with rule-based fallback, multi-tier, semantic dedup)
    if (delta?.summary?.totalChanges > 0) {
      if (telegramAlerter.isConfigured) {
        telegramAlerter.evaluateAndAlert(llmProvider, delta, memory).catch(err => {
          console.error('[Crucix] Telegram alert error:', err.message);
        });
      }
      if (discordAlerter.isConfigured) {
        discordAlerter.evaluateAndAlert(llmProvider, delta, memory).catch(err => {
          console.error('[Crucix] Discord alert error:', err.message);
        });
      }
    }

    // 7. Post actionable ideas to Discord (HIGH confidence, short horizon, Kalshi-style)
    if (discordAlerter.isConfigured && synthesized.ideas?.length > 0) {
      discordAlerter.sendActionableIdeas(synthesized.ideas).catch(err => {
        console.error('[Crucix] Discord idea alert error:', err.message);
      });
    }

    // Prune old alerted signals
    memory.pruneAlertedSignals();

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

  console.log(renderBanner('MFB SERVICES INTELLIGENCE', 'Crucix engine · 29 Sources', [
    ['Dashboard:', `http://localhost:${port}`],
    ['Health:', `http://localhost:${port}/api/health`],
    ['LLM:', config.llm.provider || 'disabled (users may BYOK)'],
    ['Auth:', AUTH_ENABLED ? 'firebase' : 'OFF'],
    ['Sweeps:', config.sweep.mode === 'external' ? 'external trigger' : `every ${config.refreshIntervalMinutes} min`],
    ['Telegram:', config.telegram.botToken ? 'enabled' : 'disabled'],
    ['Discord:', config.discord?.botToken ? 'enabled' : config.discord?.webhookUrl ? 'webhook only' : 'disabled'],
  ]));

  const server = app.listen(port);

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
