import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeMedia, formatDialog, formatMessage, resolveMediaType, toEntity, webpageOf } from '../lib/telegram/format.mjs';

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
  assert.equal(formatDialog({ id: 1 }).hasPhoto, false);
  assert.equal(formatDialog({ id: 1, entity: { photo: { className: 'ChatPhotoEmpty' } } }).hasPhoto, false);
  assert.equal(formatDialog({ id: 1, entity: { photo: { className: 'ChatPhoto' } } }).hasPhoto, true);
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
  assert.deepEqual(out, { id: 5, text: 'text', date: '2023-11-14T22:13:20.000Z', senderId: '42', out: false, mediaType: null, replyToMsgId: 4, webpage: null, media: null });
});

test('toEntity turns numeric ids into BigInt and leaves usernames alone', () => {
  assert.equal(toEntity('123'), 123n);
  assert.equal(toEntity('@channel'), '@channel');
});

test('webpageOf lifts the link preview out of MessageMediaWebPage', () => {
  const media = { className: 'MessageMediaWebPage', webpage: { url: 'https://x.test/a', displayUrl: 'x.test/a', siteName: 'X', title: 'T', description: 'D', photo: {} } };
  assert.deepEqual(webpageOf(media), { url: 'https://x.test/a', displayUrl: 'x.test/a', siteName: 'X', title: 'T', description: 'D', hasPhoto: true });
  assert.equal(webpageOf({ className: 'MessageMediaWebPage', webpage: { className: 'WebPageEmpty' } }), null);
  assert.equal(webpageOf(null), null);
  assert.equal(formatMessage({ id: 1, media }).webpage.title, 'T');
});

test('describeMedia summarises photos and video documents for the client', () => {
  const photo = { photo: { sizes: [{ type: 'i' }, { type: 'm', w: 256, h: 320 }, { type: 'y', w: 1024, h: 1280 }] } };
  assert.deepEqual(describeMedia(photo), { kind: 'photo', mime: 'image/jpeg', width: 1024, height: 1280, size: null, duration: null, tooLarge: false });
  const video = { document: { mimeType: 'video/mp4', size: 5412903n, attributes: [{ className: 'DocumentAttributeVideo', duration: 130.5, w: 480, h: 852 }] } };
  assert.deepEqual(describeMedia(video), { kind: 'video', mime: 'video/mp4', width: 480, height: 852, size: 5412903, duration: 130.5, tooLarge: false });
  assert.equal(describeMedia({ document: { mimeType: 'video/mp4', size: 99 * 1024 * 1024, attributes: [] } }).tooLarge, true);
  assert.equal(describeMedia({ document: { mimeType: 'audio/ogg', attributes: [] } }).kind, 'audio');
  assert.equal(describeMedia({ webpage: {} }), null);
});
