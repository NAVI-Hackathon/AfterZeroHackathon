export function result(serviceType = 'flight_delay', overrides = {}) {
  return { intent: serviceType === 'unknown' ? 'unknown' : 'service_request', serviceType, confidence: serviceType === 'unknown' ? 0.2 : 0.96,
    summary: serviceType === 'flight_delay' ? '使用者表示從東京返回台灣的航班延誤約 7 小時。' : '使用者希望處理相關服務。',
    extractedData: { origin: serviceType === 'flight_delay' ? 'Tokyo' : null, destination: serviceType === 'flight_delay' ? 'Taiwan' : null, delayMinutes: serviceType === 'flight_delay' ? 420 : null, incidentDate: null }, ...overrides };
}
export const inputs = [
  ['我昨天從東京回台灣，班機延誤七個小時。', 'flight_delay'],
  ['My flight from Tokyo to Taipei was delayed for seven hours.', 'flight_delay'],
  ['我要換信用卡扣款。', 'payment_method_change'],
  ['我剛剛發生車禍。', 'vehicle_accident'],
  ['我有個問題。', 'unknown'],
];
