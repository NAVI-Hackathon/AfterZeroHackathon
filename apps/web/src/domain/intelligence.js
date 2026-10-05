import { UnderstandingSchema, DEFAULT_CONFIDENCE_THRESHOLD, intentDisposition } from '../../../../shared/intelligence.js';

export const intelligenceLabels = {
  flight_delay: '班機延誤', vehicle_accident: '車輛事故', payment_method_change: '更改繳費方式',
  policy_change: '保單變更', policy_information: '保單資訊', unknown: '需要補充說明',
};
const workflowServices = { flight_delay: 'flight_delay', vehicle_accident: 'car_accident', payment_method_change: 'payment_change' };
export function validateUnderstanding(result) { return UnderstandingSchema.parse(result); }
export function interpretationFromUnderstanding(result) {
  const { data } = validateUnderstanding(result);
  return {
    intent: data.intent,
    serviceType: workflowServices[data.serviceType] || 'unknown',
    confidence: data.confidence, summary: data.summary,
    extractedData: { ...data.extractedData, delayHours: data.extractedData.delayMinutes === null ? null : data.extractedData.delayMinutes / 60 },
  };
}

export function demoFallback(message) {
  // ponytail: explicit demonstration backup supports only this golden path; never treat it as AI.
  if (!/(?:flight|plane|airline|班機|航班|飛機)/i.test(message) || !/(?:delay|延誤)/i.test(message)) return null;
  const hours = message.match(/(\d+(?:\.\d+)?)\s*(?:hours?|小時|個小時)/i);
  const minutes = hours ? Math.round(Number(hours[1]) * 60) : /seven|七/.test(message) ? 420 : null;
  const data = {
    intent: 'service_request', serviceType: 'flight_delay', confidence: 0.94,
    summary: '示範備援已辨識班機延誤需求；本次未使用 AI 判讀。',
    extractedData: {
      origin: /Tokyo|東京/i.test(message) ? 'Tokyo' : null,
      destination: /Taipei|台北/i.test(message) ? 'Taipei' : /Taiwan|台灣/i.test(message) ? 'Taiwan' : null,
      delayMinutes: minutes !== null && minutes <= 525600 ? minutes : null, incidentDate: null,
    },
  };
  return validateUnderstanding({ success: true, data, meta: { source: 'demo_fallback', confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD, outcome: intentDisposition(data) } });
}
