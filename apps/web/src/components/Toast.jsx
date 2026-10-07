import { useEffect } from 'react';
import { motion } from 'motion/react';
import Icon from './Icon.jsx';
import { transition } from '../motion/tokens.js';

export default function Toast({ message, onDismiss }) {
  useEffect(() => { const timer = setTimeout(onDismiss, 3200); return () => clearTimeout(timer); }, [message, onDismiss]);
  return (
    <motion.div className="toast" role="status"
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: transition.enter }} exit={{ opacity: 0, y: 8, transition: transition.exit }}>
      <span className="toast-mark"><Icon name="check" size={14} strokeWidth={2.2} /></span>
      <p>{message}</p>
      <button type="button" className="icon-button" aria-label="關閉提示" onClick={onDismiss}><Icon name="close" size={15} /></button>
    </motion.div>
  );
}
