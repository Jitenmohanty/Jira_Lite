import { test, expect } from '../fixtures';
import { getSession, firstOrg, csrfHeaders, USERS } from '../helpers/api';

/**
 * TC-10 — Developer platform (API keys + webhooks).
 * API:  POST/GET/DELETE /orgs/:id/api-keys (key revealed once on create);
 *       POST/GET /orgs/:id/webhooks, GET /webhooks/events, POST /:id/ping,
 *       DELETE /:id.
 * UI:   the Developer page creates an API key (revealed once) and a webhook.
 */
test.describe('TC-10 developer platform', () => {
  test('@api API key lifecycle: create → list → revoke', async () => {
    const session = await getSession(USERS.owner);
    const org = await firstOrg(session);

    const created = await session.ctx.post(`/orgs/${org.id}/api-keys`, {
      headers: csrfHeaders(session),
      data: { name: `qa-key-${Date.now()}` },
    });
    expect(created.status(), await created.text()).toBe(201);
    const { apiKey } = await created.json();
    expect(apiKey.key).toMatch(/^trc_/); // full secret shown once
    expect(apiKey.prefix).toBeTruthy();

    const list = await session.ctx.get(`/orgs/${org.id}/api-keys`);
    const keys = (await list.json()).apiKeys as { id: string; key?: string }[];
    expect(keys.some((k) => k.id === apiKey.id)).toBeTruthy();
    // The raw secret is never returned again by the list endpoint.
    expect(keys.find((k) => k.id === apiKey.id)?.key).toBeUndefined();

    const del = await session.ctx.delete(`/orgs/${org.id}/api-keys/${apiKey.id}`, {
      headers: csrfHeaders(session),
    });
    expect(del.ok()).toBeTruthy();

  });

  test('@api webhook lifecycle: create → list → ping → delete', async () => {
    const session = await getSession(USERS.owner);
    const org = await firstOrg(session);

    const catalog = await session.ctx.get(`/orgs/${org.id}/webhooks/events`);
    expect(catalog.ok()).toBeTruthy();
    expect((await catalog.json()).events).toContain('issue.created');

    const created = await session.ctx.post(`/orgs/${org.id}/webhooks`, {
      headers: csrfHeaders(session),
      data: { url: 'https://example.com/tracer-hook', events: ['issue.created'] },
    });
    expect(created.status(), await created.text()).toBe(201);
    const { webhook } = await created.json();
    expect(webhook.secret).toMatch(/^whsec_/);

    const list = await session.ctx.get(`/orgs/${org.id}/webhooks`);
    const hooks = (await list.json()).webhooks as { id: string }[];
    expect(hooks.some((h) => h.id === webhook.id)).toBeTruthy();

    const ping = await session.ctx.post(`/orgs/${org.id}/webhooks/${webhook.id}/ping`, {
      headers: csrfHeaders(session),
    });
    expect(ping.ok(), `ping → ${ping.status()}`).toBeTruthy();

    const del = await session.ctx.delete(`/orgs/${org.id}/webhooks/${webhook.id}`, {
      headers: csrfHeaders(session),
    });
    expect(del.ok()).toBeTruthy();

  });

  test('@ui create an API key (revealed once)', async ({ page }) => {
    await page.goto('/app/developer');
    await expect(page.getByRole('heading', { name: 'Developer' })).toBeVisible();

    await page.getByRole('button', { name: /new key/i }).click();
    await page.getByPlaceholder(/key name/i).fill(`ui-key-${Date.now()}`);
    await page.getByRole('button', { name: /^Create$/ }).click();

    // The reveal-once modal appears with the secret.
    await expect(page.getByRole('heading', { name: /copy your api key/i })).toBeVisible();
    await expect(page.locator('code', { hasText: /^trc_/ })).toBeVisible();
    await page.getByRole('button', { name: /^Done$/ }).click();
  });

  test('@ui create a webhook (signing secret revealed once)', async ({ page }) => {
    await page.goto('/app/developer');
    await page.getByRole('button', { name: /add webhook/i }).click();
    await page.getByPlaceholder(/https:\/\/example\.com/i).fill('https://example.com/ui-hook');
    // Must subscribe to at least one event (backend rejects an empty list).
    await page.getByRole('button', { name: 'issue.created', exact: true }).click();
    await page.getByRole('button', { name: /^Add$/ }).click();

    await expect(page.getByRole('heading', { name: /webhook signing secret/i })).toBeVisible();
    await expect(page.locator('code', { hasText: /^whsec_/ })).toBeVisible();
    await page.getByRole('button', { name: /^Done$/ }).click();
  });
});
