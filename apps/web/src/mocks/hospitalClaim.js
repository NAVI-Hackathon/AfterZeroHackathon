// Golden Path demo content: 住院醫療理賠. Insurer rules come from content/cardifData.js;
// this file only holds the demo story and the clearly-fictional sample documents.

export const DEMO_STORY = '我上週在台中榮總住院五天，要怎麼申請理賠？';

export const documentFixtures = {
  diagnosis_certificate: {
    sampleName: '診斷證明書-範例.pdf', mimeType: 'application/pdf', size: 186_000, confidence: 0.96,
    fields: { patientName: '陳恩如', hospitalName: '臺中榮民總醫院', admissionDate: '2026-09-28', dischargeDate: '2026-10-02', diagnosis: '急性腸胃炎（示範資料）' },
  },
  bank_passbook: {
    sampleName: '存摺封面-範例.jpg', mimeType: 'image/jpeg', size: 142_000, confidence: 0.97,
    fields: { accountHolder: '陳恩如', bankName: '示範銀行', accountLast4: '1234' },
  },
};

export const documentSpecs = {
  diagnosis_certificate: { title: '診斷書或住院證明', match: '住院醫療・診斷書或住院證明', gain: 35, hint: '確認醫院、住院期間與病名。' },
  bank_passbook: { title: '存摺影本', match: '匯款給付・存摺影本', gain: 20, hint: '理賠金以匯款給付時需要，確認戶名與帳號。' },
};

export const DOCUMENT_TYPES = Object.keys(documentSpecs);

export const stages = ['事件理解', '醫院與管道', '文件準備', '資料確認', '前往申請'];

export const assistantQuestions = [
  { id: 'duration', question: '理賠要多久？', match: /多久|時間|幾天/ },
  { id: 'hospital', question: '醫起通是什麼？', match: /醫起通|醫院上傳|合作醫院/ },
  { id: 'originals', question: '線上申請還要寄正本嗎？', match: /正本|寄回|聯盟鏈/ },
];
