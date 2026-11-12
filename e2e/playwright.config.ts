import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  workers: 1,
  fullyParallel: false,
  timeout: 5 * 60_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3100',
    viewport: { width: 360, height: 740 },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'node apps/server/dist/main.js',
    cwd: '..',
    env: { PORT: '3100', BOT_MOVE_DELAY_MS: '30', TRICK_PAUSE_MS: '100' },
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
