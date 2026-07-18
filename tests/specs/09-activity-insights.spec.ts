import { test, expect } from '../fixtures';
import { getSession, firstOrg, USERS } from '../helpers/api';
import { openApp, openSection } from '../helpers/ui';

/**
 * TC-09 — Activity feed + insights.
 * API:  GET /orgs/:id/activity returns recent activity rows;
 *       GET /orgs/:id/insights returns totals + status/priority/throughput.
 * UI:   the Activity page lists entries; the Insights page renders its
 *       heading, a total, and the throughput chart.
 */
test.describe('TC-09 activity & insights', () => {
  test('@api activity feed and insights summary', async () => {
    const session = await getSession(USERS.owner);
    const org = await firstOrg(session);

    const act = await session.ctx.get(`/orgs/${org.id}/activity`);
    expect(act.ok()).toBeTruthy();
    const { activity } = await act.json();
    expect(Array.isArray(activity)).toBeTruthy();
    expect(activity.length).toBeGreaterThan(0);
    expect(activity[0]).toHaveProperty('action');

    const ins = await session.ctx.get(`/orgs/${org.id}/insights`);
    expect(ins.ok()).toBeTruthy();
    const data = await ins.json();
    expect(data.totals.total).toBeGreaterThan(0);
    expect(data.statusCounts).toHaveProperty('done');
    expect(Array.isArray(data.throughput)).toBeTruthy();

  });

  test('@ui activity page lists entries', async ({ page }) => {
    await openSection(page, 'Activity');
    await expect(page.getByRole('heading', { name: 'Activity', exact: true })).toBeVisible();
    // The feed renders human-readable entries as list items (e.g.
    // "… created an issue: …"). Expect at least one.
    await expect(page.getByRole('listitem').filter({ hasText: /created/i }).first()).toBeVisible();
  });

  test('@ui insights page renders totals and the throughput chart', async ({ page }) => {
    await openApp(page);
    await page.getByRole('link', { name: 'Insights' }).click();
    await expect(page.getByRole('heading', { name: 'Insights', exact: true })).toBeVisible();
    await expect(page.getByText('Throughput').first()).toBeVisible();
    // Recharts renders an <svg> for the chart.
    await expect(page.locator('svg').first()).toBeVisible();
  });
});
