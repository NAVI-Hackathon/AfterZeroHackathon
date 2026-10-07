// Display formatting for zh-TW. Pure functions only.

const cities = { Tokyo: '東京', Taipei: '台北', Taiwan: '台灣', NRT: '東京成田', TPE: '台北桃園' };
export const city = value => cities[value] || value || '待確認';

export function delayText(minutes) {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return '待確認';
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60), rest = total % 60;
  return rest ? `${hours} 小時 ${rest} 分` : `${hours} 小時`;
}

export function dateText(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate ?? '');
  return match ? `${match[1]} / ${match[2]} / ${match[3]}` : '待確認';
}

/** "2026-10-05T14:20:00+09:00" → "14:20" (time as written on the certificate, i.e. local departure time). */
export function clockText(isoDateTime) {
  const match = /T(\d{2}):(\d{2})/.exec(isoDateTime ?? '');
  return match ? `${match[1]}:${match[2]}` : '待確認';
}

export function minutesBetween(fromIso, toIso) {
  const minutes = (Date.parse(toIso) - Date.parse(fromIso)) / 60000;
  return Number.isFinite(minutes) && minutes >= 0 ? Math.round(minutes) : null;
}
