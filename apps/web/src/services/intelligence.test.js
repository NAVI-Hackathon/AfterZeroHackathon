import test from 'node:test';
import assert from 'node:assert/strict';
import { understandIntent, waitForAnalysis } from './intelligence.js';
import { demoFallback } from '../domain/intelligence.js';

const message = '班機延誤七小時';
const ai = { ...demoFallback(message), meta: { ...demoFallback(message).meta, source: 'gemini' } };
test('client posts bounded trimmed input and validates the NAVI contract', async () => {
  let seen;
  const result = await understandIntent(`  ${message}  `, { fetchImpl: async (url, options) => { seen = { url, options }; return Response.json(ai); } });
  assert.equal(result.meta.source, 'gemini'); assert.equal(seen.url, '/api/intelligence/understand'); assert.deepEqual(JSON.parse(seen.options.body), { message });
  await assert.rejects(understandIntent('', { fetchImpl: () => assert.fail() }), { code: 'INVALID_INPUT' });
  await assert.rejects(understandIntent('a'.repeat(2001)), { code: 'INVALID_INPUT' });
  for (const body of [{ success: true, data: {} }, { ...ai, data: { ...ai.data, confidence: 2 } }]) await assert.rejects(understandIntent(message, { fetchImpl: async () => Response.json(body) }), { code: 'AI_RESPONSE_INVALID' });
});

test('network failure, invalid JSON, provider error and timeout are recoverable', async () => {
  await assert.rejects(understandIntent(message, { fetchImpl: async () => { throw new TypeError('offline'); } }), { code: 'NETWORK_ERROR' });
  await assert.rejects(understandIntent(message, { fetchImpl: async () => new Response('<html>bad gateway</html>') }), { code: 'AI_RESPONSE_INVALID' });
  await assert.rejects(understandIntent(message, { fetchImpl: async () => new Response('', { status: 502 }) }), { code: 'API_UNAVAILABLE' });
  await assert.rejects(understandIntent(message, { fetchImpl: async () => Response.json({ success: false, error: { code: 'AI_PROVIDER_ERROR' } }, { status: 502 }) }), { code: 'AI_PROVIDER_ERROR' });
  const keepAlive = setTimeout(() => {}, 100);
  try { await assert.rejects(understandIntent(message, { timeoutMs: 20, fetchImpl: (url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })) }), { code: 'AI_TIMEOUT' }); }
  finally { clearTimeout(keepAlive); }
});

test('demo fallback requires explicit opt-in, is visible in metadata and is flight-only', async () => {
  const unavailable = async () => Response.json({ success: false, error: { code: 'AI_NOT_CONFIGURED' } }, { status: 503 });
  await assert.rejects(understandIntent(message, { fetchImpl: unavailable }), { code: 'AI_NOT_CONFIGURED' });
  assert.equal((await understandIntent(message, { fetchImpl: unavailable, enableFallback: true })).meta.source, 'demo_fallback');
  assert.equal((await understandIntent(message, { fetchImpl: async () => new Response('', { status: 500 }), enableFallback: true })).meta.source, 'demo_fallback');
  await assert.rejects(understandIntent('我要換信用卡扣款', { fetchImpl: unavailable, enableFallback: true }), { code: 'AI_NOT_CONFIGURED' });
  await assert.rejects(understandIntent(message, { fetchImpl: async () => Response.json({ error: { code: 'INVALID_INPUT' } }, { status: 400 }), enableFallback: true }), { code: 'INVALID_INPUT' });
  const unknown = { ...ai, data: { ...ai.data, intent: 'unknown', serviceType: 'unknown', confidence: 0 }, meta: { ...ai.meta, outcome: 'clarification' } };
  assert.equal((await understandIntent(message, { fetchImpl: async () => Response.json(unknown), enableFallback: true })).meta.outcome, 'clarification');
});

test('reset/navigation cancellation cannot become fallback or stale success', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(understandIntent(message, { signal: controller.signal, fetchImpl: async (url, { signal }) => { signal.throwIfAborted(); }, enableFallback: true }), { name: 'AbortError' });
  await assert.rejects(waitForAnalysis(100, controller.signal), { name: 'AbortError' });
  const later = new AbortController();
  const pending = waitForAnalysis(100, later.signal); later.abort(); await assert.rejects(pending, { name: 'AbortError' });
  await waitForAnalysis(0, new AbortController().signal);
});
