export const DEMO_STORY = '我從東京回台灣的班機延誤了 7 小時，不知道可以怎麼處理。';
export const serviceCopy = {
  flight_delay:{title:'班機延誤理賠',english:'Flight Delay',category:'旅遊保障',description:'整理航班資訊與延誤證明，讓下一步更清楚。',stages:['事件理解','服務比對','文件準備','資料確認','前往服務']},
  car_accident:{title:'車禍事故',english:'Car Accident',category:'汽車保障',description:'先整理事故資訊，再由專員確認適合的處理方式。',stages:['事件理解','服務比對','事故資訊','專員確認','前往服務']},
  payment_change:{title:'更改繳費方式',english:'Payment Method',category:'保單服務',description:'準備保單資訊，經身分確認後前往既有平台調整繳費方式。',stages:['需求理解','服務比對','保單資訊','身分確認','更改繳費方式']},
  unknown:{title:'專員協助',english:'Specialist Assistance',category:'服務協助',description:'這個情況需要進一步確認，我們會先整理好你的資訊。',stages:['你的情況','專員確認','服務比對','下一步']},
};
export const documentCopy = {
  boarding_pass:{title:'登機證',english:'Boarding Pass',requirement:'旅行證明'},
  delay_certificate:{title:'航空公司延誤證明',english:'Delay Certificate',requirement:'航班延誤證明'},
};
export const requirementCopy = {incident:'事件資訊',service:'相關服務',travel:'航班資訊',boarding_pass:'登機證',delay_certificate:'延誤證明',confirmation:'資料確認'};
export const city = value => ({Tokyo:'東京',Taipei:'台北',Taiwan:'台灣'})[value] || value || '待確認';
export const delayText = minutes => minutes === null ? '待確認' : `${Math.floor(minutes/60)} 小時 ${minutes%60} 分`;
export const safeGuidance = '目前資訊可能與此服務相關。保障範圍及理賠結果，仍須依保單條款與保險公司審核確認。';
export function fileError(error) {
  if(!error) return '';
  if(error.includes('empty')) return '這份文件是空的，請重新選擇。';
  if(error.includes('10 MB')) return '文件超過 10 MB，請選擇較小的檔案。';
  return '不支援這個檔案格式。請使用 PDF、PNG、JPG 或 WebP。';
}
