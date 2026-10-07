import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Icon from '../Icon.jsx';
import faq from '../../../../../knowledge/faq.json' with { type: 'json' };
import sources from '../../../../../knowledge/sitemap.json' with { type: 'json' };
import { assistantFaq } from '../../mocks/flightDelay.js';
import { city, delayText } from '../../content/format.js';
import { crossfade, fadeUp, staggerChildren, transition } from '../../motion/tokens.js';

function suggestionFor(snapshot) {
  const { journey, context } = snapshot;
  if (journey.currentStage === 'HUMAN_REVIEW') return '這個情況需要專員確認。你可以先下載服務摘要，聯繫時就不用重新說明。';
  if (context.serviceKey !== 'flight_delay') return journey.nextAction.description;
  const target = journey.nextAction.target;
  if (target === 'boarding_pass') return '先從登機證開始：它能確認你的姓名、航班與搭乘日期，是後續文件比對的基準。';
  if (target === 'delay_certificate') return '延誤證明通常可向航空公司櫃台或官網申請，記得確認上面有原訂與實際起飛時間。';
  if (journey.nextAction.type === 'REVIEW_DATA') return `兩份文件都已辨識，延誤時間為 ${delayText(context.verifiedDelayMinutes)}。確認資料無誤後即可前往服務入口。`;
  return '資料已準備完成。前往服務入口後，由保險公司依保單條款審核。';
}

function answerFor(question) {
  const entry = assistantFaq.find(item => item.match.test(question));
  const knowledge = entry && faq.find(item => item.id === entry.id);
  return knowledge
    ? { text: knowledge.answer, sourceIds: knowledge.sourceIds }
    : { text: '目前可以協助整理班機延誤的文件與步驟。保單條件或其他問題，建議轉由專員確認。', sourceIds: [] };
}

export default function AssistantPanel({ snapshot, onHandoff }) {
  const { journey, context } = snapshot;
  const isFlight = context.serviceKey === 'flight_delay';
  const [question, setQuestion] = useState('');
  const [answers, setAnswers] = useState([]);
  const [thinking, setThinking] = useState(false);
  const timer = useRef(0);
  const log = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { if (answers.length) log.current?.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [answers]);

  function ask(text) {
    const q = text.trim();
    if (!q || thinking) return;
    setQuestion(''); setThinking(true);
    timer.current = setTimeout(() => { setAnswers(list => [...list, { q, ...answerFor(q) }]); setThinking(false); }, 450);
  }

  const facts = [
    ['已辨識服務', journey.title],
    ...(isFlight ? [['航線', `${city(context.reported.origin)} → ${city(context.reported.destination)}`], ['你描述的延誤', context.reported.delayMinutes === null ? '待確認' : `約 ${delayText(context.reported.delayMinutes)}`]] : []),
  ];

  return (
    <aside className="panel assistant-panel" aria-labelledby="assistant-title">
      <header className="panel-header">
        <h2 id="assistant-title"><Icon name="spark" size={17} />AI 服務助手</h2>
      </header>

      <motion.div className="assistant-sections" initial="hidden" animate="show" variants={staggerChildren(0.07, 0.15)}>
        <motion.section className="story-card" variants={fadeUp} aria-label="你的描述">
          <motion.div className="story-surface" layoutId="story-surface" transition={transition.layout} aria-hidden="true" />
          <p className="eyebrow">你的描述</p>
          <p className="story-text">{context.story}</p>
        </motion.section>

        <motion.section className="insight" variants={fadeUp} aria-labelledby="insight-title">
          <h3 id="insight-title" className="section-label">NAVI 的理解</h3>
          <p className="insight-summary">{context.summary}</p>
          <dl className="insight-facts">
            {facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            <div>
              <dt>判讀方式</dt>
              <dd>{context.source === 'demo_fallback' ? <span className="tag">示範判讀・未使用 AI</span> : `AI 判讀・信心 ${Math.round(journey.confidence * 100)}%`}</dd>
            </div>
          </dl>
        </motion.section>

        <motion.section className="suggestion" variants={fadeUp} aria-labelledby="suggestion-title">
          <h3 id="suggestion-title" className="section-label">建議</h3>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={`${journey.nextAction.type}-${journey.nextAction.target}`} {...crossfade}>{suggestionFor(snapshot)}</motion.p>
          </AnimatePresence>
          {journey.currentStage === 'HUMAN_REVIEW' && (
            <button type="button" className="button button-secondary button-small" onClick={onHandoff}>準備服務摘要<Icon name="chevron" size={14} /></button>
          )}
        </motion.section>

        {isFlight && (
          <motion.section className="sources" variants={fadeUp} aria-labelledby="sources-title">
            <h3 id="sources-title" className="section-label">資料來源 <span className="tag">示範知識庫</span></h3>
            <ul>
              {sources.map(source => (
                <li key={source.id}>
                  <details>
                    <summary><Icon name="book" size={14} />{source.title}<Icon name="chevron" size={13} className="summary-chevron" /></summary>
                    <p className="source-section">{source.section}</p>
                    <p>{source.content}</p>
                  </details>
                </li>
              ))}
            </ul>
          </motion.section>
        )}

        {isFlight && (
          <motion.section className="ask" variants={fadeUp} aria-labelledby="ask-title">
            <h3 id="ask-title" className="section-label">想進一步了解</h3>
            <div className="ask-log" ref={log} aria-live="polite">
              {answers.map((a, i) => (
                <motion.div key={i} className="qa" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: transition.enter }}>
                  <p className="qa-q">{a.q}</p>
                  <p className="qa-a">{a.text}</p>
                  {a.sourceIds.length > 0 && <p className="qa-source"><Icon name="book" size={12} />依據：{a.sourceIds.map(id => sources.find(s => s.id === id)?.title).filter(Boolean).join('、')}</p>}
                </motion.div>
              ))}
              {thinking && <p className="qa-thinking" role="status"><span className="dots" aria-hidden="true"><i /><i /><i /></span>正在整理說明</p>}
            </div>
            <div className="ask-suggestions">
              {assistantFaq.filter(item => !answers.some(a => a.q === item.question)).map(item => (
                <button key={item.id} type="button" className="chip" disabled={thinking} onClick={() => ask(item.question)}>{item.question}</button>
              ))}
            </div>
            <form className="ask-form" onSubmit={e => { e.preventDefault(); ask(question); }}>
              <label className="visually-hidden" htmlFor="ask-input">詢問 NAVI</label>
              <input id="ask-input" value={question} maxLength={300} placeholder="詢問文件或下一步…" onChange={e => setQuestion(e.target.value)} />
              <button type="submit" className="icon-button icon-button-filled" aria-label="送出問題" disabled={!question.trim() || thinking}><Icon name="arrow" size={16} /></button>
            </form>
          </motion.section>
        )}
      </motion.div>
    </aside>
  );
}
