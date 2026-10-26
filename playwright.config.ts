import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', timeout: 30000, fullyParallel: false, workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5173', viewport: { width: 1380, height: 900 }, trace: 'retain-on-failure',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH },
  },
  webServer: { command: 'npm run dev:web', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI, timeout: 30000 },
  reporter: [['list']],
});
