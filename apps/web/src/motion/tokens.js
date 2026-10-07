// Motion tokens (JS side). Mirrors --dur-* / --ease-* in design/tokens.css.
// Style: subtle, restrained, premium — no bounce, no elastic, nothing long for its own sake.

export const duration = { fast: 0.16, normal: 0.26, slow: 0.5, count: 0.8 };

export const ease = {
  standard: [0.2, 0, 0, 1],
  enter: [0, 0, 0.2, 1],
  exit: [0.4, 0, 1, 1],
};

// Low-overshoot spring for objects that "land" (document cards). Damped well above bounce.
export const spring = { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 };

export const transition = {
  fast: { duration: duration.fast, ease: ease.standard },
  normal: { duration: duration.normal, ease: ease.standard },
  enter: { duration: duration.normal, ease: ease.enter },
  exit: { duration: duration.fast, ease: ease.exit },
  slow: { duration: duration.slow, ease: ease.standard },
  layout: { duration: 0.55, ease: ease.standard },
};

// Shared variants
export const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: transition.enter },
  exit: { opacity: 0, y: -6, transition: transition.exit },
};

export const staggerChildren = (stagger = 0.06, delayChildren = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren } },
});

export const crossfade = {
  initial: { opacity: 0, y: 6, filter: 'blur(2px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: transition.enter },
  exit: { opacity: 0, y: -6, filter: 'blur(2px)', transition: transition.exit },
};
