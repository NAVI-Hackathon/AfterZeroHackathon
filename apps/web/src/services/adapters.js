import { createJourneyService } from './naviService.js';
import { understandIntent } from './intelligence.js';
import { mockUnderstanding } from '../mocks/understanding.js';

function safeSessionStorage() {
  try { return globalThis.sessionStorage ?? null; } catch { return null; }
}

/** Mock Adapter: no network. Golden Path is always reproducible, even with the API down. */
export function createMockAdapter({ storage = safeSessionStorage(), analysisDelayMs = 650, documentDelayMs = 1000 } = {}) {
  return createJourneyService({
    mode: 'demo', storage, storageKey: 'navi.demo.journey', documentDelayMs,
    understand: (message, { signal } = {}) => new Promise((resolve, reject) => {
      signal?.throwIfAborted();
      const timer = setTimeout(() => resolve(mockUnderstanding(message)), analysisDelayMs);
      signal?.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
    }),
  });
}

/** Real API Adapter: intent understanding through apps/api (Gemini). */
export function createApiAdapter({ storage = safeSessionStorage(), documentDelayMs = 1000 } = {}) {
  return createJourneyService({
    mode: 'live', storage, storageKey: 'navi.journey', documentDelayMs,
    understand: (message, { signal } = {}) => understandIntent(message, { signal }),
  });
}

export function isDemoPath(pathname) {
  return /^\/demo\/?$/.test(pathname);
}
