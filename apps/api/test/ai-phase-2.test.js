import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { createGeminiProvider } from '../src/services/gemini.service.js';
import { createDemoProvider } from '../src/ai/demoProvider.js';
import { normalizeGeminiIntent, normalizeGeminiDocument } from '../src/ai/schemas.js';
import { calculateDelayMinutes, documentVerified } from '../src/services/documentValidationService.js';
import { checkEvidenceConsistency } from '../src/services/evidenceConsistencyService.js';
import { answerKnowledge, validateGroundedAnswer } from '../src/services/knowledgeAnswerService.js';
import { retrieveAnswerContext } from '../src/services/knowledgeService.js';
import { enhanceHandoff } from '../src/services/handoffService.js';
import { ApiError } from '../src/middleware/errorHandler.js';
import { result } from './fixtures.js';
import { samplePdf } from './sampleDocuments.js';

const config = { ...loadConfig({ AI_MODE: 'live', GEMINI_API_KEY: 'test-key' }), rateLimit: 300 };
const signal = () => new AbortController().signal;
const response = raw => new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(raw) }] } }] }), { status: 200 });
const fields = { passengerName: null, flightNumber: null, origin: null, destination: null, departureDate: null, actualDepartureDate: null, scheduledDeparture: null, actualDeparture: null };
const boarding = () => ({ documentType: 'boarding_pass', confidence: 0.97, fields: { ...fields, passengerName: 'NAVI TEST PASSENGER', flightNumber: 'BR 196', origin: 'NRT', destination: 'TPE', departureDate: '2026-10-07', scheduledDeparture: '14:20' } });
const delay = () => ({ documentType: 'delay_certificate', confidence: 0.96, fields: { ...fields, flightNumber: 'BR196', departureDate: '2026-10-07', scheduledDeparture: '14:20', actualDeparture: '21:43' } });
async function api(t, fetchImpl, overrides = {}) {
  const provider = createGeminiProvider({ ...config, ...overrides }, fetchImpl);
  const http = createApp({ ...config, ...overrides }, provider).listen(0, '127.0.0.1');
  await new Promise(resolve => http.once('listening', resolve));
  t.after(() => new Promise(resolve => http.close(resolve)));
  const base = `http://127.0.0.1:${http.address().port}/api`;
  return { provider,
    async post(path, body) { return fetch(base + path, { method: 'POST', ...(body instanceof FormData ? { body } : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) }); },
    get(path) { return fetch(base + path); },
    async upload(id, type) { const form = new FormData(); form.set('file', new Blob([samplePdf(type)], { type: 'application/pdf' }), 'test.pdf'); return this.post(`/journeys/${id}/documents`, form); },
  };
}

