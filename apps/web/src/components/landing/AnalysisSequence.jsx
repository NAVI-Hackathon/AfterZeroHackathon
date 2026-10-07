import { AnimatePresence, motion } from 'motion/react';
import { CheckDraw } from '../../motion/primitives.jsx';
import { crossfade, transition } from '../../motion/tokens.js';

export const ANALYSIS_STEPS = ['正在理解你的情況…', '正在比對適合的服務…', '正在建立你的服務旅程…'];

export default function AnalysisSequence({ phase, ref }) {
  const progress = (phase + 1) / ANALYSIS_STEPS.length;
  return (
    <motion.div
      ref={ref} className="analysis" role="status" aria-live="polite"
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: transition.enter }} exit={{ opacity: 0, transition: transition.exit }}
    >
      <div className="analysis-line">
        <span className="analysis-orb" aria-hidden="true"><span /></span>
        <div className="analysis-text">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={phase} {...crossfade}>{ANALYSIS_STEPS[phase]}</motion.p>
          </AnimatePresence>
        </div>
      </div>
      <div className="analysis-track" aria-hidden="true">
        <motion.span initial={{ scaleX: 0.08 }} animate={{ scaleX: progress }} transition={transition.slow} />
      </div>
      <ol className="analysis-steps" aria-hidden="true">
        {['理解情況', '比對服務', '建立旅程'].map((label, i) => (
          <li key={label} className={i < phase ? 'is-done' : i === phase ? 'is-current' : ''}>
            <span className="analysis-step-mark">{i < phase ? <CheckDraw size={11} strokeWidth={2.4} /> : null}</span>
            {label}
          </li>
        ))}
      </ol>
    </motion.div>
  );
}
