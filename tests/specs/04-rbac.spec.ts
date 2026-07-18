import { test, expect } from '../fixtures';
import { getSession, firstOrg, listMembers, csrfHeaders, USERS, PASSWORD } from '../helpers/api';
import { openSection, uiLogin } from '../helpers/ui';

/**
 * TC-04 — RBAC enforcement on role changes.
 * API:  PATCH /orgs/:orgId/members/:userId is rejected (403) for a `member`
 *       but allowed (200) for the `owner`. Backend-enforced, not just UI.
 * UI:   a signed-in `member` sees read-only role badges and no "Add member"
 *       action, while the `owner` sees editable role dropdowns.
 */
test.describe('TC-04 RBAC', () => {
  test('@api member cannot change roles; owner can', async () => {
    const owner = await getSession(USERS.owner);
    const org = await firstOrg(owner);
    const members = await listMembers(owner, org.id);
    const memberRow = members.find((m) => m.email === USERS.member)!;
    expect(memberRow).toBeTruthy();

    // A plain member is forbidden from changing anyone's role.
    const member = await getSession(USERS.member);
    const forbidden = await member.ctx.patch(`/orgs/${org.id}/members/${memberRow.userId}`, {
      headers: csrfHeaders(member),
      data: { role: 'admin' },
    });
    expect(forbidden.status()).toBe(403);
    expect((await forbidden.json()).error?.code).toBe('FORBIDDEN');

    // The owner can — promote to admin, then revert to keep the seed intact.
    const promote = await owner.ctx.patch(`/orgs/${org.id}/members/${memberRow.userId}`, {
      headers: csrfHeaders(owner),
      data: { role: 'admin' },
    });
    expect(promote.status(), await promote.text()).toBe(200);

    const revert = await owner.ctx.patch(`/orgs/${org.id}/members/${memberRow.userId}`, {
      headers: csrfHeaders(owner),
      data: { role: 'member' },
    });
    expect(revert.status()).toBe(200);

  });

  test('@ui owner sees editable role dropdowns', async ({ page }) => {
    await openSection(page, 'Members');
    await expect(page.getByRole('heading', { name: 'Members', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /add member/i })).toBeVisible();
    // One <select> per member row.
    await expect(page.locator('table select').first()).toBeVisible();
  });

  test.describe('as a member', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('@ui member sees read-only roles and no invite action', async ({ page }) => {
      await uiLogin(page, USERS.member, PASSWORD);
      await expect(page).toHaveURL(/\/app/);

      // SPA-navigate so the just-selected org stays active.
      await page.getByRole('link', { name: 'Members' }).click();
      await expect(page.getByRole('heading', { name: 'Members', exact: true })).toBeVisible();
      // Wait for the roster to load so the negative assertions are meaningful.
      await expect(page.getByText(USERS.owner)).toBeVisible();
      // No role dropdowns and no invite button for a member.
      await expect(page.locator('table select')).toHaveCount(0);
      await expect(page.getByRole('button', { name: /add member/i })).toHaveCount(0);
    });
  });
});
