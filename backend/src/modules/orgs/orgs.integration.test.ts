import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, inArray } from 'drizzle-orm';
import { db, pool } from '../../db/client';
import { memberships, organizations, users } from '../../db/schema';
import { addMember, changeRole, createOrg } from './orgs.service';

let ownerId: string;
let memberUserId: string;
const orgIds: string[] = [];

beforeAll(async () => {
  const [owner] = await db
    .insert(users)
    .values({ email: `owner+${Date.now()}@t.dev`, name: 'Owner', passwordHash: 'x' })
    .returning();
  ownerId = owner!.id;
  const [m] = await db
    .insert(users)
    .values({ email: `mem+${Date.now()}@t.dev`, name: 'Mem', passwordHash: 'x' })
    .returning();
  memberUserId = m!.id;
});

afterAll(async () => {
  if (orgIds.length) await db.delete(organizations).where(inArray(organizations.id, orgIds));
  await db.delete(users).where(inArray(users.id, [ownerId, memberUserId]));
  await pool.end();
});

describe('createOrg', () => {
  it('makes the creator an owner and generates a unique slug', async () => {
    const org1 = await createOrg(ownerId, { name: 'Acme Co' });
    orgIds.push(org1.id);
    expect(org1.role).toBe('owner');

    const membership = await db.query.memberships.findFirst({
      where: and(eq(memberships.userId, ownerId), eq(memberships.orgId, org1.id)),
    });
    expect(membership?.role).toBe('owner');

    // Same name again -> slug must differ.
    const org2 = await createOrg(ownerId, { name: 'Acme Co' });
    orgIds.push(org2.id);
    expect(org2.slug).not.toBe(org1.slug);
  });
});

describe('membership management', () => {
  it('adds a member, rejects duplicates and unknown emails', async () => {
    const org = await createOrg(ownerId, { name: 'Members Org' });
    orgIds.push(org.id);
    const memberEmail = (await db.query.users.findFirst({
      where: eq(users.id, memberUserId),
      columns: { email: true },
    }))!.email;

    const added = await addMember(ownerId, org.id, { email: memberEmail, role: 'member' });
    expect(added.role).toBe('member');

    await expect(
      addMember(ownerId, org.id, { email: memberEmail, role: 'member' }),
    ).rejects.toMatchObject({ statusCode: 409 });

    await expect(
      addMember(ownerId, org.id, { email: 'nobody@nowhere.dev', role: 'member' }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('promotes a member and guards the last owner', async () => {
    const org = await createOrg(ownerId, { name: 'Guard Org' });
    orgIds.push(org.id);
    const memberEmail = (await db.query.users.findFirst({
      where: eq(users.id, memberUserId),
      columns: { email: true },
    }))!.email;
    await addMember(ownerId, org.id, { email: memberEmail, role: 'member' });

    const promoted = await changeRole(ownerId, org.id, memberUserId, { role: 'admin' });
    expect(promoted.role).toBe('admin');

    // The sole owner cannot be demoted.
    await expect(
      changeRole(ownerId, org.id, ownerId, { role: 'member' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
