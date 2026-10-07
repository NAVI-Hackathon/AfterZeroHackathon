// Hospital name recognition against the 醫起通 partner list in data/cardif_seed_data.json.
// The data notes that abbreviations need their own alias table and that 台/臺 must be
// normalised; this file is that table. It only maps names — it never decides eligibility.

const VARIANTS = [[/台/g, '臺'], [/\s+/g, '']];

// Common abbreviations → the official name prefix used in the partner list.
const ABBREVIATIONS = [
  [/^北榮/, '臺北榮民總醫院'], [/^中榮/, '臺中榮民總醫院'], [/^高榮/, '高雄榮民總醫院'],
  [/^(臺北|臺中|高雄)榮總/, '$1榮民總醫院'], [/^榮總/, '臺北榮民總醫院'],
  [/^三總/, '三軍總醫院'], [/^臺大(?!醫院)/, '臺大醫院'],
];

export function normalizeHospitalName(name) {
  let value = VARIANTS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), String(name ?? ''));
  for (const [pattern, replacement] of ABBREVIATIONS) value = value.replace(pattern, replacement);
  return value;
}

/** Find a partner hospital for a name like 「台中榮總」. Returns the official name or null. */
export function matchPartnerHospital(name, partners) {
  const wanted = normalizeHospitalName(name);
  if (!wanted) return null;
  const normalized = partners.map(official => ({ official, key: normalizeHospitalName(official) }));
  const exact = normalized.find(p => p.key === wanted);
  if (exact) return exact.official;
  // Main campus first: 「臺中榮民總醫院」 should not match 「臺中榮民總醫院埔里分院」.
  const byPrefix = prefix => normalized.filter(p => p.key.startsWith(prefix) || prefix.startsWith(p.key)).sort((a, b) => a.key.length - b.key.length);
  const candidates = byPrefix(wanted);
  if (candidates.length) return candidates[0].official;
  // 「新光醫院」→ core 「新光」→ 新光吳火獅紀念醫院. Require a 2+ character core to avoid city-only matches.
  const core = wanted.replace(/(?:綜合)?醫院$/, '');
  return core.length >= 2 && core !== wanted ? byPrefix(core)[0]?.official ?? null : null;
}

// Hospital-looking phrases in free text: 「台中榮總」「臺大醫院」「新光醫院」「國泰綜合醫院」…
const MENTION = /([\u4e00-\u9fff]{1,10}?(?:榮總|醫院|醫學中心|總院)(?:[\u4e00-\u9fff]{1,4}?分院)?)|((?:北榮|中榮|高榮|三總|台大|臺大))/;

/** Pull the first hospital mention out of the user's own description. */
export function findHospitalMention(text) {
  const match = MENTION.exec(String(text ?? '').replace(/^(?:我|上週|昨天|前天|今天|之前)+(?:在)?/, ''));
  if (!match) return null;
  // Drop leading verbs/time words the lazy match may have kept (「上週在台中榮總」→「台中榮總」).
  return (match[1] ?? match[2]).replace(/^.*?(?:在|到|去|於)(?=[一-鿿]{2,})/, '');
}

export function recognizeHospital(text, partners) {
  const mentioned = findHospitalMention(text);
  if (!mentioned) return null;
  const matchedName = matchPartnerHospital(mentioned, partners);
  return { mentioned, matchedName, partner: Boolean(matchedName) };
}
