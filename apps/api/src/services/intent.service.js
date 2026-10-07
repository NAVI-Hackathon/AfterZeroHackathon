import { intentDisposition } from '../../../../shared/intelligence.js';
import { normalizeIntent } from '../schemas/intent.schema.js';
import { ApiError } from '../middleware/errorHandler.js';
import { withProviderDeadline } from './providerRequest.js';

export async function understandIntent(message, { provider, config, signal }) {
  return withProviderDeadline(async combined => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await provider.understandIntent(message, combined);
        const data = normalizeIntent(raw);
        return { success: true, data, meta: { source: provider.mode === 'demo' ? 'demo_fallback' : 'gemini', outcome: intentDisposition(data, config.confidenceThreshold), confidenceThreshold: config.confidenceThreshold } };
      } catch (error) {
        if (combined.aborted) throw error;
        if (error.name !== 'ZodError' && error.code !== 'AI_RESPONSE_INVALID') throw error;
        if (attempt === 1) throw new ApiError('AI_RESPONSE_INVALID', '分析結果尚不完整，請重新分析。');
      }
    }
  }, { config, signal });
}
