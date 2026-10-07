import { motion } from 'motion/react';
import Icon from '../Icon.jsx';
import { stages as flightStages } from '../../mocks/flightDelay.js';
import { basicJourneys } from '../../mocks/basicJourneys.js';
import { city, delayText } from '../../content/format.js';
import { CheckDraw } from '../../motion/primitives.jsx';
import { fadeUp, staggerChildren, transition } from '../../motion/tokens.js';

const serviceIcons = { flight_delay: 'plane', car_accident: 'car', payment_change: 'card', unknown: 'headset' };

/** Index of the step currently in progress, derived from the contract's currentStage. */
export function activeStepIndex(journey, serviceKey) {
  if (journey.currentStage === 'HUMAN_REVIEW') return 1;
  if (serviceKey !== 'flight_delay') return 2;
  return { EVIDENCE_COLLECTION: 2, READY_FOR_REVIEW: 3, READY_TO_PROCEED: 4 }[journey.currentStage] ?? 2;
}

function stepDescription(i, { journey, isFlight, basic }) {
  const ready = journey.currentStage === 'READY_FOR_REVIEW';
  const proceeding = journey.currentStage === 'READY_TO_PROCEED';
  if (journey.currentStage === 'HUMAN_REVIEW') {
    return ['已整理你的描述。', '這個情況需要專員確認適用的服務。', '', ''][i] ?? '';
  }
  if (!isFlight) {
    return ['已整理你的需求。', `已辨識為「${basic.title}」。`, '先備妥右側列出的資料。', '', ''][i] ?? '';
  }
  return [
    '已整理你描述的情況。',
    '班機延誤相關服務可能適用於你的情況。',
    ready || proceeding ? '必要文件已備齊。' : '補齊登機證與航空公司延誤證明。',
    proceeding ? '資料已確認完成。' : ready ? '請確認辨識出的資料是否正確。' : '文件備齊後進行確認。',
    proceeding ? '可以前往既有理賠服務繼續辦理。' : '資料確認後，前往理賠服務入口。',
  ][i];
}

export default function JourneyTimeline({ snapshot, documentsSlot, onReview, onProceed, onViewService }) {
  const { journey, context } = snapshot;
  const isFlight = context.serviceKey === 'flight_delay' && journey.currentStage !== 'HUMAN_REVIEW';
  const basic = basicJourneys[journey.currentStage === 'HUMAN_REVIEW' && context.serviceKey !== 'flight_delay' ? 'unknown' : context.serviceKey] ?? basicJourneys.unknown;
  const stages = context.serviceKey === 'flight_delay' ? flightStages : basic.stages;
  const active = activeStepIndex(journey, context.serviceKey);
  const reportedDelay = context.reported.delayMinutes;

  return (
    <section className="panel journey-panel" aria-labelledby="journey-title">
      <header className="panel-header journey-header">
        <div>
          <p className="eyebrow">你的服務旅程</p>
          <h2 id="journey-title" className="journey-service">
            <span className="service-icon"><Icon name={serviceIcons[context.serviceKey] ?? 'route'} size={18} /></span>
            {journey.title}
          </h2>
        </div>
        <span className="live-badge"><span className="pulse-dot" aria-hidden="true" />即時更新</span>
      </header>

      {context.serviceKey === 'flight_delay' && (
        <div className="trip-strip">
          <div><span>航線</span><strong>{city(context.reported.origin)}<Icon name="arrow" size={14} />{city(context.reported.destination)}</strong></div>
          <div>
            <span>{context.verifiedDelayMinutes === null ? '你描述的延誤' : '文件確認的延誤'}</span>
            <motion.strong key={context.verifiedDelayMinutes ?? 'reported'} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0, transition: transition.enter }}>
              {context.verifiedDelayMinutes === null ? (reportedDelay === null ? '待確認' : `約 ${delayText(reportedDelay)}`) : delayText(context.verifiedDelayMinutes)}
            </motion.strong>
          </div>
        </div>
      )}

      <motion.ol className="timeline" initial="hidden" animate="show" variants={staggerChildren(0.08, 0.1)}>
        {stages.map((stage, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <motion.li key={stage} variants={fadeUp} className={`step ${done ? 'is-done' : ''} ${current ? 'is-current' : ''}`} aria-current={current ? 'step' : undefined}>
              <span className="step-marker" aria-hidden="true">
                {done ? <CheckDraw size={13} strokeWidth={2.6} /> : <span className="step-number">{i + 1}</span>}
                {current && <span className="step-pulse" />}
              </span>
              <div className="step-body">
                <div className="step-title">
                  <h3>{stage}</h3>
                  <span className="step-state">{done ? '已完成' : current ? '進行中' : '尚未開始'}</span>
                </div>
                {stepDescription(i, { journey, isFlight, basic }) && <p className="step-text">{stepDescription(i, { journey, isFlight, basic })}</p>}

                {isFlight && i === 2 && documentsSlot}

                {isFlight && i === 3 && (journey.currentStage === 'READY_FOR_REVIEW' || journey.currentStage === 'READY_TO_PROCEED') && (
                  <button type="button" className="button button-secondary button-small step-action" onClick={onReview}>
                    {journey.currentStage === 'READY_TO_PROCEED' ? '查看已確認資料' : '確認案件資料'}<Icon name="chevron" size={14} />
                  </button>
                )}

                {isFlight && i === 4 && journey.currentStage === 'READY_TO_PROCEED' && (
                  <motion.div className="service-entry" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: transition.enter }}>
                    <div>
                      <strong>班機延誤理賠服務</strong>
                      <p>由既有理賠服務接續審核，NAVI 已整理好案件資料。</p>
                    </div>
                    <button type="button" className="button button-primary button-small" onClick={onProceed}>前往服務入口<Icon name="arrow" size={15} /></button>
                  </motion.div>
                )}

                {!isFlight && current && journey.currentStage !== 'HUMAN_REVIEW' && basic.steps.length > 0 && (
                  <div className="basic-steps">
                    <ol>{basic.steps.map(step => <li key={step}>{step}</li>)}</ol>
                    <button type="button" className="button button-secondary button-small" onClick={onViewService}>{journey.nextAction.type === 'HANDOFF' ? '轉由專員協助' : '查看辦理方式'}<Icon name="chevron" size={14} /></button>
                  </div>
                )}
              </div>
            </motion.li>
          );
        })}
      </motion.ol>

      <p className="safe-note"><Icon name="shield" size={15} />NAVI 協助整理資料與指引下一步；保障範圍與理賠結果，仍依保單條款與保險公司審核為準。</p>
    </section>
  );
}
