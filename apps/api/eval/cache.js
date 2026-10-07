import { createHash, randomUUID } from 'node:crypto';
import { readFile, mkdir, writeFile, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROMPT_VERSIONS } from '../src/ai/prompts/versions.js';

export function evaluationCacheKey(model, operation, prompt, parts, schema, versions = PROMPT_VERSIONS) {
  return createHash('sha256').update(JSON.stringify({ model, operation, promptVersion: versions[operation], prompt, parts, schema })).digest('hex');
}
// Only used by the curated synthetic evaluation runner. Production uploads never use this cache.
export function createEvaluationCache(model, { directory = fileURLToPath(new URL('./cache/', import.meta.url)), refresh = false } = {}) {
  const stats = { hits: 0, misses: 0, writes: 0 };
  const key = (...args) => evaluationCacheKey(model, ...args);
  return {
    async read(operation, prompt, parts, schema) {
      if (!refresh) {
        try {
          const hash = key(operation, prompt, parts, schema);
          const bytes = await readFile(join(directory, hash + '.json'));
          if (bytes.length > 128 * 1024) throw new Error('Invalid cache size');
          const entry = JSON.parse(bytes);
          if (entry.synthetic !== true || entry.model !== model || entry.promptVersion !== PROMPT_VERSIONS[operation] || entry.key !== hash) throw new Error('Invalid cache provenance');
          stats.hits++; return entry.response;
        } catch { /* Absent/corrupt caches are misses; the request budget still applies. */ }
      }
      stats.misses++; return null;
    },
    async write(operation, prompt, parts, schema, response) {
      await mkdir(directory, { recursive: true });
      const hash = key(operation, prompt, parts, schema);
      const target = join(directory, hash + '.json'); const temporary = target + '.' + randomUUID() + '.tmp';
      try {
        await writeFile(temporary, JSON.stringify({ key: hash, model, operation, promptVersion: PROMPT_VERSIONS[operation], synthetic: true, response }), { mode: 0o600 });
        await rename(temporary, target); stats.writes++;
      } finally { await unlink(temporary).catch(() => {}); }
    },
    stats: () => ({ ...stats }),
  };
}
