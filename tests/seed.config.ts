import { defineConfig } from '@playwright/test';

/**
 * Dedicated config for the on-demand dummy-data generator so it stays OUT of
 * the normal suite (`playwright.config.ts`). Run it with `npm run seed:dummy`.
 * It only talks to the API, so no browser session/storageState is needed.
 */
export default defineConfig({
  testDir: './tools',
  timeout: 600_000,
  reporter: [['list']],
  workers: 1,
  projects: [{ name: 'seed', testMatch: /seed-dummy-data\.spec\.ts/ }],
});
