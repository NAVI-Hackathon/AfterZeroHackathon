import { z } from 'zod';
import { IntentDataSchema, MAX_MESSAGE_LENGTH, serviceTypes } from './intelligence.js';

export const JOURNEY_STATES = Object.freeze({ NEW: 'NEW', INCIDENT_IDENTIFIED: 'INCIDENT_IDENTIFIED', SERVICE_IDENTIFIED: 'SERVICE_IDENTIFIED', EVIDENCE_COLLECTION: 'EVIDENCE_COLLECTION', READY_FOR_REVIEW: 'READY_FOR_REVIEW', HUMAN_REVIEW: 'HUMAN_REVIEW', READY_TO_PROCEED: 'READY_TO_PROCEED' });
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
export const DocumentClockTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable();
const departureTime = z.union([DocumentClockTimeSchema.unwrap(), z.iso.datetime({ offset: true })]).nullable();
const text = z.string().trim().min(1).max(120).nullable();
export const DocumentAnalysisSchema = z.discriminatedUnion('documentType', [
  z.object({ documentType: z.literal('boarding_pass'), confidence: z.number().finite().min(0).max(1), fields: z.object({ passengerName: text, flightNumber: text, origin: text, destination: text, departureDate: z.iso.date().nullable(), scheduledDeparture: departureTime.optional() }).strict() }).strict(),
  z.object({ documentType: z.literal('delay_certificate'), confidence: z.number().finite().min(0).max(1), fields: z.object({ flightNumber: text, scheduledDeparture: departureTime, actualDeparture: departureTime, departureDate: z.iso.date().nullable().optional(), actualDepartureDate: z.iso.date().nullable().optional(), passengerName: text.optional(), origin: text.optional(), destination: text.optional(), delayMinutes: z.number().int().min(0).max(525600).nullable().optional() }).strict() }).strict(),
  z.object({ documentType: z.literal('unknown'), confidence: z.number().finite().min(0).max(1), fields: z.object({}).strict() }).strict(),
]);
export const RequirementSchema = z.object({ id: z.string(), name: z.string(), description: z.string(), required: z.boolean(), status: z.enum(['missing', 'uploaded', 'verified', 'needs_review']), weight: z.number().int().min(0).max(100) }).strict();
export const KnowledgeSourceSchema = z.object({ id: z.string(), title: z.string(), section: z.string(), type: z.enum(['prototype_guide', 'prototype_faq']), isMock: z.literal(true), url: z.null() }).strict();
export const NextActionSchema = z.object({ type: z.enum(['UPLOAD_DOCUMENT', 'PROVIDE_INFORMATION', 'REVIEW_INFORMATION', 'CONTACT_SPECIALIST', 'PROCEED_TO_SERVICE', 'NONE']), target: z.string().nullable(), title: z.string(), description: z.string() }).strict();
const documentMetadata = z.object({ id: z.string().uuid(), status: z.enum(['uploaded', 'verified', 'needs_review']), matchedRequirements: z.array(z.string()), filename: z.string().max(180), mimeType: z.enum(DOCUMENT_MIME_TYPES), size: z.number().int().positive().max(MAX_DOCUMENT_BYTES), source: z.enum(['demo', 'live']), isMock: z.boolean() }).strict();
export const DocumentSchema = z.discriminatedUnion('documentType', DocumentAnalysisSchema.options.map(schema => schema.extend(documentMetadata.shape)));
export const ConversationSchema = z.object({ role: z.enum(['user', 'assistant']), message: z.string().max(MAX_MESSAGE_LENGTH), createdAt: z.iso.datetime() }).strict();
export const ConsistencyIssueSchema = z.object({ type: z.enum(['FLIGHT_NUMBER_MISMATCH', 'DEPARTURE_DATE_MISMATCH', 'ORIGIN_MISMATCH', 'DESTINATION_MISMATCH', 'PASSENGER_NAME_MISMATCH']), severity: z.literal('high'), message: z.string(), documentIds: z.array(z.string().uuid()) }).strict();
export const ServiceJourneySchema = z.object({
  id: z.string().uuid(), serviceType: z.enum(serviceTypes), title: z.string(), summary: z.string().max(300), confidence: z.number().min(0).max(1), currentStage: z.enum(Object.values(JOURNEY_STATES)), readiness: z.number().int().min(0).max(100),
  extractedData: IntentDataSchema.shape.extractedData, requirements: z.array(RequirementSchema), documents: z.array(DocumentSchema), conversation: z.array(ConversationSchema), nextAction: NextActionSchema, sources: z.array(KnowledgeSourceSchema),
  consistencyIssues: z.array(ConsistencyIssueSchema).optional(), confirmed: z.boolean(), supported: z.boolean(), provider: z.enum(['demo', 'live', 'provided']), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(), disclaimer: z.string(),
}).strict();
export const CreateJourneyRequestSchema = z.object({ message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH), intentResult: IntentDataSchema.optional() }).strict();
export const ReviewRequestSchema = z.object({ confirmed: z.literal(true) }).strict();
