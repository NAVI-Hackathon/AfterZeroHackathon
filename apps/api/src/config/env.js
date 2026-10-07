import { DEFAULT_CONFIDENCE_THRESHOLD } from '../../../../shared/intelligence.js';

const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
const THINKING_LEVELS = { 'gemini-3.5-flash-lite': 'MINIMAL', 'gemini-3.8-flash': 'LOW' };

function numeric(env, name, fallback, min, max) {
  const value = env[name] === undefined || env[name] === '' ? fallback : Number(env[name]);
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid ${name} configuration`);
  return value;
}
export function loadConfig(env = process.env) {
  const aiMode = env.AI_MODE?.trim() || 'live';
  if (!['demo', 'live'].includes(aiMode)) throw new Error('Invalid AI_MODE configuration');
  const model = env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) throw new Error('Invalid GEMINI_MODEL configuration');
  return {
    aiMode,
    apiKey: env.GEMINI_API_KEY?.trim() || '', model,
    thinkingLevel: THINKING_LEVELS[model],
    port: numeric(env, 'PORT', 3001, 1, 65535), host: env.HOST || '127.0.0.1',
    origins: (env.WEB_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(s => s.trim()).filter(Boolean),
    confidenceThreshold: numeric(env, 'INTENT_CONFIDENCE_THRESHOLD', DEFAULT_CONFIDENCE_THRESHOLD, 0, 1),
    journeyConfidenceThreshold: numeric(env, 'JOURNEY_CONFIDENCE_THRESHOLD', 0.75, 0.55, 1),
    humanReviewThreshold: numeric(env, 'HUMAN_REVIEW_THRESHOLD', 0.55, 0, 0.55),
    timeoutMs: numeric(env, 'AI_TIMEOUT_MS', 10000, 1000, 12000),
    debugAi: env.AI_DEBUG_METADATA === 'true',
    rateLimit: 30,
  };
}
