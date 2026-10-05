import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, deriveWorkflow, addMockEvidence, readSession, STORAGE_KEY } from './workflow.js';
import { validateUnderstanding, demoFallback } from './intelligence.js';

const data = { intent: 'service_request', serviceType: 'flight_delay', confidence: 0.65, summary: '使用者表示航班延誤。', extractedData: { origin: 'Osaka', destination: 'Kaohsiung', delayMinutes: 420, incidentDate: null } };
const understanding = { success: true, data, meta: { source: 'gemini', confidenceThreshold: 0.65, outcome: 'supported' } };

test('AI understanding maps into the existing deterministic golden path and survives reload', () => {
  // Deliberately no keyword matches: reload must retain AI interpretation, not reclassify the story.
  let claim = createCase('在空港等到深夜才出發', understanding);
  assert.equal(claim.interpretation.extractedData.origin, 'Osaka');
  assert.equal(claim.interpretation.extractedData.delayHours, 7);
  assert.equal(deriveWorkflow(claim).state, 'EVIDENCE_COLLECTION'); assert.equal(deriveWorkflow(claim).score, 35);
  claim = addMockEvidence(claim, 'boarding_pass', 'boarding.pdf'); assert.equal(deriveWorkflow(claim).score, 70);
  claim = addMockEvidence(claim, 'delay_certificate', 'delay.pdf'); assert.equal(deriveWorkflow(claim).score, 90);
  claim = { ...claim, confirmed: true }; assert.equal(deriveWorkflow(claim).score, 100);
  const restored = readSession({ getItem: key => key === STORAGE_KEY ? JSON.stringify(claim) : null });
  assert.equal(deriveWorkflow(restored).score, 100); assert.deepEqual(restored.intelligence, understanding);
  assert.equal(restored.interpretation.extractedData.destination, 'Kaohsiung');
});

test('untrusted envelopes, low confidence, unknown and unsupported intents are distinguished', () => {
  assert.throws(() => validateUnderstanding({ ...understanding, data: { ...data, currentStage: 'READY_TO_PROCEED' } }));
  assert.throws(() => validateUnderstanding({ ...understanding, meta: { ...understanding.meta, outcome: 'human_review' } }));
  const low = { ...understanding, data: { ...data, confidence: 0.64 }, meta: { ...understanding.meta, outcome: 'human_review' } };
  assert.equal(deriveWorkflow(createCase('airline issue', low)).state, 'HUMAN_REVIEW');
  const preview = { ...understanding, data: { ...data, serviceType: 'payment_method_change' }, meta: { ...understanding.meta, outcome: 'preview' } };
  assert.equal(createCase('我要換信用卡扣款', preview).interpretation.serviceType, 'payment_change');
  const unknown = { ...understanding, data: { ...data, intent: 'unknown', serviceType: 'unknown', confidence: 0 }, meta: { ...understanding.meta, outcome: 'clarification' } };
  assert.equal(deriveWorkflow(createCase('help', unknown)).state, 'HUMAN_REVIEW');
  assert.equal(demoFallback('我有個問題'), null); assert.equal(demoFallback('我要換信用卡扣款'), null);
  assert.equal(demoFallback('班機延誤七小時').meta.source, 'demo_fallback');
});
