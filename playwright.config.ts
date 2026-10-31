import { defineConfig, devices } from '@playwright/test';

/** E2E del flujo del anfitrión contra el backend simulado (VITE_USE_MOCKS=true). */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npx vite --port 4173 --host 127.0.0.1 --mode e2e',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    env: { VITE_USE_MOCKS: 'true' },
  },
});
