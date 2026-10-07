import { loadConfig } from '../src/config/env.js';
import { createGeminiProvider } from '../src/services/gemini.service.js';
import { assertLiveAllowed, createAIRequestBudget } from '../src/ai/costGuard.js';
import { createEvaluationCache } from './cache.js';
import { loadDataset, liveSamples, evaluateLocal, evaluateLive } from './runner.js';

const flags = process.argv.slice(2);
if (flags.some(flag => !['--local', '--live', '--refresh', '--plan'].includes(flag)) || (flags.includes('--live') && flags.includes('--local'))) { console.error('Usage: eval:ai:local | eval:ai:live [--refresh] [--plan]'); process.exit(1); }
const live = flags.includes('--live');
try {
  const cases = await loadDataset();
  if (!live) {
    console.info('LOCAL EVALUATION — no Gemini requests');
    const report = await evaluateLocal(cases, loadConfig({ AI_MODE: 'demo' }));
    console.info(JSON.stringify(report, null, 2)); if (report.failed) process.exitCode = 1;
  } else {
    const config = loadConfig(); const samples = liveSamples(cases);
    console.info(`LIVE GEMINI REQUEST\nRequests planned (before cache): ${samples.length}\nMax allowed (including retries): ${config.liveRequestLimit}`);
    if (flags.includes('--plan')) console.info(JSON.stringify({ dryRun: true, requestsSent: 0, freeTierConfirmed: config.freeTierConfirmed, ciBlocked: config.ci, caseIds: samples.map(entry => entry.id) }, null, 2));
    else {
      assertLiveAllowed(config);
      if (!config.apiKey) throw new Error('AI_NOT_CONFIGURED');
      if (samples.length > config.liveRequestLimit) throw new Error('Live AI request budget reached. Do not continue automatically.');
      const budget = createAIRequestBudget(config.liveRequestLimit);
      const cache = createEvaluationCache(config.model, { refresh: flags.includes('--refresh') });
      const provider = createGeminiProvider(config, fetch, { budget, cache });
      const report = await evaluateLive(samples, { provider, config, budget });
      console.info(JSON.stringify({ ...report, budget: budget.status(), cache: cache.stats() }, null, 2));
      if (report.failed || report.stopped) process.exitCode = 1;
    }
  }
} catch (error) { console.error(error.code ?? (error.message.startsWith('Live AI request budget reached') ? error.message : 'Evaluation setup failed; check local configuration.')); process.exitCode = 1; }
