import { test, expect } from '@playwright/test';

// Sign in before each board test.
test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.fill('#email', 'owner@tracer.dev');
  await page.fill('#password', 'password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/app/);
});

test.describe('board', () => {
  test('opens a project and renders status columns with issue cards', async ({ page }) => {
    await page.getByText('Tracer Core').first().click();
    await expect(page).toHaveURL(/\/app\/projects\//);

    // Status columns.
    await expect(page.getByText('Backlog')).toBeVisible();
    await expect(page.getByText('In Progress')).toBeVisible();

    // At least one issue card (identifier like TRC-1).
    await expect(page.locator('text=/TRC-\\d+/').first()).toBeVisible();
  });

  test('switches to the list view', async ({ page }) => {
    await page.getByText('Tracer Core').first().click();
    await page.getByRole('button', { name: /List/ }).click();
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });
});
