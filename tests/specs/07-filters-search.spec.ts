import { test, expect } from '../fixtures';
import { getSession, firstOrg, firstProject, csrfHeaders, USERS } from '../helpers/api';

/**
 * TC-07 — Issue filters + search.
 * API:  GET /projects/:id/issues?status/priority/assignee narrows results;
 *       GET /orgs/:id/issues/search?q finds an issue by title (ILIKE).
 * UI:   in list view, choosing a priority filter narrows the visible rows.
 */
test.describe('TC-07 filters & search', () => {
  test('@api status / priority / assignee filters narrow the result set', async () => {
    const session = await getSession(USERS.owner);
    const org = await firstOrg(session);
    const project = await firstProject(session, org.id);

    const doneRes = await session.ctx.get(`/projects/${project.id}/issues?status=done`);
    const done = (await doneRes.json()).issues as { status: string }[];
    expect(done.length).toBeGreaterThan(0);
    expect(done.every((i) => i.status === 'done')).toBeTruthy();

    const urgentRes = await session.ctx.get(`/projects/${project.id}/issues?priority=urgent`);
    const urgent = (await urgentRes.json()).issues as { priority: string }[];
    expect(urgent.every((i) => i.priority === 'urgent')).toBeTruthy();

    const unassignedRes = await session.ctx.get(`/projects/${project.id}/issues?assignee=none`);
    const unassigned = (await unassignedRes.json()).issues as { assigneeId: string | null }[];
    expect(unassigned.every((i) => i.assigneeId === null)).toBeTruthy();

  });

  test('@api search finds an issue by title', async () => {
    const session = await getSession(USERS.owner);
    const org = await firstOrg(session);
    const project = await firstProject(session, org.id);

    const marker = `Zephyr-${Date.now()}`;
    const created = await session.ctx.post(`/projects/${project.id}/issues`, {
      headers: csrfHeaders(session),
      data: { title: `Searchable ${marker}` },
    });
    expect(created.status()).toBe(201);

    const res = await session.ctx.get(`/orgs/${org.id}/issues/search?q=${encodeURIComponent(marker)}`);
    expect(res.ok()).toBeTruthy();
    const { issues } = await res.json();
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].title).toContain(marker);

  });

  test('@ui list-view priority filter narrows the rows', async ({ page }) => {
    await page.goto('/app');
    await page.getByText('Tracer Core').first().click();
    await page.getByRole('button', { name: /^List/ }).click();
    await expect(page.locator('table tbody tr').first()).toBeVisible();

    const before = await page.locator('table tbody tr').count();

    // The priority <select> is the "All priorities" combobox in the toolbar.
    const priority = page
      .locator('select')
      .filter({ has: page.locator('option', { hasText: 'All priorities' }) });

    // Wait for the filtered fetch to resolve so we don't read a transient
    // (empty) table mid-refetch.
    await Promise.all([
      page.waitForResponse(
        (r) => /\/projects\/.+\/issues\?/.test(r.url()) && r.url().includes('priority=urgent') && r.ok(),
      ),
      priority.selectOption('urgent'),
    ]);

    // Wait for the (new query-key) result to render, then confirm it narrowed.
    await expect.poll(async () => page.locator('table tbody tr').count()).toBeGreaterThan(0);
    const after = await page.locator('table tbody tr').count();
    expect(after).toBeLessThan(before);
  });
});
