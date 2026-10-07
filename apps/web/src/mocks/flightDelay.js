// Golden Path mock content: flight delay. Document fixtures stay in knowledge/documents.json
// (owned by Developer B); this file only holds front-end wording around them.

export const DEMO_STORY = '我昨天從東京回台灣，班機延誤了 7 小時，不知道可以申請什麼。';

export const documentSpecs = {
  boarding_pass: {
    title: '登機證',
    match: '搭乘證明',
    gain: 35,
    hint: '確認旅客姓名、航班與搭乘日期。',
  },
  delay_certificate: {
    title: '航空公司延誤證明',
    match: '班機延誤證明',
    gain: 20,
    hint: '由航空公司開立，記錄原訂與實際起飛時間。',
  },
};

export const requirementNames = {
  incident: '事件資訊',
  service: '服務辨識',
  travel: '航班資訊',
  boarding_pass: '登機證',
  delay_certificate: '航空公司延誤證明',
  confirmation: '資料確認',
};

export const nextActions = {
  boarding_pass: { type: 'UPLOAD_DOCUMENT', target: 'boarding_pass', title: '請上傳登機證', description: '先確認旅客與航班資訊，補齊搭乘證明。' },
  delay_certificate: { type: 'UPLOAD_DOCUMENT', target: 'delay_certificate', title: '請上傳航空公司延誤證明', description: '此文件可協助確認班機實際延誤時間。' },
  review: { type: 'REVIEW_DATA', target: null, title: '確認案件資料', description: '必要文件已備齊，請再確認一次辨識出的資訊。' },
  proceed: { type: 'PROCEED_TO_SERVICE', target: 'flight_delay_claim', title: '前往理賠服務入口', description: '資料已準備完成，接著由既有理賠服務接續審核。' },
  specialist: { type: 'HANDOFF', target: 'specialist', title: '轉由專員協助', description: '部分條件需要專員確認，我們已整理好目前的資訊。' },
};

export const stages = ['事件理解', '服務辨識', '文件準備', '資料確認', '前往申請'];

export const assistantFaq = [
  { id: 'why-delay', question: '為什麼需要延誤證明？', match: /為什麼|證明|why|certificate/i },
  { id: 'coverage', question: '延誤 7 小時可以申請嗎？', match: /可以申請|理賠|保障|cover|eligible/i },
  { id: 'documents', question: '需要準備哪些文件？', match: /文件|準備|document|need/i },
];
