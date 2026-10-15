// P0 gate: the derived /api/data fixtures must be exactly what the harness regenerates from the
// raw sweep fixtures, and synthesis must be deterministic across repeated runs.
//
// Runs under `npm test` (node --test) alongside the backend unit tests. It imports synthesize()
// with the offline/test seams and never touches the network.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  listRawFixtures,
  loadSynthesizedText,
  renderSynthesized,
  stableStringify,
} from './fixtures/build.mjs';

test('raw fixtures exist', () => {
  const names = listRawFixtures();
  assert.ok(names.length >= 5, `expected at least 5 raw fixtures, found ${names.length}: ${names.join(', ')}`);
});

test('synthesized fixtures regenerate with no diff', async () => {
  const names = listRawFixtures();
  for (const name of names) {
    let committed;
    try {
      committed = loadSynthesizedText(name);
    } catch {
      assert.fail(`missing synthesized/${name}.json — run: npm run fixtures:build`);
    }
    const generated = stableStringify(await renderSynthesized(name));
    assert.equal(
      generated,
      committed,
      `synthesized/${name}.json is stale — run: npm run fixtures:build`,
    );
  }
});

test('synthesis is deterministic across repeated runs', async () => {
  const names = listRawFixtures();
  for (const name of names) {
    const first = stableStringify(await renderSynthesized(name));
    const second = stableStringify(await renderSynthesized(name));
    assert.equal(first, second, `${name} produced different output across two runs`);
  }
});

test('the empty fixture synthesizes without throwing and yields empty panels', async () => {
  const v = await renderSynthesized('empty');
  assert.deepEqual(v.air, []);
  assert.deepEqual(v.news, []);
  assert.ok(Array.isArray(v.health));
});

test('hostile fixture content is preserved as data, never markup', async () => {
  const v = await renderSynthesized('hostile');
  // synthesize() does not render HTML; hostile strings must survive as plain data so the client-side
  // sanitizer can be exercised against them.
  const blob = JSON.stringify(v);
  assert.ok(blob.includes('<script>'), 'expected the hostile <script> payload to survive as data');
});
