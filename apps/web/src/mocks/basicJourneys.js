// Basic (non-Golden-Path) journeys: the user can enter the workspace and see the service,
// what to prepare and where to go next, but there is no document workflow yet.

export const basicJourneys = {
  car_accident: {
    title: '車輛事故',
    stages: ['事件理解', '服務辨識', '事故資訊', '專員確認', '前往服務'],
    requirements: [
      { id: 'incident_detail', name: '事故日期、地點與經過', required: true, status: 'missing' },
      { id: 'incident_photos', name: '現場與車損照片', required: true, status: 'missing' },
      { id: 'police_report', name: '警方事故紀錄（如有報案）', required: false, status: 'missing' },
    ],
    nextAction: { type: 'HANDOFF', target: 'specialist', title: '由專員確認處理方式', description: '車輛事故的保障與處理方式需要專員確認，NAVI 會先整理好你的資訊。' },
    steps: ['記下事故日期、地點與相關人員', '拍下現場與車損照片', '由專員確認保障與後續處理'],
  },
  payment_change: {
    title: '更改繳費方式',
    stages: ['需求理解', '服務辨識', '保單資訊', '身分確認', '前往服務'],
    requirements: [
      { id: 'policy_number', name: '保單號碼', required: true, status: 'missing' },
      { id: 'payment_account', name: '新的扣款帳戶或信用卡', required: true, status: 'missing' },
      { id: 'identity', name: '要保人身分確認', required: true, status: 'missing' },
    ],
    nextAction: { type: 'VIEW_SERVICE', target: 'payment_change', title: '前往繳費方式變更', description: '備妥保單與扣款資訊後，透過既有客戶平台完成身分確認並辦理變更。' },
    steps: ['備妥保單號碼與新的扣款資訊', '透過既有客戶平台完成身分確認', '選擇新的繳費方式並確認變更'],
  },
  unknown: {
    title: '專員協助',
    stages: ['你的情況', '專員確認', '服務比對', '下一步'],
    requirements: [],
    nextAction: { type: 'HANDOFF', target: 'specialist', title: '轉由專員協助', description: '目前資訊還不足以可靠判斷，NAVI 已整理你的描述，方便專員接續。' },
    steps: [],
  },
};
