import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCase, addMockEvidence, removeEvidence, deriveWorkflow, delayMinutes, validateFile, readSession, DEMO_INPUT } from './workflow.js';

test('golden path is deterministic, reversible and stops at review', () => {
  let claim = createCase(DEMO_INPUT);
  assert.equal(deriveWorkflow(claim).score,35);
  assert.equal(deriveWorkflow(claim).state,'EVIDENCE_COLLECTION');
  claim = addMockEvidence(claim,'boarding_pass','boarding.pdf');
  assert.equal(deriveWorkflow(claim).score,70);
  claim = addMockEvidence(claim,'delay_certificate','delay.pdf');
  assert.equal(deriveWorkflow(claim).score,90);
  assert.equal(deriveWorkflow(claim).delay,443);
  assert.equal(deriveWorkflow(claim).state,'READY_FOR_REVIEW');
  assert.equal(deriveWorkflow({...claim,handoffRequested:true}).state,'HUMAN_REVIEW');
  assert.equal(deriveWorkflow({...claim,handoffRequested:true}).activeStage,3);
  claim = {...claim,confirmed:true};
  assert.equal(deriveWorkflow(claim).score,100);
  assert.equal(deriveWorkflow(claim).state,'READY_FOR_REVIEW');
  assert.equal(deriveWorkflow(removeEvidence(claim,'boarding_pass')).score,55);
  assert.equal(deriveWorkflow(removeEvidence(claim,'delay_certificate')).score,70);
  assert.equal(deriveWorkflow(addMockEvidence(claim,'delay_certificate','replacement.pdf')).score,90);
});

test('intent scope, handoff, document order and invalid inputs', () => {
  assert.equal(createCase('我昨天從東京回台灣，班機延誤七個小時，不知道能不能申請理賠。').interpretation.extractedData.delayHours,7);
  assert.equal(createCase('I had a car accident').interpretation.serviceType,'car_accident');
  assert.equal(createCase('I want to change my payment method').interpretation.serviceType,'payment_change');
  assert.equal(deriveWorkflow(createCase('I need help')).state,'HUMAN_REVIEW');
  assert.equal(createCase('my flight went well').interpretation.serviceType,'unknown');
  assert.equal(deriveWorkflow(addMockEvidence(createCase(DEMO_INPUT),'delay_certificate','delay.pdf')).score,55);
  assert.equal(delayMinutes({scheduledDeparture:'2026-10-05T23:20:00+09:00',actualDeparture:'2026-10-06T01:20:00+09:00'}),120);
  assert.equal(delayMinutes({scheduledDeparture:'bad',actualDeparture:'bad'}),null);
  assert.equal(delayMinutes({scheduledDeparture:'2026-10-06',actualDeparture:'2026-10-05'}),null);
  assert.match(validateFile({size:1,type:'text/plain'}),/Unsupported/);
  assert.match(validateFile({size:0,type:'application/pdf'}),/empty/);
  assert.match(validateFile({size:11*1024*1024,type:'image/png'}),/10 MB/);
  assert.equal(validateFile({size:100,type:'application/pdf'}),null);
  assert.equal(readSession({getItem:()=>'{broken'}),null);
  assert.equal(readSession({getItem:()=>JSON.stringify(createCase(DEMO_INPUT))}).input,DEMO_INPUT);
});
