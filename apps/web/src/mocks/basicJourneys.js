import { officialSource, paymentChange } from '../content/cardifData.js';

// Basic (non-Golden-Path) journeys: the user sees the service, what to prepare and where to
// go next, but there is no document workflow yet. Requirements follow the shared contract.

const requirement = (id, name, description, required = true) => ({ id, name, description, required, status: 'missing', weight: 0 });

export const basicJourneys = {
  payment_method_change: {
    title: '更改繳費方式',
    stages: ['需求理解', '服務辨識', '保單資訊', '身分確認', '前往服務'],
    requirements: paymentChange.documents.map((name, i) => requirement(`payment_doc_${i + 1}`, name, '依官網「保單變更」頁面所列的應備文件。')),
    nextAction: {
      type: 'PROCEED_TO_SERVICE', target: 'change_payment_method', title: '前往繳費方式變更',
      description: paymentChange.notes[0] ?? '依官網說明準備文件後辦理。',
      destination: { kind: 'page', path: '/services/policy-change', anchor: 'service-change-payment-method', label: '查看變更繳費方式', source: officialSource(paymentChange.url) },
    },
    steps: ['確認要改的是同一張卡換卡號，或改用其他扣款方式', '依官網說明準備申請書與授權書', '郵寄或透過線上服務辦理'],
  },
  unknown: {
    title: '專員協助',
    stages: ['你的情況', '專員確認', '服務比對', '下一步'],
    requirements: [],
    nextAction: { type: 'CONTACT_SPECIALIST', target: null, title: '轉由專員協助', description: '目前資訊還不足以可靠判斷，NAVI 已整理你的描述，方便專員接續。' },
    steps: [],
  },
};
