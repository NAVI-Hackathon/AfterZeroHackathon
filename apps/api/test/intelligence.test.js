import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { normalizeIntent } from '../src/schemas/intent.schema.js';
import { createGeminiProvider } from '../src/services/gemini.service.js';
import { ApiError } from '../src/middleware/errorHandler.js';
import { UnderstandingSchema } from '../../../shared/intelligence.js';
import { result, inputs } from './fixtures.js';

async function server(t, provider, overrides = {}) {
  const config = { ...loadConfig({}), ...overrides };
  const http = createApp(config, provider).listen(0, '127.0.0.1');
  await new Promise(resolve => http.once('listening', resolve));
  t.after(() => new Promise(resolve => http.close(resolve)));
  const url = `http://127.0.0.1:${http.address().port}`;
  return { url, post: (message, options = {}) => fetch(`${url}/api/intelligence/understand`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }), ...options }) };
}
for (const [message, service] of inputs) test(`Mock Provider contract: ${service} / ${message}`, async t => {
  let seen;
  const api = await server(t, { understandIntent: async text => { seen = text; return result(service); } });
  const response = await api.post(`  ${message}  `);
  assert.equal(response.status, 200);
  const body = UnderstandingSchema.parse(await response.json());
  assert.equal(seen, message); assert.equal(body.data.serviceType, service);
  assert.equal(body.meta.outcome, service === 'flight_delay' ? 'supported' : service === 'unknown' ? 'clarification' : 'preview');
  assert.equal(body.meta.source, 'gemini');
});

test('health, input bounds, malformed JSON, unexpected fields/types and CORS', async t => {
  let calls = 0;
  const api = await server(t, { understandIntent: async () => { calls++; return result(); } });
  assert.deepEqual(await (await fetch(api.url + '/api/health')).json(), { status: 'ok', aiProviderConfigured: false });
  for (const invalid of ['', '  ', null, 123, {}, [], 'a'.repeat(2001)]) {
    const response = await api.post(invalid);
    assert.equal(response.status, 400); assert.equal((await response.json()).error.code, 'INVALID_INPUT');
  }
  for (const body of ['{broken', '{}', 'null', JSON.stringify({ message: 'hi', currentStage: 'READY_TO_PROCEED' })]) assert.equal((await api.post('', { body })).status, 400);
  assert.equal((await api.post('', { body: JSON.stringify({ message: 'a'.repeat(17000) }) })).status, 413);
  assert.equal(calls, 0);
  const allowed = await api.post('hi', { headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.equal((await api.post('hi', { headers: { 'Content-Type': 'application/json', Origin: 'https://untrusted.example' } })).status, 403);
  assert.equal((await fetch(api.url + '/api/missing')).status, 404);
});

test('strict AI response validation, one retry and sanitized failures', async t => {
  let calls = 0;
  const api = await server(t, { understandIntent: async () => { calls++; return { ...result(), readiness: 100 }; } });
  const response = await api.post('hello');
  assert.equal(response.status, 502); assert.equal((await response.json()).error.code, 'AI_RESPONSE_INVALID'); assert.equal(calls, 2);
  for (const invalid of [result('invented'), result('flight_delay', { confidence: '0.9' }), result('flight_delay', { extractedData: { origin: 'Tokyo' } }), result('flight_delay', { summary: '' }), result('flight_delay', { extractedData: { ...result().extractedData, incidentDate: '2026-02-30' } })]) assert.throws(() => normalizeIntent(invalid));
  calls = 0;
  const recovered = await server(t, { understandIntent: async () => { calls++; return calls === 1 ? {} : result(); } });
  assert.equal((await recovered.post('hello')).status, 200); assert.equal(calls, 2);
});

test('confidence clamp/default and deterministic threshold / knowledge routing', async t => {
  assert.equal(normalizeIntent(result('flight_delay', { confidence: -1 })).confidence, 0);
  assert.equal(normalizeIntent(result('flight_delay', { confidence: 2 })).confidence, 1);
  const missing = result(); delete missing.confidence; assert.equal(normalizeIntent(missing).confidence, 0);
  const api = await server(t, { understandIntent: async text => result('flight_delay', { confidence: Number(text) }) });
  assert.equal((await (await api.post('0.65')).json()).meta.outcome, 'supported');
  assert.equal((await (await api.post('0.649')).json()).meta.outcome, 'human_review');
  const knowledge = await server(t, { understandIntent: async () => result('flight_delay', { intent: 'knowledge_query' }) });
  assert.equal((await (await knowledge.post('policy question')).json()).meta.outcome, 'preview');
});

test('provider unavailable, failure, timeout, internal error and rate limit', async t => {
  const unconfigured = await server(t);
  assert.equal((await unconfigured.post('hi')).status, 503);
  const failure = await server(t, { understandIntent: async () => { throw new ApiError('AI_PROVIDER_ERROR', '目前無法分析此需求。'); } });
  assert.equal((await (await failure.post('hi')).json()).error.code, 'AI_PROVIDER_ERROR');
  const timeout = await server(t, { understandIntent: (text, signal) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })) }, { timeoutMs: 30 });
  const timed = await timeout.post('hi'); assert.equal(timed.status, 504); assert.equal((await timed.json()).error.code, 'AI_TIMEOUT');
  const internal = await server(t, { understandIntent: async () => { throw new Error('secret provider response'); } });
  const body = await (await internal.post('hi')).json(); assert.equal(body.error.code, 'INTERNAL_ERROR'); assert.ok(!JSON.stringify(body).includes('secret'));
  const limited = await server(t, { understandIntent: async () => result() }, { rateLimit: 1 });
  assert.equal((await limited.post('hi')).status, 200); assert.equal((await limited.post('hi')).status, 429);
});

test('Gemini REST transport uses a header key, structured schema and bounded output', async () => {
  const config = { ...loadConfig({}), apiKey: 'test-key-not-a-real-secret' };
  let seen;
  const provider = createGeminiProvider(config, async (url, options) => {
    seen = { url, options, body: JSON.parse(options.body) };
    return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'thinking', thought: true }, { text: JSON.stringify(result()) }] } }] }));
  });
  assert.equal((await provider.understandIntent('user story', new AbortController().signal)).serviceType, 'flight_delay');
  assert.ok(!seen.url.includes(config.apiKey)); assert.equal(seen.options.headers['x-goog-api-key'], config.apiKey);
  assert.equal(seen.body.generationConfig.responseMimeType, 'application/json');
  assert.equal(seen.body.generationConfig.responseJsonSchema.additionalProperties, false);
  assert.match(seen.body.systemInstruction.parts[0].text, /不判斷最終理賠資格/);
  assert.equal(seen.body.contents[0].parts[0].text, 'user story');
  const invalid = createGeminiProvider(config, async () => new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'not JSON' }] } }] })));
  await assert.rejects(invalid.understandIntent('hi', new AbortController().signal), { code: 'AI_RESPONSE_INVALID' });
  const denied = createGeminiProvider(config, async () => new Response('sensitive body', { status: 403 }));
  await assert.rejects(denied.understandIntent('hi', new AbortController().signal), { code: 'AI_PROVIDER_ERROR' });
});
