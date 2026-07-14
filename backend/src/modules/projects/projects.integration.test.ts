import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, pool } from '../../db/client';
import { memberships, organizations, users } from '../../db/schema';
import { createProject } from './projects.service';

let userId: string;
let orgId: string;

beforeAll(async () => {
  const [u] = await db
    .insert(users)
    .values({ email: `pj+${Date.now()}@t.dev`, name: 'PJ', passwordHash: 'x' })
    .returning();
  userId = u!.id;
  const [org] = await db
    .insert(organizations)
    .values({ name: 'PJ Org', slug: `pj-${Date.now()}` })
    .returning();
  orgId = org!.id;
  await db.insert(memberships).values({ userId, orgId, role: 'owner' });
});

afterAll(async () => {
  await db.delete(organizations).where(eq(organizations.id, orgId));
  await db.delete(users).where(eq(users.id, userId));
  await pool.end();
});

describe('createProject', () => {
  it('derives a key from the name (initials)', async () => {
    const p = await createProject(userId, orgId, { name: 'Marketing Site' });
    expect(p.key).toBe('MS');
  });

  it('makes the key unique within the org', async () => {
    const p = await createProject(userId, orgId, { name: 'Marketing Stuff' });
    expect(p.key).toBe('MS2'); // MS is taken -> suffixed
  });

  it('rejects an explicit key that collides', async () => {
    await expect(
      createProject(userId, orgId, { name: 'Anything', key: 'MS' }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});
