import { useEffect, useRef, useState } from 'react';
import { animate, motion, useReducedMotion } from 'motion/react';
import { duration, ease } from './tokens.js';

/** Count-up for numbers (readiness, delay minutes). Starts from the previous value, not from 0. */
export function useCountUp(target, { seconds = duration.count, from } = {}) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(from ?? target);
  const current = useRef(from ?? target);
  useEffect(() => {
    if (reduced) { current.current = target; setValue(target); return undefined; }
    const controls = animate(current.current, target, {
      duration: seconds, ease: ease.standard,
      onUpdate: v => { current.current = v; setValue(v); },
    });
    return () => controls.stop();
  }, [target, seconds, reduced]);
  return reduced ? target : value;
}

/** Check mark that draws itself. */
export function CheckDraw({ size = 14, strokeWidth = 2, delay = 0, className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <motion.path
        d="m5 12.5 4.2 4.2L19 7"
        stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 0.32, ease: ease.enter, delay }}
      />
    </svg>
  );
}
