import faq from '../../../../knowledge/faq.json' with { type: 'json' };
import sitemap from '../../../../knowledge/sitemap.json' with { type: 'json' };
import definitions from '../../../../knowledge/journeys.json' with { type: 'json' };
import { KnowledgeSourceSchema } from '../../../../shared/journey.js';

export function getJourneyDefinition(serviceType) { return definitions[serviceType] ?? null; }
export function getSources(ids) {
  return sitemap.filter(source => ids.includes(source.id)).map(source => KnowledgeSourceSchema.parse({ id: source.id, title: source.title, section: source.section, type: source.type === 'faq' ? 'prototype_faq' : 'prototype_guide', isMock: true, url: null }));
}
export function retrieveKnowledge(query) {
  // ponytail: curated JSON topics only; add ranked retrieval when the knowledge collection grows.
  const topic = /延誤證明|delay certificate/i.test(query) ? 'why-delay' : /文件|document|登機證/i.test(query) ? 'documents' : /理賠|保障|coverage|claim/i.test(query) ? 'coverage' : null;
  const entry = faq.find(item => item.id === query || item.title === query || item.id === topic);
  return entry ? { answer: entry.answer, sources: getSources(entry.sourceIds), isMock: true, found: true } : { answer: '示範知識庫目前沒有這項資訊，請補充問題或由專員協助確認。', sources: [], isMock: true, found: false };
}

export function retrieveAnswerContext(query) {
  // Only this curated flight-delay collection is available. Unrelated services have no context.
  if (/車禍|事故|信用卡|扣款|繳費|付款|帳戶|accident|payment|credit card|account/i.test(query)) return null;
  const retrieved = retrieveKnowledge(query);
  if (!retrieved.found) return null;
  return { answer: retrieved.answer, sourceIds: retrieved.sources.map(source => source.id), sources: retrieved.sources.map(source => ({ ...source, content: sitemap.find(record => record.id === source.id).content })) };
}
