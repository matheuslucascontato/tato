import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: false,
  use: {
    baseURL: process.env.TATO_E2E_BASE_URL || 'http://127.0.0.1:3000',
    browserName: 'chromium',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox'],
    },
    trace: 'retain-on-failure',
  },
  reporter: 'list',
});
