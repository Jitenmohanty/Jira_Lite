import { test, expect } from '@playwright/test';

test.describe('authentication', () => {
  test('logs in with demo credentials and reaches the app', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'owner@tracer.dev');
    await page.fill('#password', 'password123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/app/);
  });

  test('shows an error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'owner@tracer.dev');
    await page.fill('#password', 'definitely-wrong');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });
});
