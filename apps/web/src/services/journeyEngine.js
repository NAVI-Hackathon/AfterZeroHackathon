import { z } from 'zod';
import { createCase, addMockEvidence, removeEvidence, deriveWorkflow, delayMinutes, STATES } from '../domain/workflow.js';
import { intelligenceLabels, validateUnderstanding } from '../domain/intelligence.js';
import { JourneySchema, DocumentSchema } from '../../../../shared/journey.js';
import { nextActions, requirementNames } from '../mocks/flightDelay.js';
import { basicJourneys } from '../mocks/basicJourneys.js';

// Local journey engine used by both adapters until the backend exposes journey endpoints.
// Readiness and workflow rules stay in domain/workflow.js (Developer B); this file only maps
// that state onto the shared Journey contract and handles serialisation.

const DOCUMENT_TYPES = ['boarding_pass', 'delay_certificate'];

export function createSession(story, understanding) {
  const claim = createCase(story, understanding);
  return { journeyId: `journey_${claim.createdAt.toString(36)}`, claim, sources: {} };
}

export function supportsDocuments(session) {
  return session.claim.interpretation.serviceType === 'flight_delay';
}

export function applySampleDocument(session, type, filename, source = 'sample') {
  return { ...session, claim: addMockEvidence(session.claim, type, filename), sources: { ...session.sources, [type]: source } };
}

const ManualBoardingPass = z.object({
  passengerName: z.string().trim().min(1).max(60),
  flightNumber: z.string().trim().min(2).max(10),
  origin: z.string().trim().min(1).max(40),
  destination: z.string().trim().min(1).max(40),
  departureDate: z.iso.date(),
}).strict();
const ManualDelayCertificate = z.object({
  flightNumber: z.string().trim().min(2).max(10),
  scheduledDeparture: z.iso.datetime({ offset: true }),
  actualDeparture: z.iso.datetime({ offset: true }),
}).strict().refine(f => delayMinutes(f) !== null, { message: '實際起飛時間需晚於原訂時間' });
export const manualSchemas = { boarding_pass: ManualBoardingPass, delay_certificate: ManualDelayCertificate };

export function applyManualDocument(session, type, fields) {
  if (!supportsDocuments(session) || !manualSchemas[type]) throw new Error('Unsupported document requirement.');
  const parsed = manualSchemas[type].parse(fields);
  const evidence = { documentType: type, confidence: 1, fields: parsed, filename: '手動輸入', isMock: false };
  return {
    ...session,
    claim: { ...session.claim, confirmed: false, evidence: { ...session.claim.evidence, [type]: evidence } },
    sources: { ...session.sources, [type]: 'manual' },
  };
}

export function removeDocument(session, type) {
  const sources = { ...session.sources };
  delete sources[type];
  return { ...session, claim: removeEvidence(session.claim, type), sources };
}

export function confirmSession(session) {
  const workflow = deriveWorkflow(session.claim);
  if (workflow.state !== STATES.READY_FOR_REVIEW) throw new Error('Journey is not ready for review.');
  return { ...session, claim: { ...session.claim, confirmed: true } };
}

export function requestHandoff(session) {
  return { ...session, claim: { ...session.claim, handoffRequested: true } };
}

function flightNextAction(workflow, confirmed) {
  if (workflow.state === STATES.HUMAN_REVIEW) return nextActions.specialist;
  if (workflow.next === 'review') return confirmed ? nextActions.proceed : nextActions.review;
  return nextActions[workflow.next];
}

/** Session → { journey, documents, context }. journey/documents are validated against the shared contract. */
export function toSnapshot(session) {
  const { claim } = session;
  const workflow = deriveWorkflow(claim);
  const intelligence = claim.intelligence;
  const serviceKey = claim.interpretation.serviceType;
  const isFlight = serviceKey === 'flight_delay';
  const basic = basicJourneys[workflow.state === STATES.HUMAN_REVIEW && !isFlight ? 'unknown' : serviceKey] ?? basicJourneys.unknown;
  const proceeding = isFlight && claim.confirmed && workflow.state === STATES.READY_FOR_REVIEW;

  const journey = JourneySchema.parse({
    id: session.journeyId,
    serviceType: intelligence?.data.serviceType ?? serviceKey,
    title: intelligence ? intelligenceLabels[intelligence.data.serviceType] : basic.title,
    currentStage: proceeding ? 'READY_TO_PROCEED' : workflow.state,
    readiness: isFlight ? workflow.score : 0,
    confidence: claim.interpretation.confidence,
    requirements: isFlight
      ? workflow.requirements.map(r => ({ id: r.id, name: requirementNames[r.id], required: true, status: r.complete ? 'verified' : 'missing' }))
      : basic.requirements,
    nextAction: isFlight ? flightNextAction(workflow, claim.confirmed) : basic.nextAction,
  });

  const documents = Object.entries(claim.evidence).map(([type, evidence]) => DocumentSchema.parse({
    id: `doc_${type}`,
    documentType: type,
    status: session.sources[type] === 'manual' ? 'manual' : 'verified',
    confidence: evidence.confidence,
    fields: Object.fromEntries(Object.entries(evidence.fields).map(([key, value]) => [key, String(value)])),
  }));

  return {
    journey,
    documents,
    context: {
      serviceKey,
      story: claim.input,
      summary: intelligence?.data.summary ?? '',
      source: intelligence?.meta.source ?? 'demo_fallback',
      reported: intelligence?.data.extractedData ?? { origin: null, destination: null, delayMinutes: null, incidentDate: null },
      verifiedDelayMinutes: workflow.delay ?? null,
      files: Object.fromEntries(Object.entries(claim.evidence).map(([type, evidence]) => [type, evidence.filename])),
      handoffRequested: claim.handoffRequested,
    },
  };
}

const StoredSession = z.object({
  v: z.literal(2),
  journeyId: z.string().regex(/^journey_[a-z0-9]+$/),
  story: z.string().min(1).max(2000),
  intelligence: z.unknown(),
  evidence: z.partialRecord(z.enum(DOCUMENT_TYPES), z.object({
    source: z.enum(['sample', 'upload', 'manual']),
    filename: z.string().max(260),
    fields: z.record(z.string(), z.string()).optional(),
  })),
  confirmed: z.boolean(),
  handoffRequested: z.boolean(),
});

export function serializeSession(session) {
  const evidence = Object.fromEntries(Object.entries(session.claim.evidence).map(([type, e]) => {
    const source = session.sources[type] ?? 'sample';
    return [type, { source, filename: e.filename, ...(source === 'manual' ? { fields: e.fields } : {}) }];
  }));
  return JSON.stringify({
    v: 2, journeyId: session.journeyId, story: session.claim.input, intelligence: session.claim.intelligence,
    evidence, confirmed: session.claim.confirmed, handoffRequested: session.claim.handoffRequested,
  });
}

/** Returns null for anything that does not validate — a stale or tampered tab simply starts over. */
export function restoreSession(raw) {
  try {
    const stored = StoredSession.parse(JSON.parse(raw));
    let session = { ...createSession(stored.story, validateUnderstanding(stored.intelligence)), journeyId: stored.journeyId };
    for (const [type, e] of Object.entries(stored.evidence)) {
      session = e.source === 'manual' ? applyManualDocument(session, type, e.fields) : applySampleDocument(session, type, e.filename, e.source);
    }
    if (stored.confirmed) session = confirmSession(session);
    if (stored.handoffRequested) session = requestHandoff(session);
    return session;
  } catch {
    return null;
  }
}
