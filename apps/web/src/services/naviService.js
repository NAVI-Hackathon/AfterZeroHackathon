import {
  createSession, toSnapshot, supportsDocuments, applySampleDocument, applyManualDocument,
  removeDocument, confirmSession, requestHandoff, serializeSession, restoreSession,
} from './journeyEngine.js';
import { documents as documentFixtures } from '../domain/workflow.js';

export class DocumentRecognitionError extends Error {
  constructor() { super('DOCUMENT_RECOGNITION_FAILED'); this.code = 'DOCUMENT_RECOGNITION_FAILED'; }
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
  });
}

/** Which outcomes open a workspace. Clarification and unmapped previews stay on the landing page. */
export function opensJourney(understanding, snapshotServiceKey) {
  const { outcome } = understanding.meta;
  if (outcome === 'supported' || outcome === 'human_review') return true;
  return outcome === 'preview' && snapshotServiceKey !== 'unknown';
}

/**
 * The single service the UI talks to. `understand` is the adapter-specific intent source;
 * journeys, documents and readiness come from the local engine until the backend provides them.
 */
export function createJourneyService({ mode, understand, storage, storageKey, documentDelayMs = 1000 }) {
  let session = null;
  let failNextDocument = false;

  function save() {
    try { if (session) storage?.setItem(storageKey, serializeSession(session)); else storage?.removeItem(storageKey); }
    catch { /* Storage can be unavailable (private mode); the journey keeps working in memory. */ }
  }
  function commit(next) { session = next; save(); return toSnapshot(session); }
  function requireSession() { if (!session) throw new Error('No active journey.'); return session; }

  return {
    mode,
    restore() {
      try { session = restoreSession(storage?.getItem(storageKey) ?? 'null'); } catch { session = null; }
      return session ? toSnapshot(session) : null;
    },
    async analyze(message, { signal } = {}) {
      const understanding = await understand(message, { signal });
      const candidate = createSession(message.trim(), understanding);
      const snapshot = toSnapshot(candidate);
      if (!opensJourney(understanding, snapshot.context.serviceKey)) return { understanding, snapshot: null };
      return { understanding, snapshot: commit(candidate) };
    },
    async uploadDocument(type, { filename, sample = false }, { signal } = {}) {
      const current = requireSession();
      if (!supportsDocuments(current)) throw new Error('This journey has no document workflow.');
      await wait(documentDelayMs, signal);
      if (failNextDocument) { failNextDocument = false; throw new DocumentRecognitionError(); }
      // Recognition is mocked: the result always comes from the owned fixture, never from file contents.
      return commit(applySampleDocument(current, type, sample ? documentFixtures[type].sampleName : filename, sample ? 'sample' : 'upload'));
    },
    submitManual(type, fields) { return commit(applyManualDocument(requireSession(), type, fields)); },
    removeDocument(type) { return commit(removeDocument(requireSession(), type)); },
    confirm() { return commit(confirmSession(requireSession())); },
    requestHandoff() { return commit(requestHandoff(requireSession())); },
    reset() { session = null; save(); },
    setFailNextDocument(value) { failNextDocument = Boolean(value); },
  };
}
