// P8 standalone export tests. Pure, offline and deterministic: they exercise the injection helpers
// and the `--llm` idea decision without a browser, a server or any credentials. Runs under `npm test`
// (node --test test/*.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SNAPSHOT_MARKER,
  escapeSnapshotJson,
  injectIntoHtml,
  resolveIdeas,
} from '../dashboard/inject.mjs';

test('legacy `let D` templates keep the historical substitution', () => {
  const html = '<html>\n<script>\nlet D = {"old":true,"keep":1};\n</script>\n</html>';
  const result = injectIntoHtml(html, { hello: 'world' });
  assert.equal(result.mode, 'legacy');
  assert.match(result.html, /^<html>\n<script>\nlet D = \{"hello":"world"\};/);
  assert.doesNotMatch(result.html, /"old":true/);
});

test('legacy `const D` templates are recognised too', () => {
  const html = '<script>\nconst D = {};\n</script>';
  const result = injectIntoHtml(html, { a: 1 });
  assert.equal(result.mode, 'legacy');
  assert.match(result.html, /let D = \{"a":1\};/);
});

test('the new React marker is substituted', () => {
  const html = `<script>\n${SNAPSHOT_MARKER}\n</script>`;
  const result = injectIntoHtml(html, { a: 1 });
  assert.equal(result.mode, 'snapshot');
  assert.match(result.html, /window\.__CRUCIX_SNAPSHOT__ = \{"a":1\}; \/\* CRUCIX_SNAPSHOT \*\//);
  assert.doesNotMatch(result.html, /= \{\};/);
});

test('the snapshot substitution escapes `</script` and `<!--`', () => {
  const json = escapeSnapshotJson({ text: '</script><script>alert(1)</script><!-- evil -->' });
  assert.ok(!json.includes('</script'), 'raw </script must not survive');
  assert.ok(!json.includes('<!--'), 'raw <!-- must not survive');
  // The escaped payload still round-trips as JSON when the HTML parser un-escapes it.
  assert.deepEqual(JSON.parse(json.replace(/<\\\//g, '</').replace(/<\\!--/g, '<!--')), {
    text: '</script><script>alert(1)</script><!-- evil -->',
  });
});

test('unrecognized templates are rejected without modification', () => {
  const html = '<html><body><p>nothing to inject into</p></body></html>';
  const result = injectIntoHtml(html, { a: 1 });
  assert.equal(result.html, null);
  assert.equal(result.mode, 'unrecognized');
});

test('--llm default OFF: rule-based ideas and no provider is ever constructed', async () => {
  let providerCalls = 0;
  const logs = [];
  const V2 = { fred: [], bls: [] };
  const result = await resolveIdeas(V2, {
    useLlm: false,
    // Spy: any call means the default export would have contacted a provider.
    providerFactory: () => { providerCalls += 1; return { isConfigured: true, name: 'spy' }; },
    generateLLM: async () => { throw new Error('generateLLMIdeas must not be called without --llm'); },
    generateRules: () => [{ title: 'rule-based' }],
    log: (m) => logs.push(String(m)),
  });
  assert.equal(providerCalls, 0, 'provider factory must not run without --llm');
  assert.deepEqual(V2.ideas, [{ title: 'rule-based' }]);
  assert.equal(V2.ideasSource, 'rules');
  assert.equal(result.source, 'rules');
  assert.ok(logs.some((l) => /rule-based/i.test(l)), 'should report the rules mode');
});

test('--llm opt-in uses the configured provider', async () => {
  let providerCalls = 0;
  const V2 = {};
  const result = await resolveIdeas(V2, {
    useLlm: true,
    providerFactory: () => { providerCalls += 1; return { isConfigured: true, name: 'spy' }; },
    generateLLM: async () => [{ title: 'llm' }],
    generateRules: () => [{ title: 'rule-based' }],
    log: () => {},
  });
  assert.equal(providerCalls, 1);
  assert.deepEqual(V2.ideas, [{ title: 'llm' }]);
  assert.equal(V2.ideasSource, 'llm');
  assert.equal(result.source, 'llm');
  assert.equal(result.provider, 'spy');
});

test('--llm with no configured provider falls back to rules', async () => {
  let llmCalls = 0;
  const V2 = {};
  const result = await resolveIdeas(V2, {
    useLlm: true,
    providerFactory: () => null,
    generateLLM: async () => { llmCalls += 1; return []; },
    generateRules: () => [{ title: 'rule-based' }],
    log: () => {},
  });
  assert.equal(llmCalls, 0);
  assert.equal(V2.ideasSource, 'rules');
  assert.equal(result.source, 'rules');
  assert.equal(result.provider, null);
});
