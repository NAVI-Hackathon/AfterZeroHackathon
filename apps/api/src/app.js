import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { createGeminiProvider } from './services/gemini.service.js';
import { understandIntent } from './services/intent.service.js';
import { RequestSchema } from './schemas/intent.schema.js';
import { ApiError, errorHandler } from './middleware/errorHandler.js';

export function createApp(config, provider = createGeminiProvider(config)) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({
    origin(origin, callback) { callback(config.origins.includes(origin) || !origin ? null : new ApiError('ORIGIN_NOT_ALLOWED', '此來源無法存取服務。', 403), true); },
    methods: ['POST', 'GET', 'OPTIONS'], allowedHeaders: ['Content-Type'], maxAge: 600,
  }));
  app.get('/api/health', (req, res) => res.json({ status: 'ok', aiProviderConfigured: Boolean(config.apiKey) }));
  // ponytail: in-memory limit is per process; use a shared store only when deploying multiple instances.
  const limiter = rateLimit({ windowMs: 60000, limit: config.rateLimit, standardHeaders: 'draft-8', legacyHeaders: false, handler: (req, res) => res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: '分析次數較多，請稍後再試。' } }) });
  app.use('/api/intelligence', limiter, express.json({ limit: '16kb' }));
  app.post('/api/intelligence/understand', async (req, res) => {
    const request = RequestSchema.safeParse(req.body);
    if (!request.success) throw new ApiError('INVALID_INPUT', '請描述你的情況，最多 2,000 字。', 400);
    const controller = new AbortController();
    res.on('close', () => { if (!res.writableEnded) controller.abort(); });
    const result = await understandIntent(request.data.message, { provider, config, signal: controller.signal });
    if (!controller.signal.aborted) res.json(result);
  });
  app.use((req, res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此服務。' } }));
  app.use(errorHandler);
  return app;
}
