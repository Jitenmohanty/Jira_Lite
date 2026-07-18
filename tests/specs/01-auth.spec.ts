import { test, expect } from '../fixtures';
import { loginApi, USERS, PASSWORD } from '../helpers/api';
import { uiLogin, uiLoginExpectError } from '../helpers/ui';
import { API_BASE_URL } from '../playwright.config';

/**
 * TC-01 — Authentication (login).
 * API:  POST /auth/login (valid → 200 + user, wrong password → 401),
 *       GET /auth/me returns the authenticated user.
 * UI:   the login form signs in and lands on /app; bad creds surface an error.
 */
test.describe('TC-01 authentication — login', () => {
  test('@api login with valid credentials returns the user and /me works', async () => {
    const session = await loginApi(USERS.owner);
    expect(session.user.email).toBe(USERS.owner);
    expect(session.user.id).toBeTruthy();

    const me = await session.ctx.get('/auth/me');
    expect(me.ok()).toBeTruthy();
    const { user } = await me.json();
    expect(user.email).toBe(USERS.owner);

    await session.dispose();
  });

  test('@api login with a wrong password is rejected with 401', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: API_BASE_URL });
    const { csrfToken } = await (await ctx.get('/auth/csrf')).json();
    const res = await ctx.post('/auth/login', {
      headers: { 'x-csrf-token': csrfToken },
      data: { email: USERS.owner, password: 'definitely-wrong' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe('UNAUTHORIZED');
    await ctx.dispose();
  });

  // These UI tests establish their own session, so start from a clean state.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('@ui login form signs in and reaches the app', async ({ page }) => {
    await uiLogin(page, USERS.owner, PASSWORD);
    await expect(page).toHaveURL(/\/app/);
  });

  test('@ui login form shows an error for invalid credentials', async ({ page }) => {
    await uiLoginExpectError(page, USERS.owner, 'definitely-wrong', /invalid email or password/i);
    await expect(page).toHaveURL(/\/login/);
  });
});
