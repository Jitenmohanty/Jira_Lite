import { test, expect } from '../fixtures';
import { getSession, firstOrg, listMembers, USERS } from '../helpers/api';
import { openSection } from '../helpers/ui';

/**
 * TC-03 — Organizations & members.
 * API:  GET /orgs (the seeded org with the caller's role),
 *       GET /orgs/:orgId/members (roster with roles).
 * UI:   the Members page renders all three seeded members with their roles.
 */
test.describe('TC-03 orgs & members', () => {
  test('@api lists my orgs and the member roster', async () => {
    const session = await getSession(USERS.owner);
    const org = await firstOrg(session);
    expect(org.name).toBe('Tracer');
    expect(org.role).toBe('owner');

    const members = await listMembers(session, org.id);
    const emails = members.map((m) => m.email).sort();
    expect(emails).toEqual([USERS.admin, USERS.member, USERS.owner].sort());
    // Roles are populated per member.
    expect(members.find((m) => m.email === USERS.owner)?.role).toBe('owner');

  });

  test('@ui members page shows the roster with roles', async ({ page }) => {
    await openSection(page, 'Members');
    await expect(page.getByRole('heading', { name: 'Members', exact: true })).toBeVisible();

    await expect(page.getByText(USERS.owner)).toBeVisible();
    await expect(page.getByText(USERS.admin)).toBeVisible();
    await expect(page.getByText(USERS.member)).toBeVisible();

    // The owner sees editable role dropdowns; the first row is their own,
    // pre-selected to "owner".
    await expect(page.locator('table select').first()).toHaveValue('owner');
  });
});
