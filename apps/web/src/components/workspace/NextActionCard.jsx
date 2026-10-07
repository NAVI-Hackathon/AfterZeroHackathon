import { AnimatePresence, motion } from 'motion/react';
import Icon from '../Icon.jsx';
import { transition } from '../../motion/tokens.js';

const buttonCopy = {
  UPLOAD_DOCUMENT: { label: '上傳文件', icon: 'upload' },
  REVIEW_DATA: { label: '確認資料', icon: 'check' },
  PROCEED_TO_SERVICE: { label: '前往服務入口', icon: 'arrow' },
  VIEW_SERVICE: { label: '查看辦理方式', icon: 'arrow' },
  HANDOFF: { label: '轉由專員協助', icon: 'headset' },
};

export default function NextActionCard({ action, complete, busy, onAction, onSample }) {
  const copy = buttonCopy[action.type];
  const processing = Boolean(busy);
  return (
    <section className={`next-action ${complete ? 'is-complete' : ''}`} aria-labelledby="next-action-label">
      <p id="next-action-label" className="eyebrow"><span className="pulse-dot" aria-hidden="true" />下一步</p>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${action.type}-${action.target}`} className="next-action-body"
          initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0, transition: transition.enter }}
          exit={{ opacity: 0, x: -12, transition: transition.exit }}
        >
          <h3>{action.title}</h3>
          <p>{action.description}</p>
          <div className="next-action-buttons">
            <button type="button" className="button button-primary" disabled={processing} onClick={() => onAction(action)}>
              {processing ? '正在辨識文件…' : copy.label}<Icon name={copy.icon} size={16} />
            </button>
            {action.type === 'UPLOAD_DOCUMENT' && (
              <button type="button" className="link-button" disabled={processing} onClick={() => onSample(action.target)}>使用範例文件</button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
