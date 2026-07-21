import { and, count, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { memberships, organizations, users, type Role } from '../../db/schema';
import { badRequest, conflict, notFound } from '../../lib/http-errors';
import { isUniqueViolation } from '../../lib/db-errors';
import { recordActivity } from '../../lib/activity';
import { slugify } from '../../lib/slug';
import type { AddMemberInput, ChangeRoleInput, CreateOrgInput } from './orgs.schemas';

/** Finds a slug not yet taken, starting from the base and appending -2, -3, ... */
async function ensureUniqueSlug(base: string): Promise<string> {
  const root = base || 'org';
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const existing = await db.query.organizations.findFirst({
      where: eq(organizations.slug, candidate),
      columns: { id: true },
    });
    if (!existing) return candidate;
  }
  // Extremely unlikely; fall back to a timestamped-ish suffix.
  return `${root}-${Math.floor(Math.random() * 1e6)}`;
}

export async function createOrg(userId: string, input: CreateOrgInput) {
  if (input.slug) {
    const taken = await db.query.organizations.findFirst({
      where: eq(organizations.slug, input.slug),
      columns: { id: true },
    });
    if (taken) throw conflict('That slug is already taken');
  }
  const slug = input.slug ?? (await ensureUniqueSlug(slugify(input.name)));

  try {
    return await db.transaction(async (tx) => {
      const [org] = await tx
        .insert(organizations)
        .values({ name: input.name, slug })
        .returning();
      if (!org) throw new Error('Failed to create organization');

      // The creator becomes the owner.
      await tx.insert(memberships).values({ userId, orgId: org.id, role: 'owner' });

      await recordActivity(tx, {
        orgId: org.id,
        actorId: userId,
        entityType: 'organization',
        entityId: org.id,
        action: 'org.created',
        metadata: { name: org.name },
      });

      return { ...org, role: 'owner' as Role };
    });
  } catch (err) {
    // Lost the slug race after the check above; the unique index catches it.
    if (isUniqueViolation(err)) throw conflict('That slug is already taken');
    throw err;
  }
}

/** Orgs the user belongs to, with their role in each. */
export async function listMyOrgs(userId: string) {
  const rows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      createdAt: organizations.createdAt,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.orgId, organizations.id))
    .where(eq(memberships.userId, userId))
    .orderBy(organizations.createdAt);
  return rows;
}

export async function listMembers(orgId: string) {
  return db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      role: memberships.role,
      joinedAt: memberships.createdAt,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.orgId, orgId))
    .orderBy(memberships.createdAt);
}

export async function addMember(actorId: string, orgId: string, input: AddMemberInput) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, input.email),
    columns: { id: true, name: true, email: true },
  });
  // No email delivery in this app: "inviting" adds an existing account by email.
  if (!user) throw notFound('No user with that email. They must create an account first.');

  const existing = await db.query.memberships.findFirst({
    where: and(eq(memberships.userId, user.id), eq(memberships.orgId, orgId)),
    columns: { userId: true },
  });
  if (existing) throw conflict('That user is already a member');

  try {
    return await db.transaction(async (tx) => {
      await tx.insert(memberships).values({ userId: user.id, orgId, role: input.role });
      await recordActivity(tx, {
        orgId,
        actorId,
        entityType: 'membership',
        entityId: user.id,
        action: 'member.added',
        metadata: { email: user.email, role: input.role },
      });
      return { userId: user.id, name: user.name, email: user.email, role: input.role };
    });
  } catch (err) {
    // Lost the race with a concurrent add; the (user_id, org_id) PK catches it.
    if (isUniqueViolation(err)) throw conflict('That user is already a member');
    throw err;
  }
}

export async function changeRole(
  actorId: string,
  orgId: string,
  targetUserId: string,
  input: ChangeRoleInput,
) {
  const target = await db.query.memberships.findFirst({
    where: and(eq(memberships.userId, targetUserId), eq(memberships.orgId, orgId)),
    columns: { role: true },
  });
  if (!target) throw notFound('That user is not a member of this organization');

  // Guard: never leave an org without an owner.
  if (target.role === 'owner' && input.role !== 'owner') {
    const [owners] = await db
      .select({ n: count() })
      .from(memberships)
      .where(and(eq(memberships.orgId, orgId), eq(memberships.role, 'owner')));
    if ((owners?.n ?? 0) <= 1) {
      throw badRequest('An organization must have at least one owner');
    }
  }

  if (target.role === input.role) throw badRequest('User already has that role');

  return db.transaction(async (tx) => {
    await tx
      .update(memberships)
      .set({ role: input.role })
      .where(and(eq(memberships.userId, targetUserId), eq(memberships.orgId, orgId)));
    await recordActivity(tx, {
      orgId,
      actorId,
      entityType: 'membership',
      entityId: targetUserId,
      action: 'member.role_changed',
      metadata: { from: target.role, to: input.role },
    });
    return { userId: targetUserId, role: input.role };
  });
}
