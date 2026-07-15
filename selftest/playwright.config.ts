import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYKIT_SELFTEST_PORT || 4173);
const baseURL = process.env.PLAYKIT_BASE_URL || `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    ...devices['Desktop Chrome'],
    trace: 'on-first-retry',
  },
  webServer: {
    command: `node demo-site/server.mjs`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: {
      ...process.env,
      PLAYKIT_SELFTEST_PORT: String(port),
      PLAYKIT_SELFTEST_HOST: '127.0.0.1',
    },
  },
});
