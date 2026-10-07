import { z } from 'zod';
import { SYSTEM_PROMPT } from '../ai/prompts/intentPrompt.js';
import { DOCUMENT_PROMPT } from '../ai/prompts/documentPrompt.js';
import { KNOWLEDGE_PROMPT, HANDOFF_PROMPT } from '../ai/prompts/knowledgePrompt.js';
import { intentJsonSchema, documentJsonSchema, normalizeGeminiIntent, normalizeGeminiDocument, GroundedAnswerSchema, HandoffSelectionSchema } from '../ai/schemas.js';
import { ApiError } from '../middleware/errorHandler.js';

// Native REST transport; inline media never leaves the backend through a public URL.
export function createGeminiProvider(config, fetchImpl = fetch) {
  const metadata = new Map();
  async function generate(operation, prompt, parts, schema, validate, signal = AbortSignal.timeout(config.timeoutMs)) {
    if (!config.apiKey) throw new ApiError('AI_NOT_CONFIGURED', '目前暫時無法分析你的需求。請稍後再試。', 503, false);
    const started = performance.now();
    let schemaValid = false;
    let errorCode;
    try {
      signal.throwIfAborted();
      const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`, {
        method: 'POST', signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: prompt }] }, contents: [{ role: 'user', parts }],
          generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, maxOutputTokens: 2048,
            ...(config.thinkingLevel ? { thinkingConfig: { thinkingLevel: config.thinkingLevel } } : {}) },
        }),
      });
      if (!response.ok) throw new ApiError('AI_PROVIDER_ERROR', '目前暫時無法完成分析。請稍後再試。', 502, response.status === 429 || response.status >= 500);
      const body = await response.json();
      const candidate = body.candidates?.[0];
      if (body.promptFeedback?.blockReason || ['SAFETY', 'RECITATION', 'PROHIBITED_CONTENT', 'BLOCKLIST'].includes(candidate?.finishReason)) throw new ApiError('AI_SAFETY_REJECTION', '目前無法可靠分析這份資料，請補充說明或由專員協助。', 422, false);
      if (candidate?.finishReason !== 'STOP') throw new ApiError('AI_RESPONSE_INVALID', '分析結果尚不完整，請重新分析。');
      const text = candidate.content?.parts?.filter(part => !part.thought).map(part => part.text || '').join('');
      const data = validate(JSON.parse(text));
      schemaValid = true;
      return data;
    } catch (error) {
      errorCode = error.code ?? (error.name === 'ZodError' || error instanceof SyntaxError ? 'AI_RESPONSE_INVALID' : 'AI_PROVIDER_ERROR');
      if (signal.aborted) { errorCode = 'AI_ABORTED'; throw signal.reason; }
      if (error instanceof ApiError) throw error;
      if (error.name === 'ZodError' || error instanceof SyntaxError) throw new ApiError('AI_RESPONSE_INVALID', '分析結果尚不完整，請重新分析。');
      throw new ApiError('AI_PROVIDER_ERROR', '目前暫時無法完成分析。請稍後再試。');
    } finally {
      const event = { provider: 'gemini', model: config.model, operation, latencyMs: Math.round(performance.now() - started), schemaValid, fallbackUsed: false, ...(errorCode ? { errorCode } : {}) };
      metadata.set(operation, event);
      if (config.debugAi) console.info(JSON.stringify({ event: 'ai_request', ...event }));
    }
  }
  return {
    mode: 'live',
    getDebugMetadata: () => Object.fromEntries([...metadata].map(([key, value]) => [key, { ...value }])),
    recordFallback(operation) { const value = metadata.get(operation); if (value) metadata.set(operation, { ...value, fallbackUsed: true }); },
    understandIntent: (message, signal) => generate('intent', SYSTEM_PROMPT, [{ text: message }], intentJsonSchema, normalizeGeminiIntent, signal),
    analyzeDocument: (upload, signal) => generate('document', DOCUMENT_PROMPT, [{ text: 'Extract the visible facts from this document.' }, { inlineData: { mimeType: upload.mimeType, data: upload.bytes.toString('base64') } }], documentJsonSchema, normalizeGeminiDocument, signal),
    answerKnowledge: (question, context, signal) => generate('knowledge', KNOWLEDGE_PROMPT, [{ text: JSON.stringify({ question, context }) }], z.toJSONSchema(GroundedAnswerSchema), raw => GroundedAnswerSchema.parse(raw), signal),
    summarizeHandoff: (knownFacts, signal) => generate('handoff', HANDOFF_PROMPT, [{ text: JSON.stringify({ knownFacts }) }], z.toJSONSchema(HandoffSelectionSchema), raw => HandoffSelectionSchema.parse(raw), signal),
  };
}
