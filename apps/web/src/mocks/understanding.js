import { DEFAULT_CONFIDENCE_THRESHOLD, intentDisposition } from '../../../../shared/intelligence.js';
import { validateUnderstanding } from '../domain/intelligence.js';

// Demo-mode intent understanding. Never presented as AI: meta.source is always demo_fallback.
const empty = { origin: null, destination: null, delayMinutes: null, incidentDate: null };
const scenarios = [
  {
    match: text => /住院|開刀|手術|出院|醫療.*理賠|理賠.*醫院/.test(text),
    data: { intent: 'service_request', serviceType: 'hospitalization_claim', confidence: 0.94, summary: '你住院後想申請醫療理賠。先確認醫院是否可用醫起通，再整理需要的文件。' },
  },
  {
    match: text => /(?:payment|付款|繳費|扣款|信用卡|轉帳)/i.test(text) && /(?:change|update|更改|變更|修改|換|改)/i.test(text),
    data: { intent: 'service_request', serviceType: 'payment_method_change', confidence: 0.92, summary: '你想更改保單的繳費方式。先確認變更類型，再依官網說明準備文件。' },
  },
];
const unknown = { intent: 'unknown', serviceType: 'unknown', confidence: 0.4, summary: '目前的描述還不足以判斷需要哪一項服務。' };

export function mockUnderstanding(message) {
  const scenario = scenarios.find(s => s.match(message.trim()));
  const data = { ...(scenario ? scenario.data : unknown), extractedData: empty };
  return validateUnderstanding({
    success: true, data,
    meta: { source: 'demo_fallback', confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD, outcome: intentDisposition(data) },
  });
}
