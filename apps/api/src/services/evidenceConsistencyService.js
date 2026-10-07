const normalized = value => value?.normalize('NFKC').toUpperCase().replace(/[\s/._-]/g, '');
const locations = { TOKYO: ['NRT', 'HND', '東京'], TAIPEI: ['TPE', 'TSA', '台北', '臺北'], TAIWAN: ['TPE', 'TSA', 'KHH', 'RMQ', 'TAIPEI', '台灣', '臺灣'] };
function locationKey(value) {
  const visible = value?.normalize('NFKC').toUpperCase() ?? '';
  const codes = [...new Set(visible.match(/\b(?:NRT|HND|TPE|TSA|KHH|RMQ)\b/g) ?? [])];
  if (codes.length === 1) return codes[0];
  for (const [pattern, key] of [[/\bTOKYO\b|東京/, 'TOKYO'], [/\bTAIPEI\b|台北|臺北/, 'TAIPEI'], [/\bTAIWAN\b|台灣|臺灣/, 'TAIWAN']]) if (pattern.test(visible)) return key;
  const key = normalized(value);
  return ({ 東京: 'TOKYO', 台北: 'TAIPEI', 臺北: 'TAIPEI', 台灣: 'TAIWAN', 臺灣: 'TAIWAN', NARITA: 'NRT', 成田: 'NRT', HANEDA: 'HND', 羽田: 'HND', TAOYUAN: 'TPE', 桃園: 'TPE' })[key] ?? key;
}
function sameLocation(left, right) {
  const a = locationKey(left); const b = locationKey(right);
  return a === b || Boolean(locations[a]?.map(normalized).includes(b) || locations[b]?.map(normalized).includes(a));
}
const specs = [
  ['flightNumber', 'FLIGHT_NUMBER_MISMATCH', '航班編號', (a, b) => normalized(a) === normalized(b)],
  ['departureDate', 'DEPARTURE_DATE_MISMATCH', '出發日期', (a, b) => a === b],
  ['origin', 'ORIGIN_MISMATCH', '出發地', sameLocation],
  ['destination', 'DESTINATION_MISMATCH', '目的地', sameLocation],
  ['passengerName', 'PASSENGER_NAME_MISMATCH', '旅客姓名', (a, b) => normalized(a) === normalized(b)],
];
export function checkEvidenceConsistency(documents, extractedData = {}) {
  const issues = [];
  const boarding = documents.find(doc => doc.documentType === 'boarding_pass');
  const delay = documents.find(doc => doc.documentType === 'delay_certificate');
  for (const [field, type, label, same] of specs) {
    const value = doc => field === 'departureDate' ? doc?.fields.departureDate ?? (/^\d{4}-\d{2}-\d{2}T/.test(doc?.fields.scheduledDeparture ?? '') ? doc.fields.scheduledDeparture.slice(0, 10) : null) : doc?.fields[field];
    if (value(boarding) && value(delay) && !same(value(boarding), value(delay))) {
      issues.push({ type, severity: 'high', message: `兩份文件的${label}不一致。`, documentIds: [boarding.id, delay.id] });
    }
    // Reported delay is approximate; only compare explicit incident date / route facts.
    const reported = extractedData[field === 'departureDate' ? 'incidentDate' : field];
    for (const doc of documents) if (reported && value(doc) && !same(reported, value(doc))) {
      issues.push({ type, severity: 'high', message: `文件${label}與先前提供的資訊不一致。`, documentIds: [doc.id] });
    }
  }
  return issues;
}
