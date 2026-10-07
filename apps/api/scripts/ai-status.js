import { loadConfig } from '../src/config/env.js';
import { FREE_TIER_MODEL } from '../src/ai/costGuard.js';
const config = loadConfig();
console.info(JSON.stringify({ title: 'NAVI AI configuration', mode: config.aiMode, model: config.model, apiKeyPresent: Boolean(config.apiKey), freeTierConfirmed: config.freeTierConfirmed,
  billingVerifiedByTool: false, approvedFreeTierModel: config.model === FREE_TIER_MODEL,
  liveEvaluationRequestLimit: config.liveRequestLimit, liveRequestBudgetEnabled: true,
  liveAllowed: Boolean(config.apiKey) && config.freeTierConfirmed && !config.ci && config.model === FREE_TIER_MODEL,
  paidFallback: 'disabled', googleSearchGrounding: 'disabled', googleMapsGrounding: 'disabled', externalPaidProviders: 0,
  batchAPI: 'disabled', contextCachingAPI: 'disabled', vertexAI: 'disabled', allowPaidAI: false, demoProviderAvailable: true, requestsSent: 0 }, null, 2));
