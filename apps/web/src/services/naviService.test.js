import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockAdapter } from './adapters.js';
import { DEMO_STORY } from '../mocks/flightDelay.js';
import { JourneySchema, DocumentSchema } from '../../../../shared/journey.js';

function memoryStorage() {
  const map = new Map();
  return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k) };
}
const fast = storage => createMockAdapter({ storage, analysisDelayMs: 0, documentDelayMs: 0 });

test('Golden Path: 35 → 70 → 90 → 100 with contract-valid snapshots', async () => {
  const service = fast(memoryStorage());
  const { snapshot } = await service.analyze(DEMO_STORY);
  assert.equal(snapshot.journey.serviceType, 'flight_delay');
  assert.equal(snapshot.journey.readiness, 35);
  assert.deepEqual(snapshot.journey.nextAction.target, 'boarding_pass');
  assert.equal(snapshot.journey.currentStage, 'EVIDENCE_COLLECTION');

  const afterBoarding = await service.uploadDocument('boarding_pass', { sample: true });
  assert.equal(afterBoarding.journey.readiness, 70);
  assert.equal(afterBoarding.journey.nextAction.target, 'delay_certificate');

  const afterDelay = await service.uploadDocument('delay_certificate', { sample: true });
  assert.equal(afterDelay.journey.readiness, 90);
  assert.equal(afterDelay.journey.nextAction.type, 'REVIEW_DATA');
  assert.equal(afterDelay.context.verifiedDelayMinutes, 443);

  const done = service.confirm();
  assert.equal(done.journey.readiness, 100);
  assert.equal(done.journey.currentStage, 'READY_TO_PROCEED');
  assert.equal(done.journey.nextAction.type, 'PROCEED_TO_SERVICE');
  JourneySchema.parse(done.journey);
  done.documents.forEach(d => DocumentSchema.parse(d));
});

test('recognition failure leaves the journey unchanged and can be retried', async () => {
  const service = fast(memoryStorage());
  await service.analyze(DEMO_STORY);
  service.setFailNextDocument(true);
  await assert.rejects(service.uploadDocument('boarding_pass', { sample: true }), { code: 'DOCUMENT_RECOGNITION_FAILED' });
  assert.equal(service.restore().journey.readiness, 35);
  const retried = await service.uploadDocument('boarding_pass', { sample: true });
  assert.equal(retried.journey.readiness, 70);
});

test('manual entry counts as evidence and survives a reload', async () => {
  const storage = memoryStorage();
  const service = fast(storage);
  await service.analyze(DEMO_STORY);
  await service.uploadDocument('boarding_pass', { sample: true });
  const snapshot = service.submitManual('delay_certificate', {
    flightNumber: 'BR197', scheduledDeparture: '2026-10-05T14:20:00+09:00', actualDeparture: '2026-10-05T21:43:00+09:00',
  });
  assert.equal(snapshot.journey.readiness, 90);
  assert.equal(snapshot.documents.find(d => d.documentType === 'delay_certificate').status, 'manual');
  const reloaded = fast(storage).restore();
  assert.equal(reloaded.journey.readiness, 90);
  assert.equal(reloaded.context.verifiedDelayMinutes, 443);
});

test('manual entry rejects an actual departure before the scheduled one', async () => {
  const service = fast(memoryStorage());
  await service.analyze(DEMO_STORY);
  assert.throws(() => service.submitManual('delay_certificate', {
    flightNumber: 'BR197', scheduledDeparture: '2026-10-05T21:43:00+09:00', actualDeparture: '2026-10-05T14:20:00+09:00',
  }));
});

test('removing a document withdraws readiness and confirmation', async () => {
  const service = fast(memoryStorage());
  await service.analyze(DEMO_STORY);
  await service.uploadDocument('boarding_pass', { sample: true });
  await service.uploadDocument('delay_certificate', { sample: true });
  service.confirm();
  const snapshot = service.removeDocument('delay_certificate');
  assert.equal(snapshot.journey.readiness, 70);
  assert.equal(snapshot.journey.nextAction.target, 'delay_certificate');
});

test('car accident and payment change open a basic journey; vague input does not', async () => {
  const car = await fast(memoryStorage()).analyze('我發生車禍了，想知道接下來要準備什麼');
  assert.equal(car.snapshot.journey.serviceType, 'vehicle_accident');
  assert.equal(car.snapshot.journey.requirements.length, 3);
  assert.equal(car.snapshot.journey.nextAction.type, 'HANDOFF');

  const payment = await fast(memoryStorage()).analyze('我想更改保單的繳費方式');
  assert.equal(payment.snapshot.journey.nextAction.type, 'VIEW_SERVICE');

  const vague = await fast(memoryStorage()).analyze('你好');
  assert.equal(vague.snapshot, null);
  assert.equal(vague.understanding.meta.outcome, 'clarification');
});

test('a tampered stored session is discarded', () => {
  const storage = memoryStorage();
  storage.setItem('navi.demo.journey', JSON.stringify({ v: 2, journeyId: 'journey_x', story: 'x', intelligence: { hacked: true }, evidence: {}, confirmed: true, handoffRequested: false }));
  assert.equal(fast(storage).restore(), null);
});
