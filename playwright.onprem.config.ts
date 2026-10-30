import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-onprem',
  testMatch: '**/*.e2e.ts',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:18092/onprem.html', viewport: { width: 1200, height: 900 } },
  webServer: [
    { command: 'uv run --directory backend python -m tests.e2e_server', url: 'http://127.0.0.1:18091/api/health', timeout: 120000 },
    { command: 'npm run dev:onprem', url: 'http://127.0.0.1:18092/onprem.html', timeout: 60000 },
  ],
});
