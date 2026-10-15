import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDialog, formatMessage, maskPhone, resolveMediaType, toEntity } from '../lib/telegram/format.mjs';

test('formatDialog maps GramJS dialog fields to the API shape', () => {
  const out = formatDialog({ id: 123n, title: 'OSINT Wire', unreadCount: 3, isChannel: true, date: 1_700_000_000, message: { id: 9, message: 'hi', date: 1_700_000_000 } });
  assert.equal(out.id, '123');
  assert.equal(out.type, 'channel');
  assert.equal(out.unreadCount, 3);
  assert.equal(out.date, '2023-11-14T22:13:20.000Z');
  assert.deepEqual(out.lastMessage, { id: 9, text: 'hi', date: '2023-11-14T22:13:20.000Z' });
  assert.equal(formatDialog({ id: 1, isGroup: true }).type, 'group');
  assert.equal(formatDialog({ id: 1, isUser: true }).type, 'user');
  assert.equal(formatDialog({ id: 1 }).title, 'Untitled');
  assert.equal(formatDialog({ id: 1 }).lastMessage, null);
});

test('resolveMediaType classifies photos, documents by mime, and others', () => {
  assert.equal(resolveMediaType(null), null);
  assert.equal(resolveMediaType({ className: 'MessageMediaPhoto' }), 'photo');
  assert.equal(resolveMediaType({ className: 'MessageMediaDocument', document: { mimeType: 'video/mp4' } }), 'video');
  assert.equal(resolveMediaType({ className: 'MessageMediaDocument', document: { mimeType: 'audio/ogg' } }), 'audio');
  assert.equal(resolveMediaType({ className: 'MessageMediaDocument', document: { mimeType: 'application/pdf' } }), 'document');
  assert.equal(resolveMediaType({ className: 'MessageMediaWebPage' }), 'webpage');
  assert.equal(resolveMediaType({ className: 'MessageMediaPoll' }), 'poll');
  assert.equal(resolveMediaType({ className: 'MessageMediaGeo' }), 'media');
});

test('formatMessage keeps ids, sender and reply linkage', () => {
  const out = formatMessage({ id: 5, message: 'text', date: 1_700_000_000, senderId: 42n, out: false, media: null, replyTo: { replyToMsgId: 4 } });
  assert.deepEqual(out, { id: 5, text: 'text', date: '2023-11-14T22:13:20.000Z', senderId: '42', out: false, mediaType: null, replyToMsgId: 4 });
});

test('maskPhone hides all but the last four digits', () => {
  assert.equal(maskPhone('15551234567'), '+*******4567');
  assert.equal(maskPhone(''), '');
});

test('toEntity turns numeric ids into BigInt and leaves usernames alone', () => {
  assert.equal(toEntity('123'), 123n);
  assert.equal(toEntity('@channel'), '@channel');
});
