import { test, expect } from '../fixtures';
import { getSession, firstOrg, firstProject, csrfHeaders, USERS } from '../helpers/api';

/**
 * TC-06 — Issues CRUD + the board.
 * API:  POST creates an issue with a per-project sequential number, GET reads
 *       it back, PATCH moves it to another status.
 * UI:   the board renders status columns and issue cards (TRC-n); creating an
 *       issue through the dialog adds a card; the list view toggle works.
 */
test.describe('TC-06 issues & board', () => {
  test('@api create, read, and change the status of an issue', async () => {
    const session = await getSession(USERS.owner);
    const org = await firstOrg(session);
    const project = await firstProject(session, org.id);

    const created = await session.ctx.post(`/projects/${project.id}/issues`, {
      headers: csrfHeaders(session),
      data: { title: 'API-created issue', priority: 'high', status: 'todo' },
    });
    expect(created.status(), await created.text()).toBe(201);
    const { issue } = await created.json();
    expect(issue.issueNumber).toBeGreaterThan(0);
    expect(issue.status).toBe('todo');

    const read = await session.ctx.get(`/issues/${issue.id}`);
    expect(read.ok()).toBeTruthy();
    expect((await read.json()).issue.title).toBe('API-created issue');

    const moved = await session.ctx.patch(`/issues/${issue.id}`, {
      headers: csrfHeaders(session),
      data: { status: 'in_progress' },
    });
    expect(moved.status()).toBe(200);
    expect((await moved.json()).issue.status).toBe('in_progress');

  });

  test('@ui board shows status columns and issue cards', async ({ page }) => {
    await page.goto('/app');
    await page.getByText('Tracer Core').first().click();
    await expect(page).toHaveURL(/\/app\/projects\//);

    await expect(page.getByText('Backlog').first()).toBeVisible();
    await expect(page.getByText('In Progress').first()).toBeVisible();
    // At least one issue card with a TRC-n identifier.
    await expect(page.locator('text=/TRC-\\d+/').first()).toBeVisible();
  });

  test('@ui create an issue through the dialog', async ({ page }) => {
    const title = `UI issue ${Date.now()}`;
    await page.goto('/app');
    await page.getByText('Tracer Core').first().click();
    await expect(page).toHaveURL(/\/app\/projects\//);

    await page.getByRole('button', { name: /new issue/i }).first().click();
    // The dialog resets its fields on open; interact with the selects first so
    // that reset has run, then fill the title last and confirm it stuck.
    await expect(page.locator('#i-title')).toBeVisible();
    await page.selectOption('#i-status', 'todo');
    await page.selectOption('#i-priority', 'medium');
    await page.fill('#i-title', title);
    await expect(page.locator('#i-title')).toHaveValue(title);
    await page.getByRole('button', { name: /create issue/i }).click();

    await expect(page.getByText(title)).toBeVisible();
  });

  test('@ui switches to the list view', async ({ page }) => {
    await page.goto('/app');
    await page.getByText('Tracer Core').first().click();
    await page.getByRole('button', { name: /^List/ }).click();
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });
});
