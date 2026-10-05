import assert from 'node:assert/strict';
import { loadConfig } from '../src/config/env.js';
import { createGeminiProvider } from '../src/services/gemini.service.js';
import { understandIntent } from '../src/services/intent.service.js';
import { inputs } from './fixtures.js';

const config = loadConfig();
if (!config.apiKey) { console.error('Real Gemini integration not run: configure apps/api/.env GEMINI_API_KEY.'); process.exit(1); }
const provider = createGeminiProvider(config);
for (const [message, expected] of inputs) {
  const start = performance.now();
  const response = await understandIntent(message, { provider, config, signal: new AbortController().signal });
  assert.equal(response.data.serviceType, expected);
  if (expected === 'flight_delay') { assert.equal(response.meta.outcome, 'supported'); assert.equal(response.data.extractedData.delayMinutes, 420); }
  if (expected === 'unknown') assert.equal(response.meta.outcome, 'clarification');
  // Output only test labels and timing; never print keys, user data or raw provider output.
  console.info(JSON.stringify({ provider: 'real_gemini', expected, outcome: response.meta.outcome, elapsedMs: Math.round(performance.now() - start), passed: true }));
}
