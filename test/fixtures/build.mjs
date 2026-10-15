// Fixture-build harness (P0).
//
// Turns a raw sweep fixture (what the server reads from RUNS_DIR and hands to synthesize()) into
// the synthesized /api/data envelope the browser actually receives. Both fixture families live in
// test/fixtures: runs/*.json (raw) and synthesized/*.json (derived). The no-diff test in
// test/fixtures.test.mjs proves the derived files are exactly what this harness regenerates.
//
// synthesize() is not deterministic on its own: it stamps GDELT items with the current time, applies
// 30-day/24-hour cutoffs from Date.now(), fetches 19 RSS feeds, and (when a fixture has no OpenSky
// hotspots) reads the repository's runs/ directory. This harness neutralizes all four:
//   - withFrozenClock pins Date.now() and new Date() to a fixed instant,
//   - fetchNews is injected to return nothing so the fixture's stored news is reused offline,
//   - runsDir points at an empty directory so the OpenSky fallback finds nothing.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { synthesize } from '../../dashboard/inject.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

export const RUNS_DIR = join(HERE, 'runs');
export const SYNTH_DIR = join(HERE, 'synthesized');
// A directory with no briefing_*.json so loadOpenSkyFallback() returns null deterministically.
export const EMPTY_RUNS_DIR = join(HERE, 'empty-runs');

// Fixed instant every fixture build resolves "now" to.
export const FROZEN_NOW = Date.parse('2026-10-14T12:00:00.000Z');

// Run `fn` with Date.now() and new Date() pinned to `now`. Must be awaited: synthesize() is async,
// and restoring the clock from a synchronous finally block would let it resume on the real clock.
export async function withFrozenClock(now, fn) {
  const RealDate = Date;
  class FrozenDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(now);
      else super(...args);
    }
    static now() { return now; }
  }
  globalThis.Date = FrozenDate;
  try {
    return await fn();
  } finally {
    globalThis.Date = RealDate;
  }
}

// synthesize() reuses data.news only when its fetcher returns nothing; an empty fetcher keeps
// fixture builds offline and lets every raw fixture's stored news drive the output.
export const OFFLINE_FETCH_NEWS = async () => [];

export async function buildSynthesized(raw, { now = FROZEN_NOW } = {}) {
  return withFrozenClock(now, () =>
    synthesize(raw, { fetchNews: OFFLINE_FETCH_NEWS, runsDir: EMPTY_RUNS_DIR })
  );
}

export function rawFixturePath(name) { return join(RUNS_DIR, `${name}.json`); }
export function synthFixturePath(name) { return join(SYNTH_DIR, `${name}.json`); }

export function listRawFixtures() {
  return readdirSync(RUNS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace(/\.json$/, ''))
    .sort();
}

export function loadRaw(name) {
  return JSON.parse(readFileSync(rawFixturePath(name), 'utf8'));
}

export function loadSynthesizedText(name) {
  return readFileSync(synthFixturePath(name), 'utf8');
}

export async function renderSynthesized(name) {
  return buildSynthesized(loadRaw(name));
}

// Recursively sort object keys so regeneration is byte-stable regardless of insertion order.
export function stableStringify(value) {
  return JSON.stringify(sortKeys(value), null, 2) + '\n';
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortKeys(value[key]);
    return out;
  }
  return value;
}
