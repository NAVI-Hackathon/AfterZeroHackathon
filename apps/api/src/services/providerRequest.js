import { ApiError } from '../middleware/errorHandler.js';

// Enforce a deadline even if a provider implementation fails to honor its AbortSignal.
export async function withProviderDeadline(task, { config, signal }) {
  const deadline = AbortSignal.timeout(config.timeoutMs);
  const combined = AbortSignal.any([deadline, signal]);
  let onAbort;
  try {
    combined.throwIfAborted();
    const cancelled = new Promise((resolve, reject) => {
      onAbort = () => reject(combined.reason);
      combined.addEventListener('abort', onAbort, { once: true });
    });
    return await Promise.race([task(combined), cancelled]);
  } catch (error) {
    if (deadline.aborted) throw new ApiError('AI_TIMEOUT', '分析時間較長，請重新嘗試。', 504);
    if (signal.aborted) throw new ApiError('REQUEST_CANCELLED', '分析已取消。', 499, false);
    throw error;
  } finally {
    if (onAbort) combined.removeEventListener('abort', onAbort);
  }
}
