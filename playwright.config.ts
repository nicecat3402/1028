import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  use: {
    baseURL: process.env.SMOKE_URL || 'http://127.0.0.1:4173/1028/',
    viewport: { width: 390, height: 844 },
    channel: process.env.SMOKE_CHANNEL || undefined,
  },
  webServer: process.env.SMOKE_URL ? undefined : {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/1028/',
    env: { BASE_PATH: '/1028/' },
  },
});
