import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { OWNER_STATE } from '../playwright.config';
import { USERS, PASSWORD } from '../helpers/api';
import { uiLogin } from '../helpers/ui';

/**
 * One real browser login as the org owner. The resulting session (including the
 * cross-origin auth cookie set by the API on :4000) is saved to disk and reused
 * by every @ui test via `storageState`, so they don't each re-login.
 */
setup('authenticate as owner (UI)', async ({ page }) => {
  setup.setTimeout(60_000);
  fs.mkdirSync(path.dirname(OWNER_STATE), { recursive: true });

  await uiLogin(page, USERS.owner, PASSWORD);
  await expect(page).toHaveURL(/\/app/);
  await page.context().storageState({ path: OWNER_STATE });
});
