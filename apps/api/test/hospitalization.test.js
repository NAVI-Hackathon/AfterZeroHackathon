import test from 'node:test';
import assert from 'node:assert/strict';
import { intentDisposition, IntentDataSchema } from '../../../shared/intelligence.js';
import { normalizeGeminiIntent } from '../src/ai/schemas.js';
import { createDemoProvider } from '../src/ai/demoProvider.js';
import { SYSTEM_PROMPT } from '../src/ai/prompts/intentPrompt.js';

// Added by Developer A for the 住院醫療理賠 Golden Path. Existing flight-delay behaviour is untouched.
const empty = { origin: null, destination: null, delayMinutes: null, incidentDate: null };

test('hospitalization_claim is a supported service type', () => {
  const data = IntentDataSchema.parse({ intent: 'service_request', serviceType: 'hospitalization_claim', confidence: 0.9, summary: '住院後想申請理賠', extractedData: empty });
  assert.equal(intentDisposition(data), 'supported');
  assert.equal(intentDisposition({ ...data, confidence: 0.3 }), 'human_review');
});

test('Gemini aliases normalise to hospitalization_claim and never invent details', () => {
  for (const serviceType of ['hospital_claim', 'Hospitalization', 'medical-claim', 'inpatient claim']) {
    const result = normalizeGeminiIntent({ intent: 'claim', serviceType, confidence: 0.92, summary: '住院理賠', extractedData: empty });
    assert.equal(result.serviceType, 'hospitalization_claim', serviceType);
    assert.equal(result.intent, 'service_request');
    assert.deepEqual(result.extractedData, empty);
  }
});

test('the intent prompt describes the new type and the demo provider recognises it', async () => {
  assert.match(SYSTEM_PROMPT, /hospitalization_claim/);
  const demo = createDemoProvider();
  const result = await demo.understandIntent('我上週在台中榮總住院五天，要怎麼申請理賠？');
  assert.equal(result.serviceType, 'hospitalization_claim');
  assert.equal(result.intent, 'service_request');
  assert.equal((await demo.understandIntent('我的班機延誤了七小時')).serviceType, 'flight_delay');
});
