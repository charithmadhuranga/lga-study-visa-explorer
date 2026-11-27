#!/usr/bin/env node
/**
 * Serve the production build and run the real-engine smoke test (scripts/webkitgtk-smoke.py)
 * against it. Exit code is the smoke test's. Use via `npm run e2e:webkitgtk`
 * (CI wraps it in `xvfb-run`).
 */
import { spawn } from 'node:child_process';
import { preview } from 'vite';

const server = await preview({ preview: { port: 4175, strictPort: true, open: false } });
const url = (server.resolvedUrls?.local[0] ?? 'http://localhost:4175/').replace(/\/$/, '');
const child = spawn('python3', ['scripts/webkitgtk-smoke.py', url], { stdio: 'inherit' });
child.on('exit', (code) => {
  server.httpServer.close();
  process.exit(code ?? 1);
});
