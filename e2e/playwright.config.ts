import { defineConfig, devices } from '@playwright/test';

// The tests drive a real browser against the running system:
// frontend, gateway, the three services and MySQL. Start those first (see the README).
const chromePath = process.env.E2E_CHROME_PATH;

export default defineConfig({
  testDir: './tests',
  // One at a time: the tests share one database, and a fixed order keeps failures easy to read.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Set E2E_CHROME_PATH to use an installed Chrome instead of Playwright's download.
        launchOptions: chromePath ? { executablePath: chromePath } : {},
      },
    },
  ],
});
