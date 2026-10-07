import { useState } from 'react';
import { motion } from 'motion/react';
import Icon from '../Icon.jsx';
import Modal from './Modal.jsx';
import { basicJourneys } from '../../mocks/basicJourneys.js';
import { city, clockText, dateText, delayText } from '../../content/format.js';
import { CheckDraw } from '../../motion/primitives.jsx';
import { transition } from '../../motion/tokens.js';

function docFields(snapshot, type) {
  return snapshot.documents.find(d => d.documentType === type)?.fields ?? {};
}

export function ReviewDialog({ snapshot, onConfirm, onProceed, onClose }) {
  const confirmed = snapshot.journey.currentStage === 'READY_TO_PROCEED';
  const [checked, setChecked] = useState(confirmed);
  const boarding = docFields(snapshot, 'boarding_pass');
  const delay = docFields(snapshot, 'delay_certificate');
  const rows = [
    ['乘客姓名', boarding.passengerName],
    ['航班', boarding.flightNumber],
    ['航線', `${city(boarding.origin)} → ${city(boarding.destination)}`],
    ['搭乘日期', dateText(boarding.departureDate)],
    ['原訂／實際起飛', `${clockText(delay.scheduledDeparture)} → ${clockText(delay.actualDeparture)}`],
    ['確認延誤', delayText(snapshot.context.verifiedDelayMinutes)],
  ];
  return (
    <Modal title={confirmed ? '已確認的案件資料' : '確認案件資料'} onClose={onClose}>
      <p className="modal-lead">{confirmed ? '以下資料已確認完成。' : '請確認 NAVI 從文件辨識出的內容是否正確。'}</p>
      <dl className="review-list">
        {rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '待確認'}</dd></div>)}
      </dl>
      <div className="review-docs">
        {snapshot.documents.map(d => (
          <span key={d.id} className="tag tag-quiet"><Icon name="check" size={12} />{d.documentType === 'boarding_pass' ? '登機證' : '航空公司延誤證明'}{d.status === 'manual' ? '（手動輸入）' : ''}</span>
        ))}
      </div>
      {!confirmed && (
        <label className="check-row">
          <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} />
          <span>我已確認以上資料正確（示範資料）。</span>
        </label>
      )}
      <div className="modal-actions">
        <p className="modal-footnote"><Icon name="shield" size={14} />確認資料不會送出理賠申請。</p>
        {confirmed
          ? <button type="button" className="button button-primary" onClick={onProceed}>前往服務入口<Icon name="arrow" size={16} /></button>
          : <button type="button" className="button button-primary" disabled={!checked} onClick={onConfirm}>確認資料<Icon name="check" size={16} /></button>}
      </div>
    </Modal>
  );
}

export function ProceedDialog({ snapshot, onClose, onDone }) {
  return (
    <Modal title="前往服務入口" onClose={onClose}>
      <div className="proceed">
        <motion.span className="proceed-mark" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: transition.enter }}>
          <CheckDraw size={26} strokeWidth={2.2} delay={0.1} />
        </motion.span>
        <h3>你的資料已準備完成</h3>
        <p>NAVI 已整理好案件資料與 {snapshot.documents.length} 份文件。接下來由既有的班機延誤理賠服務接續處理，保險公司會依保單條款審核。</p>
        <ul className="proceed-summary">
          <li><span>服務</span><strong>班機延誤理賠服務</strong></li>
          <li><span>確認延誤</span><strong>{delayText(snapshot.context.verifiedDelayMinutes)}</strong></li>
          <li><span>準備完成度</span><strong>{snapshot.journey.readiness}%</strong></li>
        </ul>
        <p className="modal-footnote"><Icon name="info" size={14} />本原型僅展示服務導引，不會連線正式平台或送出申請。</p>
        <button type="button" className="button button-primary full-width" onClick={onDone}>完成導引<Icon name="check" size={16} /></button>
      </div>
    </Modal>
  );
}

export function HandoffDialog({ snapshot, onPrepared, onClose }) {
  const [prepared, setPrepared] = useState(snapshot.context.handoffRequested);
  const { journey, context } = snapshot;
  const collected = snapshot.documents.map(d => (d.documentType === 'boarding_pass' ? '登機證' : '航空公司延誤證明'));
  const missing = journey.requirements.filter(r => r.status !== 'verified').map(r => r.name);
  const summary = [
    'NAVI 服務摘要',
    `服務：${journey.title}`,
    `你的描述：${context.story}`,
    `已提供：${collected.join('、') || '尚未提供文件'}`,
    `尚待確認：${missing.join('、') || '保單保障條件'}`,
    '此為示範摘要，尚未送交專員。',
  ].join('\n');

  function download() {
    const url = URL.createObjectURL(new Blob([summary], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'NAVI-服務摘要.txt'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Modal title="轉由專員協助" onClose={onClose}>
      <p className="modal-lead">NAVI 已整理好你的情況，專員接手時不需要你重新說明。</p>
      <dl className="review-list">
        <div><dt>服務</dt><dd>{journey.title}</dd></div>
        <div><dt>你的描述</dt><dd>{context.story}</dd></div>
        <div><dt>已提供</dt><dd>{collected.join('、') || '尚未提供文件'}</dd></div>
        <div><dt>尚待確認</dt><dd>{missing.join('、') || '保單保障條件'}</dd></div>
      </dl>
      {prepared ? (
        <motion.div className="success-note" role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: transition.enter }}>
          <CheckDraw size={16} strokeWidth={2.4} />
          <div><strong>服務摘要已準備完成</strong><p>本示範不會實際聯繫專員，你可以下載摘要。</p></div>
        </motion.div>
      ) : null}
      <div className="modal-actions">
        <button type="button" className="button button-secondary" onClick={download}><Icon name="download" size={16} />下載摘要</button>
        {!prepared && <button type="button" className="button button-primary" onClick={() => { setPrepared(true); onPrepared(); }}>準備轉交<Icon name="arrow" size={16} /></button>}
      </div>
    </Modal>
  );
}

export function ServiceDialog({ snapshot, onHandoff, onClose }) {
  const basic = basicJourneys[snapshot.context.serviceKey] ?? basicJourneys.unknown;
  return (
    <Modal title={basic.title} onClose={onClose}>
      <p className="modal-lead">{snapshot.journey.nextAction.description}</p>
      <ol className="numbered-steps">{basic.steps.map(step => <li key={step}>{step}</li>)}</ol>
      <p className="modal-footnote"><Icon name="info" size={14} />這項服務目前提供辦理導引；完整服務旅程將於後續版本開放。</p>
      <div className="modal-actions">
        <button type="button" className="button button-secondary" onClick={onClose}>我知道了</button>
        <button type="button" className="button button-primary" onClick={onHandoff}>轉由專員協助<Icon name="arrow" size={16} /></button>
      </div>
    </Modal>
  );
}
