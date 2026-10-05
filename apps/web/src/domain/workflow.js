import { interpretationFromUnderstanding, validateUnderstanding } from './intelligence.js';
import services from '../../../../knowledge/services.json' with { type: 'json' };
import documents from '../../../../knowledge/documents.json' with { type: 'json' };
import rules from '../../../../knowledge/claims.json' with { type: 'json' };

export { services, documents, rules };
export const STORAGE_KEY = 'navi.case';
// Compatibility only: preserve an existing browser-tab journey during the brand migration.
export const LEGACY_STORAGE_KEY = 'claimpilot.case';
export const DEMO_INPUT = 'My flight from Tokyo to Taipei was delayed for seven hours. Can I claim anything?';
export const STATES = Object.freeze({ NEW:'NEW', INCIDENT_IDENTIFIED:'INCIDENT_IDENTIFIED', SERVICE_IDENTIFIED:'SERVICE_IDENTIFIED', EVIDENCE_COLLECTION:'EVIDENCE_COLLECTION', READY_FOR_REVIEW:'READY_FOR_REVIEW', HUMAN_REVIEW:'HUMAN_REVIEW', READY_TO_PROCEED:'READY_TO_PROCEED' });

export function interpretMock(input) {
  // Legacy Phase 1 sessions/tests only. The current Landing uses the Intelligence API.
  const flight = /(?:flight|plane|airline|班機|航班|飛機)/i.test(input) && /(?:delay|延誤)/i.test(input);
  const car = /(?:car|vehicle|車)/i.test(input) && /(?:accident|crash|車禍|事故)/i.test(input);
  const payment = /(?:payment|付款|繳費|扣款)/i.test(input) && /(?:change|update|更改|變更|修改)/i.test(input);
  const delayMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:hours?|小時|個小時)/i);
  const serviceType = flight ? 'flight_delay' : car ? 'car_accident' : payment ? 'payment_change' : 'unknown';
  return {
    intent: payment ? 'policy_service' : serviceType === 'unknown' ? 'unknown' : 'claim',
    serviceType, confidence: serviceType === 'unknown' ? 0.42 : 0.94,
    summary: flight ? 'You reported a flight delay. Let’s organize the evidence for review.' : services.find(s => s.id === serviceType).description,
    extractedData: flight ? {
      origin: /(?:Tokyo|東京)/i.test(input) ? 'Tokyo' : null,
      destination: /(?:Taipei|台北|台灣|Taiwan)/i.test(input) ? 'Taipei' : null,
      delayHours: delayMatch ? Number(delayMatch[1]) : /seven|七/.test(input) ? 7 : null,
    } : {},
  };
}

export function createCase(input, understanding) {
  const intelligence = understanding ? validateUnderstanding(understanding) : null;
  const interpretation = intelligence ? interpretationFromUnderstanding(intelligence) : interpretMock(input.trim());
  return { ...(intelligence ? { intelligence } : {}), version:1, id:'CP-DEMO-001', createdAt:Date.now(), input:input.trim(), interpretation, evidence:{}, confirmed:false, handoffRequested:false };
}

export function delayMinutes(fields) {
  const minutes = (Date.parse(fields.actualDeparture) - Date.parse(fields.scheduledDeparture)) / 60000;
  return Number.isFinite(minutes) && minutes >= 0 ? Math.round(minutes) : null;
}

export function formatDelay(minutes) {
  return minutes === null ? 'Needs confirmation' : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function validateFile(file) {
  if (!file || !file.size) return 'This file is empty. Choose a JPG, PNG, WebP or PDF.';
  if (file.size > 10 * 1024 * 1024) return 'This file exceeds 10 MB. Choose a smaller file.';
  if (!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type)) return 'Unsupported format. Choose a JPG, PNG, WebP or PDF.';
  return null;
}

export function addMockEvidence(claim, type, filename) {
  if (claim.interpretation.serviceType !== 'flight_delay' || !documents[type]) throw new Error('Unsupported document requirement.');
  const result = { documentType:type, confidence:documents[type].confidence, fields:{...documents[type].fields}, filename, isMock:true };
  return { ...claim, confirmed:false, evidence:{ ...claim.evidence, [type]:result } };
}

export function removeEvidence(claim, type) {
  const evidence = { ...claim.evidence };
  delete evidence[type];
  return { ...claim, confirmed:false, evidence };
}

export function deriveWorkflow(claim) {
  if (!claim) return { state:STATES.NEW, score:0, activeStage:0, requirements:[] };
  const { interpretation, evidence } = claim;
  const service = services.find(s => s.id === interpretation.serviceType) ?? services.at(-1);
  const isFlight = service.id === 'flight_delay';
  const lowConfidence = claim.intelligence ? claim.intelligence.meta.outcome === 'human_review' || claim.intelligence.meta.outcome === 'clarification' : interpretation.confidence < rules.confidenceThreshold;
  const hasTravel = Boolean(evidence.boarding_pass?.fields.passengerName && evidence.boarding_pass?.fields.flightNumber && evidence.boarding_pass?.fields.departureDate);
  const hasDelay = Boolean(evidence.delay_certificate && delayMinutes(evidence.delay_certificate.fields) !== null);
  const complete = Boolean(evidence.boarding_pass && hasTravel && hasDelay);
  const checks = { incident:Boolean(claim.input), service:service.id !== 'unknown', travel:hasTravel, boarding_pass:Boolean(evidence.boarding_pass), delay_certificate:hasDelay, confirmation:complete && claim.confirmed };
  const requirements = rules.readiness.map(r => ({ ...r, complete:Boolean(checks[r.id]) }));
  const score = isFlight ? requirements.reduce((total,r) => total + (r.complete ? r.weight : 0), 0) : 0;
  const state = lowConfidence || claim.handoffRequested ? STATES.HUMAN_REVIEW : !isFlight ? STATES.SERVICE_IDENTIFIED : complete ? STATES.READY_FOR_REVIEW : STATES.EVIDENCE_COLLECTION;
  const next = state === STATES.HUMAN_REVIEW ? 'specialist' : !isFlight ? 'service_preview' : !evidence.boarding_pass ? 'boarding_pass' : !hasDelay ? 'delay_certificate' : 'review';
  return { service, state, score, requirements, activeStage:state === STATES.HUMAN_REVIEW && !isFlight ? 1 : complete ? 3 : 2, next, delay:hasDelay ? delayMinutes(evidence.delay_certificate.fields) : null };
}

export function readSession(storage) {
  try {
    const claim = JSON.parse(storage.getItem(STORAGE_KEY) ?? storage.getItem(LEGACY_STORAGE_KEY));
    if (!claim || claim.version !== 1 || typeof claim.input !== 'string' || claim.input.length > 2000 || !claim.interpretation || !services.some(s => s.id === claim.interpretation.serviceType) || !claim.evidence) return null;
    // Preserve validated AI facts. Mock document fields still restore from owned fixtures.
    let restored = createCase(claim.input, claim.intelligence);
    for (const type of Object.keys(documents)) if (typeof claim.evidence[type]?.filename === 'string') restored = addMockEvidence(restored, type, claim.evidence[type].filename);
    return { ...restored, confirmed:claim.confirmed === true, handoffRequested:claim.handoffRequested === true };
  } catch { return null; }
}
