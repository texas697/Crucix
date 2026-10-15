import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupDialogs, isAllowed, parseAllowlist, parseGroups, readAllowlist, selectDialogs } from '../lib/telegram/selection.mjs';

test('parseAllowlist splits on commas, trims, lowercases, drops @ and duplicates', () => {
  assert.deepEqual(parseAllowlist(' -1001668977160, Rybar in English ,@rybar_en,,rybar in english'), ['-1001668977160', 'rybar in english', 'rybar_en']);
  assert.deepEqual(parseAllowlist(''), []);
  assert.deepEqual(parseAllowlist(undefined), []);
});

test('readAllowlist reads TELEGRAM_CHATS from the environment', () => {
  assert.deepEqual(readAllowlist({ TELEGRAM_CHATS: '1,2' }), ['1', '2']);
  assert.deepEqual(readAllowlist({}), []);
});

test('an empty allowlist shows nothing; ids and titles both match', () => {
  const dialogs = [{ id: '-1001', title: 'Rybar in English' }, { id: '42', title: 'Taylor Russell' }, { id: '7', title: 'Hermes!' }];
  assert.deepEqual(selectDialogs(dialogs, []), []);
  assert.deepEqual(selectDialogs(dialogs, ['-1001', 'hermes!']).map((d) => d.id), ['-1001', '7']);
  assert.equal(isAllowed({ id: '42', title: 'Taylor Russell' }, ['-1001']), false);
});

test('grouped syntax keeps group order, flattens for the allowlist, and ungrouped stays nameless', () => {
  const raw = 'Iran: 1, 2 ; Russia:3;Ukraine:4,5';
  assert.deepEqual(parseGroups(raw), [
    { name: 'Iran', entries: ['1', '2'] },
    { name: 'Russia', entries: ['3'] },
    { name: 'Ukraine', entries: ['4', '5'] },
  ]);
  assert.deepEqual(parseAllowlist(raw), ['1', '2', '3', '4', '5']);
  assert.deepEqual(parseGroups('1,2'), [{ name: null, entries: ['1', '2'] }]);
  const dialogs = [{ id: '5', title: 'e' }, { id: '3', title: 'c' }, { id: '1', title: 'a' }, { id: '9', title: 'z' }];
  assert.deepEqual(groupDialogs(dialogs, parseGroups(raw)).map((d) => [d.id, d.group]), [['1', 'Iran'], ['3', 'Russia'], ['5', 'Ukraine']]);
});
