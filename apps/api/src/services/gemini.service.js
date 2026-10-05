import { SYSTEM_PROMPT } from './intent.prompt.js';
import { providerJsonSchema } from '../schemas/intent.schema.js';
import { ApiError } from '../middleware/errorHandler.js';

// Native fetch keeps all credentials and provider-specific details on the server.
export function createGeminiProvider(config, fetchImpl = fetch) {
  return {
    async understandIntent(message, signal) {
      if (!config.apiKey) throw new ApiError('AI_NOT_CONFIGURED', '目前暫時無法分析你的需求。請稍後再試。', 503);
      let response;
      try {
        response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`, {
          method: 'POST', signal,
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: message }] }],
            generationConfig: { responseMimeType: 'application/json', responseJsonSchema: providerJsonSchema, maxOutputTokens: 2048, ...(config.thinkingLevel ? { thinkingConfig: { thinkingLevel: config.thinkingLevel } } : {}) },
          }),
        });
        if (!response.ok) throw new ApiError('AI_PROVIDER_ERROR', '目前暫時無法分析你的需求。請稍後再試。');
        const body = await response.json();
        const candidate = body.candidates?.[0];
        if (candidate?.finishReason !== 'STOP') throw new ApiError('AI_RESPONSE_INVALID', '分析結果尚不完整，請重新分析。');
        const content = candidate.content?.parts?.filter(part => !part.thought).map(part => part.text || '').join('');
        return JSON.parse(content);
      } catch (error) {
        if (signal.aborted) throw signal.reason;
        if (error instanceof ApiError) throw error;
        if (error instanceof SyntaxError) throw new ApiError('AI_RESPONSE_INVALID', '分析結果尚不完整，請重新分析。');
        throw new ApiError('AI_PROVIDER_ERROR', '目前暫時無法分析你的需求。請稍後再試。');
      }
    },
  };
}
