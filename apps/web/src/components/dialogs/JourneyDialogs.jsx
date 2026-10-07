import { useState } from 'react';
import { motion } from 'motion/react';
import Icon from '../Icon.jsx';
import Modal from './Modal.jsx';
import { basicJourneys } from '../../mocks/basicJourneys.js';
import { documentSpecs } from '../../mocks/hospitalClaim.js';
import { claimApplicationForm } from '../../content/cardifData.js';
import { maskAccount, stayDays, stayText } from '../../content/format.js';
import { CheckDraw } from '../../motion/primitives.jsx';
import { transition } from '../../motion/tokens.js';

const fieldsOf = (journey, type) => journey.documents.find(d => d.documentType === type)?.fields ?? {};
const formName = claimApplicationForm?.name ?? '保險金申請書';

export function ReviewDialog({ snapshot, onConfirm, onProceed, onClose }) {
  const { journey } = snapshot;
  const confirmed = journey.currentStage === 'READY_TO_PROCEED';
  const [dataChecked, setDataChecked] = useState(confirmed);
  const [formChecked, setFormChecked] = useState(confirmed);
  const cert = fieldsOf(journey, 'diagnosis_certificate');
  const bank = fieldsOf(journey, 'bank_passbook');
  const days = stayDays(cert.admissionDate, cert.dischargeDate);
  const rows = [
    ['病患姓名', cert.patientName],
    ['醫院', cert.hospitalName],
    ['住院期間', stayText(cert.admissionDate, cert.dischargeDate)],
    ['住院天數', days ? `${days} 天` : null],
    ['診斷', cert.diagnosis],
    ['匯款帳戶', bank.bankName ? `${bank.bankName}　${maskAccount(bank.accountLast4)}（${bank.accountHolder}）` : null],
  ];
  return (
    <Modal title={confirmed ? '已確認的案件資料' : '確認案件資料'} onClose={onClose}>
      <p className="modal-lead">{confirmed ? '以下資料已確認完成。' : '請確認 NAVI 從文件辨識出的內容是否正確。'}</p>
      <dl className="review-list">
        {rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '待確認'}</dd></div>)}
      </dl>
      <div className="review-docs">
        {journey.documents.map(d => (
          <span key={d.id} className="tag tag-quiet"><Icon name="check" size={12} />{documentSpecs[d.documentType]?.title}{d.entryMethod === 'manual' ? '（手動輸入）' : ''}</span>
        ))}
      </div>
      {!confirmed && (
        <>
          <label className="check-row">
            <input type="checkbox" checked={dataChecked} onChange={e => setDataChecked(e.target.checked)} />
            <span>我已確認以上資料正確（示範資料）。</span>
          </label>
          <label className="check-row">
            <input type="checkbox" checked={formChecked} onChange={e => setFormChecked(e.target.checked)} />
            <span>我已下載並填妥{formName}。</span>
          </label>
        </>
      )}
      <div className="modal-actions">
        <p className="modal-footnote"><Icon name="shield" size={14} />確認資料不會送出理賠申請。</p>
        {confirmed
          ? <button type="button" className="button button-primary" onClick={onProceed}>前往服務入口<Icon name="arrow" size={16} /></button>
          : <button type="button" className="button button-primary" disabled={!dataChecked || !formChecked} onClick={onConfirm}>確認資料<Icon name="check" size={16} /></button>}
      </div>
    </Modal>
  );
}

export function ProceedDialog({ snapshot, onClose, onDone, onNavigate }) {
  const { journey } = snapshot;
  const channel = journey.claimContext?.channels.find(c => c.id === journey.nextAction.target);
  return (
    <Modal title="前往服務入口" onClose={onClose}>
      <div className="proceed">
        <motion.span className="proceed-mark" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: transition.enter }}>
          <CheckDraw size={26} strokeWidth={2.2} delay={0.1} />
        </motion.span>
        <h3>你的資料已準備完成</h3>
        <p>NAVI 已整理好案件資料與 {journey.documents.length} 份文件。接下來由法國巴黎人壽的理賠服務接續處理，並依保單條款審核。</p>
        <ul className="proceed-summary">
          <li><span>建議管道</span><strong>{channel?.name ?? '理賠服務'}</strong></li>
          <li><span>準備完成度</span><strong>{journey.readiness}%</strong></li>
        </ul>
        {channel && <ul className="proceed-notes">{channel.notes.map(note => <li key={note}>{note}</li>)}</ul>}
        <p className="modal-footnote"><Icon name="info" size={14} />本原型僅展示服務導引，不會連線正式平台或送出申請。</p>
        {channel && onNavigate && (
          <button type="button" className="button button-secondary full-width" onClick={() => { onNavigate(channel.destination); onDone(); }}>
            <Icon name="external" size={16} />{channel.destination.label}
          </button>
        )}
        <button type="button" className="button button-primary full-width" onClick={onDone}>完成導引<Icon name="check" size={16} /></button>
      </div>
    </Modal>
  );
}

export function HandoffDialog({ snapshot, onPrepared, onClose }) {
  const [prepared, setPrepared] = useState(snapshot.context.handoffRequested);
  const { journey, context } = snapshot;
  const collected = journey.documents.map(d => documentSpecs[d.documentType]?.title ?? d.documentType);
  const missing = journey.requirements.filter(r => r.required && r.status !== 'verified').map(r => r.name);
  const summary = [
    'NAVI 服務摘要',
    `服務：${journey.title}`,
    `你的描述：${context.story}`,
    ...(journey.claimContext?.hospital ? [`住院醫院：${journey.claimContext.hospital.matchedName ?? journey.claimContext.hospital.mentioned}`] : []),
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
      {prepared && (
        <motion.div className="success-note" role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: transition.enter }}>
          <CheckDraw size={16} strokeWidth={2.4} />
          <div><strong>服務摘要已準備完成</strong><p>本示範不會實際聯繫專員，你可以下載摘要。</p></div>
        </motion.div>
      )}
      <div className="modal-actions">
        <button type="button" className="button button-secondary" onClick={download}><Icon name="download" size={16} />下載摘要</button>
        {!prepared && <button type="button" className="button button-primary" onClick={() => { setPrepared(true); onPrepared(); }}>準備轉交<Icon name="arrow" size={16} /></button>}
      </div>
    </Modal>
  );
}

export function ServiceDialog({ snapshot, onHandoff, onClose }) {
  const basic = basicJourneys[snapshot.context.kind] ?? basicJourneys.unknown;
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
