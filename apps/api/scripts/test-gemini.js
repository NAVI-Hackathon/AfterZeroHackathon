import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { createGeminiProvider } from '../src/services/gemini.service.js';
import { samplePdf } from '../test/sampleDocuments.js';

const config = { ...loadConfig(), aiMode: 'live' };
if (!config.apiKey) { console.error('Live test not run: set GEMINI_API_KEY in apps/api/.env.'); process.exit(1); }
const args = process.argv.slice(2);
if (args.some((value, index) => index % 2 === 0 && !['--boarding', '--delay'].includes(value)) || args.length % 2) { console.error('Usage: npm run test:ai -- --boarding /path/file.pdf --delay /path/file.pdf'); process.exit(1); }
const paths = Object.fromEntries(Array.from({ length: args.length / 2 }, (_, index) => [args[index * 2], args[index * 2 + 1]]));
const provider = createGeminiProvider(config);
const server = createApp(config, provider).listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}/api`;
async function post(path, body) {
  const response = await fetch(base + path, { method: 'POST', ...(body instanceof FormData ? { body } : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok) throw new Error(`API failed: ${data.error?.code ?? response.status}`);
  return data;
}
async function upload(id, type, path) {
  const bytes = path ? await readFile(path) : samplePdf(type);
  const mime = path ? ({ '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' })[extname(path).toLowerCase()] : 'application/pdf';
  assert.ok(mime, 'Use a PDF, PNG or JPEG file');
  const form = new FormData(); form.set('file', new Blob([bytes], { type: mime }), `test${path ? extname(path) : '.pdf'}`);
  // No documentType hint: classification must come from the actual content.
  return post(`/journeys/${id}/documents`, form);
}
try {
  const message = '我昨天從東京回台灣，班機延誤了七個小時，不知道可以申請什麼。';
  for (const [input, expected] of [[message, 'flight_delay'], ['My flight from Tokyo to Taipei was delayed for seven hours.', 'flight_delay'], ['我有個問題。', 'unknown']]) {
    const result = await post('/analyze-intent', { message: input });
    assert.equal(result.serviceType, expected);
    if (expected === 'flight_delay') assert.equal(result.extractedData.delayMinutes, 420);
    console.info(JSON.stringify({ check: 'intent', expected, passed: true }));
  }
  const journey = await post('/journeys', { message });
  assert.equal(journey.readiness, 35);
  const boarding = await upload(journey.id, 'boarding_pass', paths['--boarding']);
  assert.equal(boarding.document.documentType, 'boarding_pass');
  assert.equal(boarding.document.source, 'live'); assert.equal(boarding.document.isMock, false);
  console.info(JSON.stringify({ check: 'boarding', status: boarding.document.status, confidence: boarding.document.confidence, readiness: boarding.journey.readiness, issueTypes: boarding.journey.consistencyIssues.map(issue => issue.type) }));
  assert.equal(boarding.journey.readiness, 70);
  const delay = await upload(journey.id, 'delay_certificate', paths['--delay']);
  console.info(JSON.stringify({ check: 'delay', status: delay.document.status, confidence: delay.document.confidence, readiness: delay.journey.readiness, delayMinutes: delay.document.fields.delayMinutes, fieldPresence: Object.fromEntries(Object.entries(delay.document.fields).map(([key, value]) => [key, value !== null])), issueTypes: delay.journey.consistencyIssues.map(issue => issue.type) }));
  assert.equal(delay.document.documentType, 'delay_certificate'); assert.equal(delay.journey.readiness, 90);
  if (!paths['--delay']) assert.equal(delay.document.fields.delayMinutes, 443);
  assert.deepEqual(delay.journey.consistencyIssues, []);
  const review = await post(`/journeys/${journey.id}/review`, { confirmed: true });
  assert.equal(review.readiness, 100); assert.equal(review.currentStage, 'READY_TO_PROCEED');
  console.info(JSON.stringify({ check: 'live_golden_path', readiness: [35, 70, 90, 100], passed: true }));
  const answer = await post('/knowledge/answer', { question: '為什麼需要延誤證明？' });
  assert.equal(answer.answerMode, 'grounded_extract', 'Live answer must not be a template fallback');
  assert.ok(answer.sources.length && answer.sources.every(source => ['claim-guide', 'flight-faq'].includes(source.id)));
  const unknown = await post('/knowledge/answer', { question: '信用卡年費多少？' });
  assert.equal(unknown.supported, false); assert.deepEqual(unknown.sources, []);
  console.info(JSON.stringify({ check: 'grounded_knowledge', sourceIds: answer.sources.map(source => source.id), passed: true }));
  const handoff = await (await fetch(base + `/journeys/${journey.id}/handoff-summary?enhance=true`)).json();
  assert.ok(handoff.narrative && handoff.collected.length);
  assert.deepEqual(handoff.missing, []);
  console.info(JSON.stringify({ check: 'handoff', summaryMode: handoff.summaryMode, passed: true }));
  console.info(JSON.stringify({ aiMetadata: provider.getDebugMetadata() }));
} catch (error) {
  // Do not print an AssertionError's actual/expected document data or provider payload.
  console.error(`Live verification failed: ${error.message}`); process.exitCode = 1;
} finally { await new Promise(resolve => server.close(resolve)); }
