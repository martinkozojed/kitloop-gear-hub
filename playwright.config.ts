import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  timeout: 120000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 15000,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  outputDir: 'test-results/playwright',
});
