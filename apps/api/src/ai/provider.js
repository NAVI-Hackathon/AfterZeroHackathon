import { assertFreeProvider } from './costGuard.js';
import { createDemoProvider } from './demoProvider.js';
import { createGeminiProvider } from '../services/gemini.service.js';

export function createAIProvider(config) {
  return assertFreeProvider(config.aiMode === 'demo' ? createDemoProvider() : createGeminiProvider(config));
}
