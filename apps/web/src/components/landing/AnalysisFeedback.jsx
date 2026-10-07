import { motion } from 'motion/react';
import Icon from '../Icon.jsx';
import { transition } from '../../motion/tokens.js';

/** Clarification, unsupported service or analysis error — shown in place of the scenario chips. */
export default function AnalysisFeedback({ feedback, mode, onRetry, onEdit, ref }) {
  const isError = feedback.kind === 'error';
  return (
    <motion.section
      ref={ref} className={`feedback ${isError ? 'feedback-error' : ''}`} role={isError ? 'alert' : 'status'}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: transition.enter }} exit={{ opacity: 0, y: -4, transition: transition.exit }}
    >
      <span className="feedback-icon"><Icon name={isError ? 'alert' : 'chat'} size={18} /></span>
      <div className="feedback-body">
        <h2 id="feedback-title" tabIndex={-1}>{feedback.title}</h2>
        <p>{feedback.body}</p>
        <div className="feedback-actions">
          {isError ? (
            <>
              <button type="button" className="button button-primary button-small" onClick={onRetry}>重新分析<Icon name="reset" size={15} /></button>
              {mode !== 'demo' && <a className="button button-ghost button-small" href="/demo">改用示範模式<Icon name="arrow" size={15} /></a>}
            </>
          ) : (
            <button type="button" className="button button-secondary button-small" onClick={onEdit}>
              {feedback.kind === 'clarification' ? '補充說明' : '重新描述'}<Icon name="edit" size={15} />
            </button>
          )}
        </div>
      </div>
    </motion.section>
  );
}
