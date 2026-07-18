import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

/**
 * Standalone E2E + API suite for Tracer.
 *
 * Assumes both apps are already running (see README.md in this folder):
 *   - API  → http://localhost:4000  (migrated + seeded)
 *   - Web  → http://localhost:3000
 *
 * Two layers are exercised from one suite:
 *   - @api  tests hit the Express API directly via Playwright's request context
 *           (status codes, payload shapes, auth + RBAC + CSRF).
 *   - @ui   tests drive the Next.js app in a real browser, reusing a shared
 *           logged-in session captured by the `setup` project.
 */

export const UI_BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
export const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4000';

// Where the setup project stores the authenticated browser session.
export const OWNER_STATE = path.join(__dirname, '.auth', 'owner.json');

export default defineConfig({
  testDir: './specs',
  globalSetup: './global-setup.ts',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: UI_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // API-layer tests hit the backend directly — no browser session needed, so
    // they run independently of the UI login (and of the frontend being up).
    {
      name: 'api',
      testMatch: /.*\.spec\.ts/,
      grep: /@api/,
      use: { ...devices['Desktop Chrome'] },
    },
    // Logs in through the real UI once and saves the session for the @ui tests.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    // UI-layer tests drive the Next.js app, reusing the saved owner session.
    {
      name: 'ui',
      dependencies: ['setup'],
      testMatch: /.*\.spec\.ts/,
      grep: /@ui/,
      use: { ...devices['Desktop Chrome'], storageState: OWNER_STATE },
    },
  ],
});
