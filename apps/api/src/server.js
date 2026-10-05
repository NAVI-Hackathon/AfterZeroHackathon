import { loadConfig } from './config/env.js';
import { createApp } from './app.js';

const config = loadConfig();
const server = createApp(config).listen(config.port, config.host, () => console.info(`NAVI API listening on http://${config.host}:${config.port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { server.close(() => process.exit(0)); setTimeout(() => process.exit(1), 5000).unref(); });
