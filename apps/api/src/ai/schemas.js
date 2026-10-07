import { z } from 'zod';
import { IntentDataSchema, intentTypes, serviceTypes } from '../../../../shared/intelligence.js';
import { DocumentAnalysisSchema, DocumentClockTimeSchema } from '../../../../shared/journey.js';
import { normalizeIntent } from '../schemas/intent.schema.js';

const confidence = z.number().finite();
const text = z.string().trim().min(1).max(120).nullable();
export const GeminiIntentSchema = IntentDataSchema.extend({
  intent: z.string().trim().min(1).max(80), serviceType: z.string().trim().min(1).max(80), confidence: confidence.default(0),
  missingInformation: z.array(z.string().max(120)).max(20).optional(),
});
export const intentJsonSchema = z.toJSONSchema(IntentDataSchema.extend({ missingInformation: z.array(z.string().max(120)).max(20).optional() }));
const aliases = {
  service_discovery: 'service_request', claim: 'service_request', service_navigation: 'service_request',
  information_query: 'knowledge_query', car_accident: 'vehicle_accident', flight_delay_claim: 'flight_delay', payment_change: 'payment_method_change',
  hospital_claim: 'hospitalization_claim', hospitalization: 'hospitalization_claim', medical_claim: 'hospitalization_claim', inpatient_claim: 'hospitalization_claim',
};
const canonical = (value, values) => {
  const key = value.toLowerCase().replace(/[\s-]+/g, '_');
  const mapped = aliases[key] ?? key;
  return values.includes(mapped) ? mapped : 'unknown';
};
export function normalizeGeminiIntent(raw) {
  const { missingInformation, ...data } = GeminiIntentSchema.parse(raw);
  data.intent = canonical(data.intent, intentTypes);
  data.serviceType = canonical(data.serviceType, serviceTypes);
  data.confidence = Math.max(0, Math.min(1, data.confidence));
  // A recognized class without travel details is still actionable; never invent those details.
  if (data.serviceType === 'unknown' || data.intent === 'unknown') data.confidence = Math.min(data.confidence, 0.4);
  else if (data.serviceType === 'flight_delay') {
    const provided = Object.values(data.extractedData).filter(value => value !== null).length;
    data.confidence = Math.max(0, data.confidence - (4 - provided) * 0.02);
  }
  data.confidence = Math.round(data.confidence * 1000) / 1000;
  return normalizeIntent(data);
}
export const GeminiDocumentSchema = z.object({
  documentType: z.enum(['boarding_pass', 'delay_certificate', 'unknown']), confidence,
  fields: z.object({ passengerName: text, flightNumber: text, origin: text, destination: text,
    departureDate: z.iso.date().nullable(), actualDepartureDate: z.iso.date().nullable(),
    scheduledDeparture: DocumentClockTimeSchema,
    actualDeparture: DocumentClockTimeSchema,
  }).strict(),
}).strict();
export const documentJsonSchema = z.toJSONSchema(GeminiDocumentSchema.extend({ confidence: z.number().min(0).max(1) }));
export function normalizeGeminiDocument(raw) {
  const parsed = GeminiDocumentSchema.parse(raw);
  parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));
  if (parsed.documentType === 'unknown') return { documentType: 'unknown', confidence: Math.min(parsed.confidence, 0.4), fields: {} };
  const allowed = parsed.documentType === 'boarding_pass'
    ? ['passengerName', 'flightNumber', 'origin', 'destination', 'departureDate', 'scheduledDeparture']
    : ['passengerName', 'flightNumber', 'origin', 'destination', 'departureDate', 'actualDepartureDate', 'scheduledDeparture', 'actualDeparture'];
  return DocumentAnalysisSchema.parse({ ...parsed, fields: Object.fromEntries(allowed.map(key => [key, parsed.fields[key]])) });
}
export const GroundedAnswerSchema = z.object({ answer: z.string().trim().min(1).max(2000), confidence: z.number().finite().min(0).max(1), supported: z.boolean(), sourceIds: z.array(z.string().min(1).max(120)).max(10) }).strict();
export const HandoffSelectionSchema = z.object({ factIds: z.array(z.string().max(120)).min(1).max(30) }).strict();
