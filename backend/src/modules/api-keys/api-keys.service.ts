import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { apiKeys } from '../../db/schema';
import { generateApiKey } from '../../lib/api-key';
import { notFound } from '../../lib/http-errors';
import type { CreateApiKeyInput } from './api-keys.schemas';

/** Metadata safe to return in listings (never the hash or the raw key). */
function toPublic(k: typeof apiKeys.$inferSelect) {
  return {
    id: k.id,
    name: k.name,
    prefix: k.prefix,
    createdAt: k.createdAt,
    lastUsedAt: k.lastUsedAt,
    revokedAt: k.revokedAt,
  };
}

/**
 * Creates a key for an org. Returns the metadata PLUS the raw key — which is
 * shown to the user exactly once and never retrievable again (only its hash is
 * stored).
 */
export async function createApiKey(orgId: string, userId: string, input: CreateApiKeyInput) {
  const { raw, hash, prefix } = generateApiKey();
  const [key] = await db
    .insert(apiKeys)
    .values({ orgId, userId, name: input.name, prefix, keyHash: hash })
    .returning();
  if (!key) throw new Error('Failed to create API key');
  return { ...toPublic(key), key: raw };
}

export async function listApiKeys(orgId: string) {
  const rows = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.orgId, orgId))
    .orderBy(desc(apiKeys.createdAt));
  return rows.map(toPublic);
}

/** Revokes (soft-deletes) a key. Scoped to the org so keys can't be revoked
 *  across tenants. Idempotent-ish: revoking an already-revoked key is a no-op. */
export async function revokeApiKey(orgId: string, keyId: string) {
  const [updated] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.orgId, orgId)))
    .returning();
  if (!updated) throw notFound('API key not found');
  return toPublic(updated);
}
