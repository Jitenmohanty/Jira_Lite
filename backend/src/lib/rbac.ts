import type { Role } from '../db/schema';

/** Role hierarchy: higher rank implies all lower-rank permissions. */
const RANK: Record<Role, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

/** True if `role` satisfies the `required` minimum role. */
export function roleSatisfies(role: Role, required: Role): boolean {
  return RANK[role] >= RANK[required];
}
