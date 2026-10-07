import { useSyncExternalStore } from 'react';

// mobile < 768 ≤ tablet < 1180 ≤ desktop. Keep in sync with the media queries in styles.css.
const queries = { mobile: '(max-width: 767.98px)', tablet: '(max-width: 1179.98px)' };

function subscribe(onChange) {
  const lists = Object.values(queries).map(q => matchMedia(q));
  lists.forEach(list => list.addEventListener('change', onChange));
  return () => lists.forEach(list => list.removeEventListener('change', onChange));
}
function snapshot() {
  if (matchMedia(queries.mobile).matches) return 'mobile';
  if (matchMedia(queries.tablet).matches) return 'tablet';
  return 'desktop';
}

export function useBreakpoint() {
  return useSyncExternalStore(subscribe, snapshot, () => 'desktop');
}
