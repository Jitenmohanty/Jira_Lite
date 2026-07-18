import { test, expect } from '../fixtures';
import { getSession, firstOrg, csrfHeaders, USERS } from '../helpers/api';

/**
 * TC-05 — Projects CRUD.
 * API:  POST creates a project (auto/explicit key), GET lists it, PATCH renames
 *       it, DELETE removes it.
 * UI:   creating a project through the "New project" dialog makes it appear in
 *       the sidebar and opens its board.
 */
test.describe('TC-05 projects CRUD', () => {
  test('@api create, list, update, delete a project', async () => {
    const session = await getSession(USERS.owner);
    const org = await firstOrg(session);
    const suffix = `${Date.now()}`.slice(-5);

    const created = await session.ctx.post(`/orgs/${org.id}/projects`, {
      headers: csrfHeaders(session),
      data: { name: `QA Project ${suffix}`, key: `QA${suffix}`.slice(0, 10), description: 'temp' },
    });
    expect(created.status(), await created.text()).toBe(201);
    const { project } = await created.json();
    expect(project.key).toMatch(/^[A-Z0-9]+$/);

    const list = await session.ctx.get(`/orgs/${org.id}/projects`);
    const { projects } = await list.json();
    expect(projects.some((p: { id: string }) => p.id === project.id)).toBeTruthy();

    // Project read/update/delete are org-scoped: /orgs/:orgId/projects/:projectId
    const patched = await session.ctx.patch(`/orgs/${org.id}/projects/${project.id}`, {
      headers: csrfHeaders(session),
      data: { name: `QA Project ${suffix} (renamed)` },
    });
    expect(patched.status(), await patched.text()).toBe(200);
    expect((await patched.json()).project.name).toContain('renamed');

    const removed = await session.ctx.delete(`/orgs/${org.id}/projects/${project.id}`, {
      headers: csrfHeaders(session),
    });
    expect(removed.ok()).toBeTruthy();

    const gone = await session.ctx.get(`/orgs/${org.id}/projects/${project.id}`);
    expect(gone.status()).toBe(404);

  });

  test('@ui create a project via the dialog and see it in the sidebar', async ({ page }) => {
    const suffix = `${Date.now()}`.slice(-5);
    const name = `UI Project ${suffix}`;

    await page.goto('/app');
    await page.getByRole('button', { name: /new project/i }).click();

    await page.fill('#p-name', name);
    await page.fill('#p-key', `UI${suffix}`.slice(0, 10));
    await page.getByRole('button', { name: /create project/i }).click();

    // The new project shows up (sidebar nav and/or the opened board header).
    await expect(page.getByText(name).first()).toBeVisible();
  });
});
