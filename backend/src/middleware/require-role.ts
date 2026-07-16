import type { Request, RequestHandler } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { memberships } from '../db/schema';
import type { Role } from '../db/schema';
import { roleSatisfies } from '../lib/rbac';
import { forbidden, unauthorized } from '../lib/http-errors';

/** Resolves the target org id for an RBAC check from the request. */
export type OrgResolver = (req: Request) => string | undefined | Promise<string | undefined>;

const orgIdFromParams: OrgResolver = (req) => {
  const value = req.params.orgId;
  return typeof value === 'string' ? value : undefined;
};

/**
 * Guards a route by minimum role within the target org. Must run after
 * `requireAuth`. Loads the caller's membership for the resolved org, verifies
 * the role hierarchy (owner > admin > member), and attaches `req.membership`.
 *
 * The org is resolved from `req.params.orgId` by default; pass a custom
 * resolver for routes scoped by a different id (e.g. project or issue).
 */
export function requireRole(minRole: Role, resolveOrgId: OrgResolver = orgIdFromParams): RequestHandler {
  return async (req, _res, next) => {
    if (!req.user) throw unauthorized();

    const orgId = await resolveOrgId(req);
    if (!orgId) throw forbidden('Organization context is required');

    // An API key is pinned to one org — reject any attempt to use it against a
    // different org, even if the owning user is a member of that other org.
    if (req.auth?.via === 'apikey' && req.auth.orgId !== orgId) {
      throw forbidden('This API key is scoped to a different organization');
    }

    const membership = await db.query.memberships.findFirst({
      where: and(eq(memberships.userId, req.user.id), eq(memberships.orgId, orgId)),
      columns: { role: true, orgId: true },
    });
    if (!membership) throw forbidden('You are not a member of this organization');

    if (!roleSatisfies(membership.role as Role, minRole)) {
      throw forbidden(`Requires ${minRole} role or higher`);
    }

    req.membership = { orgId: membership.orgId, role: membership.role as Role };
    next();
  };
}
