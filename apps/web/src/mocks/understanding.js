import { DEFAULT_CONFIDENCE_THRESHOLD, intentDisposition } from '../../../../shared/intelligence.js';
import { validateUnderstanding } from '../domain/intelligence.js';

// Demo-mode intent understanding. Never presented as AI: meta.source is always demo_fallback.
const scenarios = [
  {
    match: text => /(?:flight|plane|airline|班機|航班|飛機)/i.test(text) && /(?:delay|延誤|誤點)/i.test(text),
    data: text => {
      const hours = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|小時|個小時)/i);
      const minutes = hours ? Math.round(Number(hours[1]) * 60) : /seven|七/.test(text) ? 420 : null;
      return {
        intent: 'service_request', serviceType: 'flight_delay', confidence: 0.94,
        summary: '你描述的是國際航班延誤。先整理航班資訊與延誤證明，再由保險公司確認保障條件。',
        extractedData: {
          origin: /Tokyo|東京/i.test(text) ? 'Tokyo' : null,
          destination: /Taipei|台北|臺北/i.test(text) ? 'Taipei' : /Taiwan|台灣|臺灣/i.test(text) ? 'Taiwan' : null,
          delayMinutes: minutes !== null && minutes <= 525600 ? minutes : null,
          incidentDate: null,
        },
      };
    },
  },
  {
    match: text => /(?:car|vehicle|車)/i.test(text) && /(?:accident|crash|車禍|事故|擦撞|追撞)/i.test(text),
    data: () => ({
      intent: 'service_request', serviceType: 'vehicle_accident', confidence: 0.9,
      summary: '你描述的是車輛事故。先整理事故資訊，再由專員確認適用的保障與處理方式。',
      extractedData: { origin: null, destination: null, delayMinutes: null, incidentDate: null },
    }),
  },
  {
    match: text => /(?:payment|付款|繳費|扣款|信用卡|轉帳)/i.test(text) && /(?:change|update|更改|變更|修改|換)/i.test(text),
    data: () => ({
      intent: 'service_request', serviceType: 'payment_method_change', confidence: 0.92,
      summary: '你想更改保單的繳費方式。先確認保單與身分，再前往既有平台辦理。',
      extractedData: { origin: null, destination: null, delayMinutes: null, incidentDate: null },
    }),
  },
];

const unknown = {
  intent: 'unknown', serviceType: 'unknown', confidence: 0.4,
  summary: '目前的描述還不足以判斷需要哪一項服務。',
  extractedData: { origin: null, destination: null, delayMinutes: null, incidentDate: null },
};

export function mockUnderstanding(message) {
  const text = message.trim();
  const scenario = scenarios.find(s => s.match(text));
  const data = scenario ? scenario.data(text) : unknown;
  return validateUnderstanding({
    success: true, data,
    meta: { source: 'demo_fallback', confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD, outcome: intentDisposition(data) },
  });
}
