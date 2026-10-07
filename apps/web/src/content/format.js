// Display formatting for zh-TW. Pure functions only.

export function dateText(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate ?? '');
  return match ? `${match[1]} / ${match[2]} / ${match[3]}` : '待確認';
}

/** Inclusive day count of a hospital stay: 09-28 → 10-02 is 5 days. */
export function stayDays(admissionDate, dischargeDate) {
  const days = (Date.parse(dischargeDate) - Date.parse(admissionDate)) / 86_400_000;
  return Number.isFinite(days) && days >= 0 ? Math.round(days) + 1 : null;
}

export function stayText(admissionDate, dischargeDate) {
  return admissionDate && dischargeDate ? `${dateText(admissionDate)} – ${dateText(dischargeDate)}` : '待確認';
}

export const maskAccount = last4 => (last4 ? `＊＊＊＊ ${last4}` : '待確認');
