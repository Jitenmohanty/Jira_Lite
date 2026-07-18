import { test, expect } from '../fixtures';
import { getSession, firstOrg, firstProject, csrfHeaders, USERS } from '../helpers/api';

/**
 * TC-08 — Comments.
 * API:  POST /issues/:id/comments creates a comment; GET lists it.
 * UI:   opening an issue detail panel, typing a comment and pressing "Comment"
 *       adds it to the thread.
 */
test.describe('TC-08 comments', () => {
  test('@api create and list a comment on an issue', async () => {
    const session = await getSession(USERS.owner);
    const org = await firstOrg(session);
    const project = await firstProject(session, org.id);
    const { issues } = await (await session.ctx.get(`/projects/${project.id}/issues`)).json();
    const issueId = issues[0].id;

    const body = `API comment ${Date.now()}`;
    const created = await session.ctx.post(`/issues/${issueId}/comments`, {
      headers: csrfHeaders(session),
      data: { body },
    });
    expect(created.status(), await created.text()).toBe(201);

    const list = await session.ctx.get(`/issues/${issueId}/comments`);
    expect(list.ok()).toBeTruthy();
    const { comments } = await list.json();
    expect(comments.some((c: { body: string }) => c.body === body)).toBeTruthy();

  });

  test('@ui post a comment from the issue detail panel', async ({ page }) => {
    const body = `UI comment ${Date.now()}`;

    await page.goto('/app');
    await page.getByText('Tracer Core').first().click();
    await expect(page).toHaveURL(/\/app\/projects\//);

    // Open the first issue card to reveal the detail panel.
    await page.locator('text=/TRC-\\d+/').first().click();

    const box = page.getByPlaceholder(/leave a comment/i);
    await expect(box).toBeVisible();
    await box.fill(body);
    await page.getByRole('button', { name: /^Comment$/ }).click();

    await expect(page.getByText(body)).toBeVisible();
  });
});
