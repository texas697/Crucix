// P1 gate: the development Vite adapter must never expose repository files. Starts the real server
// with UI_DEV=1 and asserts that server.mjs, deploy/env.yaml and /@fs/ paths cannot be fetched.
//
// Spawns server.mjs rather than importing it: the server has no factory seam and starts on import
// (a P0 finding). Everything runs against a temporary RUNS_DIR with auth off and external sweeps.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = process.cwd();
const PORT = 4199;
const BASE = `http://127.0.0.1:${PORT}`;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForHealth(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/healthz`);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await wait(500);
  }
  throw new Error('server did not become healthy in time');
}

test('dev adapter cannot serve files outside dashboard/react', { timeout: 90_000 }, async (t) => {
  const runs = mkdtempSync(join(tmpdir(), 'crucix-dev-'));
  const child = spawn('node', ['server.mjs'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      AUTH_MODE: 'off',
      SWEEP_MODE: 'external',
      RUNS_DIR: runs,
      CRUCIX_OPEN_BROWSER: 'false',
      UI_DEV: '1',
      UI_DASHBOARD: 'react',
      NODE_ENV: 'development',
    },
    stdio: ['ignore', 'ignore', 'ignore'],
  });

  t.after(() => {
    child.kill('SIGKILL');
    rmSync(runs, { recursive: true, force: true });
  });

  await waitForHealth();

  const targets = [
    '/server.mjs',
    '/deploy/env.yaml',
    `/@fs/${ROOT}/server.mjs`,
    `/@fs/${ROOT}/deploy/env.yaml`,
  ];

  for (const path of targets) {
    const res = await fetch(BASE + path);
    assert.ok(
      res.status === 403 || res.status === 404,
      `${path} returned ${res.status}; expected 403 or 404`,
    );
    const body = await res.text();
    assert.ok(!body.includes('createDigest'), `${path} leaked server source`);
  }
});
