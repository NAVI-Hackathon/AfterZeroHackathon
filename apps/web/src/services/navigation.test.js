import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockAdapter } from './adapters.js';
import { DEMO_STORY } from '../mocks/hospitalClaim.js';
import { NavigationTargetSchema } from '../../../../shared/journey.js';
import raw from '../../../../data/cardif_seed_data.json' with { type: 'json' };

// Paths that exist in apps/mock-site (app/(site)/…). Keep in sync with components/site/routes.ts.
const MOCK_SITE_PATHS = new Set(['/', '/services', '/services/forms', '/services/policy-change', '/services/policy-loan', '/services/claims', '/services/online', '/glossary', '/faq']);

function memoryStorage() {
  const map = new Map();
  return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k) };
}

test('every Golden Path NextAction points at a valid mock-site location', async () => {
  const service = createMockAdapter({ storage: memoryStorage(), analysisDelayMs: 0, documentDelayMs: 0 });
  const steps = [(await service.analyze(DEMO_STORY)).snapshot];
  steps.push(await service.uploadDocument('diagnosis_certificate', { sample: true }));
  steps.push(await service.uploadDocument('bank_passbook', { sample: true }));
  steps.push(service.confirm());
  const destinations = steps.map(s => s.journey.nextAction.destination);
  for (const destination of destinations) {
    NavigationTargetSchema.parse(destination);
    assert.ok(MOCK_SITE_PATHS.has(destination.path), destination.path);
    assert.match(destination.source.url, /^https:\/\/life\.cardif\.com\.tw\//);
  }
  assert.deepEqual(destinations.map(d => d.kind), ['page', 'page', 'form', 'entry_point']);
  assert.deepEqual(destinations.map(d => d.anchor), ['claim-doc-2', 'claim-rule-7', 'form-claim-1-1-1', 'service-claim-hospital-upload']);
});

test('row anchors follow the data file order shared with the mock site', () => {
  assert.equal(Object.keys(raw.claim_document_requirements)[1], '住院醫療');
  assert.match(raw.claim_general_rules[6], /存摺影本/);
  assert.equal(raw.forms.some(f => f.id === 'claim_1.1.1' && f.name === '保險金申請書'), true);
});

test('every claim channel offers a destination and the partner channel reflects the hospital', async () => {
  const service = createMockAdapter({ storage: memoryStorage(), analysisDelayMs: 0, documentDelayMs: 0 });
  const { journey } = (await service.analyze(DEMO_STORY)).snapshot;
  for (const channel of journey.claimContext.channels) {
    NavigationTargetSchema.parse(channel.destination);
    assert.ok(channel.notes.length > 0);
  }
  assert.deepEqual(journey.claimContext.reminders.map(r => /10日內|30萬|診斷書/.test(r)), [true, true, true]);
});
