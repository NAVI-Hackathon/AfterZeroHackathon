import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockAdapter } from './adapters.js';
import { DEMO_STORY } from '../mocks/hospitalClaim.js';
import { ServiceJourneySchema } from '../../../../shared/journey.js';

function memoryStorage() {
  const map = new Map();
  return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k) };
}
const fast = storage => createMockAdapter({ storage, analysisDelayMs: 0, documentDelayMs: 0 });

test('Golden Path 住院醫療理賠: 35 → 70 → 90 → 100 with contract-valid journeys', async () => {
  const service = fast(memoryStorage());
  const { snapshot } = await service.analyze(DEMO_STORY);
  const { journey } = snapshot;
  assert.equal(journey.serviceType, 'hospitalization_claim');
  assert.equal(journey.readiness, 35);
  assert.equal(journey.currentStage, 'EVIDENCE_COLLECTION');
  assert.equal(journey.nextAction.target, 'diagnosis_certificate');
  assert.equal(journey.claimContext.hospital.matchedName, '臺中榮民總醫院');
  assert.equal(journey.claimContext.channels.find(c => c.id === 'hospital_upload').available, true);

  const afterCertificate = await service.uploadDocument('diagnosis_certificate', { sample: true });
  assert.equal(afterCertificate.journey.readiness, 70);
  assert.equal(afterCertificate.journey.nextAction.target, 'bank_passbook');

  const afterPassbook = await service.uploadDocument('bank_passbook', { sample: true });
  assert.equal(afterPassbook.journey.readiness, 90);
  assert.equal(afterPassbook.journey.nextAction.type, 'REVIEW_INFORMATION');
  assert.equal(afterPassbook.journey.currentStage, 'READY_FOR_REVIEW');

  const done = service.confirm();
  assert.equal(done.journey.readiness, 100);
  assert.equal(done.journey.currentStage, 'READY_TO_PROCEED');
  assert.equal(done.journey.nextAction.type, 'PROCEED_TO_SERVICE');
  assert.equal(done.journey.nextAction.target, 'hospital_upload');
  ServiceJourneySchema.parse(done.journey);
});

test('a non-partner hospital routes to 理賠聯盟鏈 instead of 醫起通', async () => {
  const service = fast(memoryStorage());
  const { snapshot } = await service.analyze('我在長庚醫院住院三天，想申請理賠');
  assert.equal(snapshot.journey.claimContext.hospital.partner, false);
  assert.equal(snapshot.journey.claimContext.channels.find(c => c.id === 'hospital_upload').available, false);
  await service.uploadDocument('diagnosis_certificate', { sample: true });
  await service.uploadDocument('bank_passbook', { sample: true });
  assert.equal(service.confirm().journey.nextAction.target, 'union_chain');
});

test('recognition failure leaves the journey unchanged and can be retried', async () => {
  const service = fast(memoryStorage());
  await service.analyze(DEMO_STORY);
  service.setFailNextDocument(true);
  await assert.rejects(service.uploadDocument('diagnosis_certificate', { sample: true }), { code: 'DOCUMENT_RECOGNITION_FAILED' });
  assert.equal(service.restore().journey.readiness, 35);
  assert.equal((await service.uploadDocument('diagnosis_certificate', { sample: true })).journey.readiness, 70);
});

test('manual entry counts as evidence, is validated and survives a reload', async () => {
  const storage = memoryStorage();
  const service = fast(storage);
  await service.analyze(DEMO_STORY);
  assert.throws(() => service.submitManual('diagnosis_certificate', { patientName: '王', hospitalName: '臺中榮民總醫院', admissionDate: '2026-10-02', dischargeDate: '2026-09-28', diagnosis: '示範' }));
  const snapshot = service.submitManual('diagnosis_certificate', { patientName: '王小明', hospitalName: '臺中榮民總醫院', admissionDate: '2026-09-28', dischargeDate: '2026-10-02', diagnosis: '示範' });
  assert.equal(snapshot.journey.readiness, 70);
  assert.equal(snapshot.journey.documents[0].entryMethod, 'manual');
  assert.equal(fast(storage).restore().journey.readiness, 70);
});

test('removing a document withdraws readiness and confirmation', async () => {
  const service = fast(memoryStorage());
  await service.analyze(DEMO_STORY);
  await service.uploadDocument('diagnosis_certificate', { sample: true });
  await service.uploadDocument('bank_passbook', { sample: true });
  service.confirm();
  const snapshot = service.removeDocument('bank_passbook');
  assert.equal(snapshot.journey.readiness, 70);
  assert.equal(snapshot.journey.confirmed, false);
});

test('payment change opens a basic journey; car accidents (not a BNP Paribas Cardif life service) and vague input do not', async () => {
  const car = await fast(memoryStorage()).analyze('我今天開車發生擦撞，想知道要準備什麼');
  assert.equal(car.snapshot, null);
  assert.equal(car.understanding.meta.outcome, 'clarification');
  const payment = await fast(memoryStorage()).analyze('我想更改保單的繳費方式');
  assert.equal(payment.snapshot.journey.nextAction.destination.path, '/services/policy-change');
  const vague = await fast(memoryStorage()).analyze('你好');
  assert.equal(vague.snapshot, null);
  assert.equal(vague.understanding.meta.outcome, 'clarification');
});

test('a tampered stored session is discarded', () => {
  const storage = memoryStorage();
  storage.setItem('navi.demo.journey', JSON.stringify({ v: 3, journeyId: 'x', story: 'x', understanding: { hacked: true }, documents: [], confirmed: true, handoffRequested: false }));
  assert.equal(fast(storage).restore(), null);
});
