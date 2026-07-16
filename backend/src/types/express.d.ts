import type { Role } from '../db/schema';

/** The authenticated principal, attached by `requireAuth`. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
}

/** The caller's membership in the resolved org, attached by `requireRole`. */
export interface AuthMembership {
  orgId: string;
  role: Role;
}

/** How the request authenticated, set by `requireAuth`. */
export interface AuthContext {
  via: 'cookie' | 'apikey';
  /** For API keys: the org the key is pinned to (requests can't escape it). */
  orgId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      membership?: AuthMembership;
      auth?: AuthContext;
    }
  }
}

export {};
