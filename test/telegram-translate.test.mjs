import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTranslator } from '../lib/telegram/translate.mjs';

function fakeProvider(reply, calls) {
  return {
    isConfigured: true,
    async complete(system, user) {
      calls.push(JSON.parse(user));
      return { text: typeof reply === 'function' ? reply(JSON.parse(user)) : reply, usage: {}, model: 'fake' };
    },
  };
}

test('translates non-English posts, leaves English ones untouched, and caches by chat and id', async () => {
  const calls = [];
  const reply = (items) => `Here you go:\n${JSON.stringify(items.map((m) => ({ id: m.id, from: m.id === 2 ? 'en' : 'fa', text: m.id === 2 ? m.text : `EN(${m.text})` })))}`;
  const t = createTranslator({ provider: fakeProvider(reply, calls), log: { warn() {} } });
  const msgs = [{ id: 1, text: 'سلام' }, { id: 2, text: 'hello' }, { id: 3, text: '' }];
  const out = await t.translate('c1', msgs);
  assert.deepEqual(out[0].translation, { text: 'EN(سلام)', from: 'fa' });
  assert.equal(out[1].translation, undefined);
  assert.equal(out[2].translation, undefined);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].map((m) => m.id), [1, 2]);
  await t.translate('c1', msgs);
  assert.equal(calls.length, 1);
  await t.translate('c2', [{ id: 1, text: 'سلام' }]);
  assert.equal(calls.length, 2);
});

test('a provider failure returns the originals and does not throw', async () => {
  const provider = { isConfigured: true, async complete() { throw new Error('boom'); } };
  const t = createTranslator({ provider, log: { warn() {} } });
  const out = await t.translate('c', [{ id: 1, text: 'x' }]);
  assert.deepEqual(out, [{ id: 1, text: 'x' }]);
});

test('an unconfigured or missing provider is a no-op', async () => {
  const t = createTranslator({ provider: null });
  const msgs = [{ id: 1, text: 'x' }];
  assert.equal(await t.translate('c', msgs), msgs);
});
