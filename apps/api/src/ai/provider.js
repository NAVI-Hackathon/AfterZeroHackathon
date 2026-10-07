import { createDemoProvider } from './demoProvider.js';
import { createGeminiProvider } from '../services/gemini.service.js';

export function createAIProvider(config) {
  return config.aiMode === 'demo' ? createDemoProvider() : { ...createGeminiProvider(config), mode: 'live' };
}
