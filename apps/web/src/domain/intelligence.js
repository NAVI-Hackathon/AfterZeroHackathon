import { UnderstandingSchema } from '../../../../shared/intelligence.js';
import { mockUnderstanding } from '../mocks/understanding.js';

export const intelligenceLabels = {
  hospitalization_claim: '住院醫療理賠', payment_method_change: '更改繳費方式',
  policy_change: '保單變更', policy_information: '保單資訊', unknown: '需要補充說明',
};
export const serviceLabel = serviceType => intelligenceLabels[serviceType] ?? '其他服務';

export function validateUnderstanding(result) { return UnderstandingSchema.parse(result); }

/** Explicit demonstration backup: only the Golden Path (住院醫療理賠), never presented as AI. */
export function demoFallback(message) {
  const result = mockUnderstanding(message);
  return result.data.serviceType === 'hospitalization_claim' ? result : null;
}