test('Gemini intent accepts explicit aliases and validates structured facts', () => {
  const data = normalizeGeminiIntent({ ...result(), intent: 'service_discovery', serviceType: 'Flight Delay', missingInformation: [] });
  assert.equal(data.intent, 'service_request'); assert.equal(data.serviceType, 'flight_delay'); assert.equal(data.extractedData.delayMinutes, 420);
  assert.ok(data.confidence < 0.96 && data.confidence >= 0.75);
  assert.equal(normalizeGeminiIntent({ ...result(), serviceType: 'flight_delay_claim' }).serviceType, 'flight_delay');
  assert.equal(normalizeGeminiIntent({ ...result('vehicle_accident'), serviceType: 'car-accident' }).serviceType, 'vehicle_accident');
});
test('Invalid Gemini intent types, dates and missing structured data are rejected', () => {
  for (const raw of [{ ...result(), confidence: 'high' }, { ...result(), extractedData: {} }, { ...result(), extractedData: { ...result().extractedData, incidentDate: '2026-02-30' } }]) assert.throws(() => normalizeGeminiIntent(raw));
});
test('Unrecognized service normalization remains unknown with reduced confidence', () => {
  const data = normalizeGeminiIntent({ ...result(), serviceType: 'made-up-product', confidence: 0.99 });
  assert.equal(data.serviceType, 'unknown'); assert.equal(data.intent, 'unknown'); assert.ok(data.confidence <= 0.4);
  assert.ok(Object.values(data.extractedData).every(value => value === null));
});
test('Confidence defaults/clamps and incomplete facts adjust deterministically', () => {
  const { confidence, ...without } = result();
  assert.equal(normalizeGeminiIntent(without).confidence, 0);
  assert.equal(normalizeGeminiIntent({ ...result(), confidence: -1 }).confidence, 0);
  assert.ok(normalizeGeminiIntent({ ...result(), confidence: 99 }).confidence <= 1);
  assert.ok(normalizeGeminiIntent({ ...result(), extractedData: { origin: null, destination: null, incidentDate: null, delayMinutes: null } }).confidence < normalizeGeminiIntent(result()).confidence);
});
test('Boarding Pass visible fields are extracted without system decisions', () => {
  const data = normalizeGeminiDocument(boarding());
  assert.equal(data.fields.flightNumber, 'BR 196'); assert.equal(data.fields.scheduledDeparture, '14:20');
  assert.equal(data.fields.departureDate, '2026-10-07'); assert.equal(documentVerified(data, 0.75), true);
  assert.ok(!('status' in data) && !('readiness' in data));
});
test('Boarding Pass missing evidence fields requires review; minimal known evidence can verify', () => {
  const data = normalizeGeminiDocument({ ...boarding(), fields: { ...fields } });
  assert.equal(documentVerified(data, 0.75), false);
  data.fields.flightNumber = 'BR196'; assert.equal(documentVerified(data, 0.75), true);
  data.confidence = 0.2; assert.equal(documentVerified(data, 0.75), false);
});
test('Delay Certificate clock fields are valid and backend calculates 443 minutes', () => {
  const data = normalizeGeminiDocument(delay());
  assert.equal(calculateDelayMinutes(data.fields), 443);
  assert.equal(documentVerified(data, 0.75), true);
  assert.ok(!('delayMinutes' in data.fields));
});
test('Clock arithmetic handles explicit overnight dates, offsets, missing and contradictory times', () => {
  assert.equal(calculateDelayMinutes({ scheduledDeparture: '23:00', actualDeparture: '06:23' }), null);
  assert.equal(calculateDelayMinutes({ scheduledDeparture: '23:00', actualDeparture: '06:23', departureDate: '2026-10-07', actualDepartureDate: '2026-10-08' }), 443);
  assert.equal(calculateDelayMinutes({ scheduledDeparture: '2026-10-07T14:20:00+09:00', actualDeparture: '2026-10-07T20:43:00+08:00' }), 443);
  assert.equal(calculateDelayMinutes({ scheduledDeparture: '14:20', actualDeparture: null }), null);
  assert.equal(calculateDelayMinutes({ scheduledDeparture: '14:20', actualDeparture: '2026-10-07T21:43:00+09:00' }), null);
  assert.throws(() => normalizeGeminiDocument({ ...delay(), fields: { ...delay().fields, scheduledDeparture: '25:00' } }));
  assert.throws(() => normalizeGeminiDocument({ ...delay(), fields: { ...delay().fields, scheduledDeparture: '1420-10-07T14:20:00Z' } }), 'Live model must return clock values, not invented datetimes');
});
test('Unknown document is not relabeled as boarding pass; null fields remain null', () => {
  const data = normalizeGeminiDocument({ documentType: 'unknown', confidence: 0.99, fields });
  assert.equal(data.documentType, 'unknown'); assert.deepEqual(data.fields, {}); assert.ok(data.confidence <= 0.4);
  assert.equal(normalizeGeminiDocument(boarding()).fields.actualDeparture, undefined);
});
const pair = () => [{ ...normalizeGeminiDocument(boarding()), id: randomUUID() }, { ...normalizeGeminiDocument(delay()), id: randomUUID() }];
test('Flight number consistency tolerates formatting but flags conflicting facts', () => {
  const docs = pair(); assert.deepEqual(checkEvidenceConsistency(docs), []);
  docs[1].fields.flightNumber = 'CI100';
  assert.equal(checkEvidenceConsistency(docs)[0].type, 'FLIGHT_NUMBER_MISMATCH');
});
test('Document departure date mismatch produces a high-severity flag', () => {
  const docs = pair(); docs[1].fields.departureDate = '2026-10-08';
  assert.equal(checkEvidenceConsistency(docs)[0].type, 'DEPARTURE_DATE_MISMATCH');
});
test('Passenger/route facts and reported incident are compared without inventing airport facts', () => {
  const docs = pair(); docs[1].fields.passengerName = 'SOMEONE ELSE'; docs[1].fields.origin = 'HND';
  const issues = checkEvidenceConsistency(docs, { origin: 'Tokyo', destination: 'Taiwan' });
  assert.deepEqual(new Set(issues.map(issue => issue.type)), new Set(['ORIGIN_MISMATCH', 'PASSENGER_NAME_MISMATCH']));
  assert.ok(checkEvidenceConsistency(docs, { incidentDate: '2026-10-09' }).some(issue => issue.type === 'DEPARTURE_DATE_MISMATCH'));
});
test('Gemini multimodal transport sends actual file bytes and never relies on upload hint', async () => {
  let body;
  const provider = createGeminiProvider(config, async (url, options) => { body = JSON.parse(options.body); assert.ok(!url.includes('test-key')); assert.equal(options.headers['x-goog-api-key'], 'test-key'); return response(boarding()); });
  const bytes = samplePdf('boarding_pass');
  await provider.analyzeDocument({ bytes, mimeType: 'application/pdf', documentType: 'delay_certificate' }, signal());
  assert.deepEqual(Buffer.from(body.contents[0].parts[1].inlineData.data, 'base64'), bytes);
  assert.equal(body.contents[0].parts[1].inlineData.mimeType, 'application/pdf');
  assert.ok(!JSON.stringify(body).includes('expectedDocumentType'));
  assert.ok(body.systemInstruction.parts[0].text.includes('return null rather than guessing'));
});
test('Live transport Golden Path is server-owned 35→70→90→100 and metadata stays private', async t => {
  const outputs = [result(), boarding(), delay()];
  const server = await api(t, async () => response(outputs.shift()));
  const initial = await (await server.post('/journeys', { message: '我昨天從東京回台灣，班機延誤了七個小時' })).json();
  assert.equal(initial.readiness, 35); assert.equal(initial.provider, 'live');
  const board = await (await server.upload(initial.id, 'boarding_pass')).json();
  assert.equal(board.journey.readiness, 70); assert.equal(board.document.status, 'verified'); assert.equal(board.document.isMock, false);
  const certificate = await (await server.upload(initial.id, 'delay_certificate')).json();
  assert.equal(certificate.journey.readiness, 90); assert.equal(certificate.document.fields.delayMinutes, 443); assert.equal(certificate.journey.nextAction.type, 'REVIEW_INFORMATION');
  const reviewed = await (await server.post(`/journeys/${initial.id}/review`, { confirmed: true })).json();
  assert.equal(reviewed.readiness, 100); assert.equal(reviewed.currentStage, 'READY_TO_PROCEED');
  assert.ok(!JSON.stringify(reviewed).includes(config.model));
  assert.equal(server.provider.getDebugMetadata().document.schemaValid, true);
});
test('Insufficient boarding extraction enters HUMAN_REVIEW instead of increasing readiness', async t => {
  const outputs = [result(), { ...boarding(), fields }];
  const server = await api(t, async () => response(outputs.shift()));
  const journey = await (await server.post('/journeys', { message: '班機延誤七小時' })).json();
  const uploaded = await (await server.upload(journey.id, 'boarding_pass')).json();
  assert.equal(uploaded.document.status, 'needs_review'); assert.equal(uploaded.journey.readiness, 35);
  assert.equal(uploaded.journey.currentStage, 'HUMAN_REVIEW'); assert.equal(uploaded.journey.nextAction.type, 'CONTACT_SPECIALIST');
});
test('Partial verified boarding evidence does not grant missing travel points or allow Review', async t => {
  const partial = { ...boarding(), fields: { ...fields, flightNumber: 'BR196' } };
  const outputs = [result(), partial, delay()];
  const server = await api(t, async () => response(outputs.shift()));
  const journey = await (await server.post('/journeys', { message: '班機延誤七小時' })).json();
  const boardingResult = await (await server.upload(journey.id, 'boarding_pass')).json();
  assert.equal(boardingResult.document.status, 'verified'); assert.equal(boardingResult.journey.readiness, 55);
  const documents = await (await server.upload(journey.id, 'delay_certificate')).json();
  assert.equal(documents.journey.readiness, 75); assert.equal(documents.journey.currentStage, 'EVIDENCE_COLLECTION');
  assert.equal(documents.journey.nextAction.type, 'PROVIDE_INFORMATION');
  assert.equal((await server.post(`/journeys/${journey.id}/review`, { confirmed: true })).status, 409);
});
test('Consistency issues enter HUMAN_REVIEW and re-upload recovers workflow', async t => {
  const bad = delay(); bad.fields.flightNumber = 'CI100';
  const outputs = [result(), boarding(), bad, delay()];
  const server = await api(t, async () => response(outputs.shift()));
  const journey = await (await server.post('/journeys', { message: '班機延誤七小時' })).json();
  await server.upload(journey.id, 'boarding_pass');
  const mismatch = await (await server.upload(journey.id, 'delay_certificate')).json();
  assert.equal(mismatch.journey.currentStage, 'HUMAN_REVIEW'); assert.equal(mismatch.journey.readiness, 70);
  assert.equal(mismatch.journey.consistencyIssues[0].type, 'FLIGHT_NUMBER_MISMATCH');
  const corrected = await (await server.upload(journey.id, 'delay_certificate')).json();
  assert.equal(corrected.journey.currentStage, 'READY_FOR_REVIEW'); assert.deepEqual(corrected.journey.consistencyIssues, []);
});
test('Knowledge answer only returns genuine retrieved prototype source IDs', async t => {
  const context = retrieveAnswerContext('為什麼需要延誤證明？');
  const server = await api(t, async () => response({ answer: context.answer, confidence: 0.9, supported: true, sourceIds: ['claim-guide'] }));
  const answer = await (await server.post('/knowledge/answer', { question: '為什麼需要延誤證明？' })).json();
  assert.equal(answer.answerMode, 'grounded_extract'); assert.deepEqual(answer.sources.map(source => source.id), ['claim-guide']);
  assert.ok(answer.sources.every(source => source.isMock && source.type.startsWith('prototype_')));
});
test('Unsupported knowledge uses insufficient-information response without calling AI', async () => {
  let calls = 0;
  const provider = { answerKnowledge: () => { calls++; assert.fail(); } };
  for (const question of ['信用卡年費多少？', '車禍理賠文件要哪些？', '火星天氣？']) {
    const answer = await answerKnowledge(question, { provider, config, signal: signal() });
    assert.equal(answer.supported, false); assert.deepEqual(answer.sources, []);
  }
  assert.equal(calls, 0);
});
test('Fake sources and unsupported rules are rejected, with explicit retrieved-template fallback', async () => {
  const context = retrieveAnswerContext('為什麼需要延誤證明？');
  const raw = { answer: context.answer, confidence: 0.9, supported: true, sourceIds: ['fake-official'] };
  assert.throws(() => validateGroundedAnswer(raw, context));
  assert.throws(() => validateGroundedAnswer({ ...raw, sourceIds: ['claim-guide'], answer: '延誤 2 小時一定理賠 5000 元。' }, context));
  let calls = 0;
  const answer = await answerKnowledge('為什麼需要延誤證明？', { provider: { answerKnowledge: async () => { calls++; return raw; } }, config, signal: signal() });
  assert.equal(calls, 2); assert.equal(answer.answerMode, 'retrieval_template'); assert.equal(answer.answer, context.answer);
  assert.ok(answer.sources.every(source => context.sourceIds.includes(source.id)));
});
test('AI unsupported answer cannot fabricate facts or sources', () => {
  const context = retrieveAnswerContext('為什麼需要延誤證明？');
  assert.equal(validateGroundedAnswer({ answer: '目前提供的資料不足以確認。', confidence: 0, supported: false, sourceIds: [] }, context).supported, false);
  assert.throws(() => validateGroundedAnswer({ answer: '保證理賠', confidence: 1, supported: false, sourceIds: ['claim-guide'] }, context));
});
test('Gemini timeout is bounded and leaves existing journey unchanged', async t => {
  let calls = 0;
  const server = await api(t, async () => { if (++calls === 1) return response(result()); return new Promise(() => {}); }, { timeoutMs: 30 });
  const journey = await (await server.post('/journeys', { message: '班機延誤七小時' })).json();
  const failed = await server.upload(journey.id, 'boarding_pass');
  assert.equal(failed.status, 504); assert.equal((await failed.json()).error.code, 'AI_TIMEOUT');
  const persisted = await (await server.get(`/journeys/${journey.id}`)).json(); assert.equal(persisted.readiness, 35); assert.deepEqual(persisted.documents, []);
});
test('Malformed/empty structured output retries only once and sanitizes errors', async t => {
  for (const body of ['not-json', JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [] } }] })]) {
    let calls = 0;
    const server = await api(t, async () => { calls++; return new Response(body); });
    const failed = await server.post('/analyze-intent', { message: '班機延誤七小時' });
    assert.equal(failed.status, 502); assert.equal((await failed.json()).error.code, 'AI_RESPONSE_INVALID'); assert.equal(calls, 2);
  }
});
test('Transient provider error retries once; permanent error and safety rejection do not retry', async t => {
  let calls = 0;
  const transient = await api(t, async () => ++calls === 1 ? new Response('{}', { status: 503 }) : response(result()));
  assert.equal((await transient.post('/analyze-intent', { message: '班機延誤七小時' })).status, 200); assert.equal(calls, 2);
  for (const [body, status, code] of [['{}', 403, 'AI_PROVIDER_ERROR'], [JSON.stringify({ promptFeedback: { blockReason: 'SAFETY' } }), 200, 'AI_SAFETY_REJECTION']]) {
    calls = 0;
    const server = await api(t, async () => { calls++; return new Response(body, { status }); });
    const failed = await server.post('/analyze-intent', { message: '班機延誤七小時' });
    assert.equal((await failed.json()).error.code, code); assert.equal(calls, 1);
  }
});
for (const field of ['readiness', 'currentStage', 'nextAction']) test(`Live provider cannot control ${field}`, async t => {
  let calls = 0;
  const server = await api(t, async () => { calls++; return response({ ...result(), [field]: field === 'readiness' ? 100 : 'READY_TO_PROCEED' }); });
  const failed = await server.post('/journeys', { message: '班機延誤七小時' });
  assert.equal(failed.status, 502); assert.equal((await failed.json()).error.code, 'AI_RESPONSE_INVALID'); assert.equal(calls, 2);
  assert.throws(() => normalizeGeminiDocument({ ...boarding(), [field]: 100 }));
});
test('Document schema cannot accept AI arithmetic as a business fact', () => {
  assert.throws(() => normalizeGeminiDocument({ ...delay(), fields: { ...delay().fields, delayMinutes: 999 } }));
});
test('Handoff only selects known facts; invalid output/failure falls back deterministically', async () => {
  const summary = { issue: '班機延誤', summary: '航班延誤七小時。', collected: ['登機證'], missing: ['延誤證明'], reason: '需要確認。', consistencyIssues: [{ message: '航班不一致。' }] };
  const valid = await enhanceHandoff(summary, { provider: { summarizeHandoff: async () => ({ factIds: ['issue', 'summary', 'reason', 'issue-0'] }) }, config, signal: signal() });
  assert.equal(valid.summaryMode, 'selected_facts'); assert.ok(valid.narrative.includes('航班不一致。'));
  for (const summarizeHandoff of [async () => ({ factIds: ['invented'] }), async () => { throw new ApiError('AI_PROVIDER_ERROR', 'failed'); }]) {
    const fallback = await enhanceHandoff(summary, { provider: { summarizeHandoff }, config, signal: signal() });
    assert.equal(fallback.summaryMode, 'template'); assert.ok(fallback.narrative.includes('尚待確認：延誤證明'));
  }
});
test('Metadata is bounded, contains no document content, and records template fallback', async () => {
  const provider = createGeminiProvider(config, async () => new Response('{}', { status: 503 }));
  const answer = await answerKnowledge('為什麼需要延誤證明？', { provider, config, signal: signal() });
  assert.equal(answer.answerMode, 'retrieval_template');
  const metadata = provider.getDebugMetadata(); assert.equal(metadata.knowledge.fallbackUsed, true);
  assert.ok(!JSON.stringify(metadata).includes(config.apiKey)); assert.ok(!JSON.stringify(metadata).includes('PASSENGER'));
  metadata.knowledge.model = 'changed'; assert.equal(provider.getDebugMetadata().knowledge.model, config.model);
});
test('Demo provider still returns explicit prototype answers and scripted documents', async () => {
  const provider = createDemoProvider();
  const answer = await answerKnowledge('為什麼需要延誤證明？', { provider, config, signal: signal() });
  assert.equal(answer.answerMode, 'demo'); assert.equal(answer.isMock, true);
  assert.equal((await provider.analyzeDocument({ documentType: 'boarding_pass' }, signal())).documentType, 'boarding_pass');
});
