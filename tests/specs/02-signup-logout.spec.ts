import { test, expect } from '../fixtures';
import { USERS, PASSWORD } from '../helpers/api';
import { uiSignup, uiSignupExpectError } from '../helpers/ui';
import { API_BASE_URL } from '../playwright.config';

/**
 * TC-02 — Signup + logout.
 * API:  POST /auth/signup (201 for a new email, 409 for a duplicate),
 *       POST /auth/logout ends the session (subsequent /auth/me → 401).
 * UI:   the signup form creates an account and lands in the app; logout via the
 *       command palette returns to /login.
 */
test.describe('TC-02 signup + logout', () => {
  const unique = () => `qa+${Date.now()}${Math.floor(Math.random() * 1000)}@tracer.test`;

  test('@api signup creates an account, and a duplicate email is rejected with 409', async ({
    playwright,
  }) => {
    const ctx = await playwright.request.newContext({ baseURL: API_BASE_URL });
    const { csrfToken } = await (await ctx.get('/auth/csrf')).json();
    const email = unique();

    const created = await ctx.post('/auth/signup', {
      headers: { 'x-csrf-token': csrfToken },
      data: { email, name: 'QA Bot', password: 'password123' },
    });
    expect(created.status(), await created.text()).toBe(201);
    const { user } = await created.json();
    expect(user.email).toBe(email);

    const dup = await ctx.post('/auth/signup', {
      headers: { 'x-csrf-token': csrfToken },
      data: { email, name: 'QA Bot Again', password: 'password123' },
    });
    expect(dup.status()).toBe(409);
    expect((await dup.json()).error?.code).toBe('CONFLICT');

    await ctx.dispose();
  });

  test('@api logout clears the session', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: API_BASE_URL });
    const { csrfToken } = await (await ctx.get('/auth/csrf')).json();
    await ctx.post('/auth/login', {
      headers: { 'x-csrf-token': csrfToken },
      data: { email: USERS.member, password: PASSWORD },
    });
    expect((await ctx.get('/auth/me')).ok()).toBeTruthy();

    const out = await ctx.post('/auth/logout', { headers: { 'x-csrf-token': csrfToken } });
    expect(out.ok()).toBeTruthy();

    expect((await ctx.get('/auth/me')).status()).toBe(401);
    await ctx.dispose();
  });

  test.use({ storageState: { cookies: [], origins: [] } });

  test('@ui signup form creates an account and enters the app', async ({ page }) => {
    await uiSignup(page, { name: 'QA UI User', email: unique(), password: 'password123' });
    await expect(page).toHaveURL(/\/app/);
  });

  test('@ui empty submit shows a validation error for every field', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByText(/name is required/i)).toBeVisible();
    await expect(page.getByText(/enter a valid email/i)).toBeVisible();
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
    await expect(page).toHaveURL(/\/signup/);
  });

  test('@ui a malformed email is rejected client-side', async ({ page }) => {
    await uiSignupExpectError(
      page,
      { name: 'QA', email: 'not-an-email', password: 'password123' },
      /enter a valid email/i,
    );
  });

  test('@ui a short password is rejected client-side', async ({ page }) => {
    await uiSignupExpectError(
      page,
      { name: 'QA', email: unique(), password: '1234567' },
      /at least 8 characters/i,
    );
  });

  test('@ui a whitespace-only name is rejected (not sent to the server)', async ({ page }) => {
    // Regression: the client schema trims before validating, so "   " must fail
    // the same "Name is required" rule as an empty field rather than reaching the
    // API and coming back as a generic 400.
    await uiSignupExpectError(
      page,
      { name: '   ', email: unique(), password: 'password123' },
      /name is required/i,
    );
  });
});
