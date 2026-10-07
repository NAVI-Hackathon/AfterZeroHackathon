import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HostMessageSchema, NaviMessageSchema, hostMessage, isAllowedOrigin, naviMessage, originOf, parseAllowedOrigins, readMessage,
} from '../../../../shared/embed.js';
import { claimDestinations } from './journeyEngine.js';

const parent = { name: 'parent window' };
const stranger = { name: 'other window' };
const allowedOrigins = parseAllowedOrigins('http://127.0.0.1:3000');
const event = (origin, data, source = parent) => ({ origin, data, source });

test('allowed origins are parsed strictly from configuration', () => {
  assert.deepEqual(parseAllowedOrigins('http://127.0.0.1:3000, https://mock.example.com'), ['http://127.0.0.1:3000', 'https://mock.example.com']);
  assert.deepEqual(parseAllowedOrigins('*, javascript:alert(1), https://mock.example.com/path, not a url'), []);
  assert.deepEqual(parseAllowedOrigins(''), []);
  assert.deepEqual(parseAllowedOrigins(undefined), []);
  assert.equal(originOf('http://127.0.0.1:5173/embed?mode=demo'), 'http://127.0.0.1:5173');
  assert.equal(originOf('not a url'), null);
});

test('origin check is an exact match: no wildcard, no "null", no look-alikes', () => {
  assert.equal(isAllowedOrigin('http://127.0.0.1:3000', allowedOrigins), true);
  for (const origin of ['http://127.0.0.1:3001', 'http://localhost:3000', 'https://127.0.0.1:3000', 'http://127.0.0.1:3000.evil.com', 'null', '', undefined]) {
    assert.equal(isAllowedOrigin(origin, allowedOrigins), false, String(origin));
  }
});

test('host messages are accepted only from the allowed origin and the expected window', () => {
  const read = e => readMessage(e, { allowedOrigins, expectedSource: parent, schema: HostMessageSchema });
  assert.deepEqual(read(event('http://127.0.0.1:3000', hostMessage('host:hello'))), hostMessage('host:hello'));
  assert.equal(read(event('https://evil.example', hostMessage('host:hello'))), null);
  assert.equal(read(event('http://127.0.0.1:3000', hostMessage('host:hello'), stranger)), null);
  assert.equal(read(event('http://127.0.0.1:3000', { ...hostMessage('host:hello'), extra: 1 })), null);
  assert.equal(read(event('http://127.0.0.1:3000', { type: 'host:hello' })), null);
  assert.equal(read(event('http://127.0.0.1:3000', 'host:hello')), null);
});

test('navigate messages carry only internal mock-site paths and kebab-case anchors', () => {
  const read = destination => readMessage(event('http://127.0.0.1:3000', naviMessage('navi:navigate', { destination })), { allowedOrigins, expectedSource: parent, schema: NaviMessageSchema });
  const valid = claimDestinations.form;
  assert.deepEqual(read(valid).destination, valid);
  for (const path of ['https://evil.example/x', '//evil.example/x', 'javascript:alert(1)', 'services/claims', '/services/../../etc', '/Services']) {
    assert.equal(read({ ...valid, path }), null, path);
  }
  for (const anchor of ['Form Claim', '"]<script>', 'a--b', '-a']) assert.equal(read({ ...valid, anchor }), null, anchor);
  assert.equal(read({ ...valid, source: { ...valid.source, url: 'https://evil.example/zh/a314' } }), null);
});
