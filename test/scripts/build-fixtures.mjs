// Regenerate test/fixtures/synthesized/*.json from test/fixtures/runs/*.json.
// Run with: npm run fixtures:build
// The no-diff test (test/fixtures.test.mjs) fails when these drift.
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  EMPTY_RUNS_DIR,
  SYNTH_DIR,
  listRawFixtures,
  renderSynthesized,
  stableStringify,
} from '../fixtures/build.mjs';

mkdirSync(SYNTH_DIR, { recursive: true });
mkdirSync(EMPTY_RUNS_DIR, { recursive: true });

const names = listRawFixtures();
if (!names.length) {
  console.error('No raw fixtures found in test/fixtures/runs/');
  process.exit(1);
}

for (const name of names) {
  const out = stableStringify(await renderSynthesized(name));
  writeFileSync(new URL(`../fixtures/synthesized/${name}.json`, import.meta.url), out);
  console.log(`built synthesized/${name}.json (${out.length} bytes)`);
}
console.log(`\n${names.length} synthesized fixture(s) written.`);
