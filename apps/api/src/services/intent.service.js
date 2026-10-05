import { intentDisposition } from '../../../../shared/intelligence.js';
import { normalizeIntent } from '../schemas/intent.schema.js';
import { ApiError } from '../middleware/errorHandler.js';

export async function understandIntent(message, { provider, config, signal }) {
  const deadline = AbortSignal.timeout(config.timeoutMs);
  const combined = AbortSignal.any([deadline, signal]);
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await provider.understandIntent(message, combined);
        const data = normalizeIntent(raw);
        return { success: true, data, meta: { source: 'gemini', outcome: intentDisposition(data, config.confidenceThreshold), confidenceThreshold: config.confidenceThreshold } };
      } catch (error) {
        if (combined.aborted) throw error;
        if (error.name !== 'ZodError' && error.code !== 'AI_RESPONSE_INVALID') throw error;
        if (attempt === 1) throw new ApiError('AI_RESPONSE_INVALID', '分析結果尚不完整，請重新分析。');
      }
    }
  } catch (error) {
    if (deadline.aborted) throw new ApiError('AI_TIMEOUT', '分析時間較長，請重新分析。', 504);
    if (signal.aborted) throw new ApiError('REQUEST_CANCELLED', '分析已取消。', 499);
    throw error;
  }
}
