import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = new URL('../', import.meta.url);
// Spawn Node directly so stopping development also stops Vite and the API.
// Keep combined demos stable; dev:api still offers opt-in file watching.
const children = [
  spawn(process.execPath, [fileURLToPath(new URL('node_modules/vite/bin/vite.js', root))], { cwd: fileURLToPath(new URL('apps/web', root)), stdio: 'inherit' }),
  spawn(process.execPath, ['--env-file-if-exists=.env', 'src/server.js'], { cwd: fileURLToPath(new URL('apps/api', root)), stdio: 'inherit', env: { ...process.env, AI_MODE: process.argv.includes('--live') ? 'live' : 'demo' } }),
];
if (process.argv.includes('--all')) {
  const mockRoot = new URL('apps/mock-site/', root);
  const require = createRequire(new URL('package.json', mockRoot));
  children.push(spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', '3000'], { cwd: fileURLToPath(mockRoot), stdio: 'inherit' }));
}
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
for (const child of children) {
  child.on('error', () => stop(1));
  child.on('exit', code => stop(code || 0));
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop());
