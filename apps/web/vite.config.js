import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Split heavy third-party libraries into cacheable chunks; app code stays in the entry chunk.
const vendorGroups = [
  { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
  { name: 'motion', test: /node_modules[\\/](motion|motion-dom|motion-utils|framer-motion)[\\/]/ },
  { name: 'zod', test: /node_modules[\\/]zod[\\/]/ },
];

export default defineConfig({
  plugins: [react()],
  css: { postcss: { plugins: [] } },
  build: { rolldownOptions: { output: { codeSplitting: { groups: vendorGroups } } } },
  server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy: { "/api": "http://127.0.0.1:3001" } },
});
