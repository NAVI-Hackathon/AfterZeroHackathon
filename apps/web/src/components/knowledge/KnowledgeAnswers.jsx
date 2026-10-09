import { motion } from 'motion/react';
import Icon from '../Icon.jsx';
import AnswerCard, { NavigateButton } from './AnswerCard.jsx';
import { transition } from '../../motion/tokens.js';

/** Landing-page answers from the official-site knowledge (shown in place of the scenario chips). */
export default function KnowledgeAnswers({ result, notice, onNavigate, onEdit, ref }) {
  const [first, ...others] = result.results;
  return (
    <motion.section
      ref={ref} className="knowledge-answers" aria-labelledby="feedback-title"
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: transition.enter }} exit={{ opacity: 0, y: -4, transition: transition.exit }}
    >
      <header className="knowledge-header">
        <h2 id="feedback-title" tabIndex={-1}><Icon name="book" size={16} />在官網資料中找到相關說明</h2>
        {notice && <p className="knowledge-notice" role="note">{notice}</p>}
      </header>

      <AnswerCard entry={first} onNavigate={onNavigate} />

      {others.length > 0 && (
        <div className="knowledge-more">
          <p className="section-label">其他可能相關</p>
          {others.map(entry => (
            <details key={entry.id} className="answer-disclosure">
              <summary><span>{entry.title}</span><Icon name="chevron" size={14} className="summary-chevron" /></summary>
              <AnswerCard entry={entry} onNavigate={onNavigate} headingLevel={4} />
            </details>
          ))}
        </div>
      )}

      {result.related.length > 0 && (
        <div className="knowledge-related">
          <p className="section-label">相關項目</p>
          <ul>
            {result.related.map(entry => (
              <li key={entry.id}>
                <span>{entry.title}</span>
                <NavigateButton destination={entry.destination} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <footer className="knowledge-footer">
        <p>回答只引用法國巴黎人壽官網公開資料。沒找到你要的？可以換個說法，或洽客服專線 {result.hotline}。</p>
        <button type="button" className="button button-secondary button-small" onClick={onEdit}>重新描述<Icon name="edit" size={15} /></button>
      </footer>
    </motion.section>
  );
}
