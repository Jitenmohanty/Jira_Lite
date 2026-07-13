import { activity } from '../db/schema';
import { db } from '../db/client';

/** db or a transaction handle — both expose the query builder we need. */
type Database = typeof db;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
export type Executor = Database | Transaction;

export type EntityType = 'organization' | 'project' | 'issue' | 'comment' | 'membership';

export interface ActivityInput {
  orgId: string;
  actorId: string;
  entityType: EntityType;
  entityId: string;
  action: string;
  metadata?: Record<string, unknown>;
}

/**
 * Appends a row to the activity log. Accepts a transaction so it can be written
 * atomically with the mutation it records. Every mutating action calls this.
 */
export async function recordActivity(exec: Executor, input: ActivityInput): Promise<void> {
  await exec.insert(activity).values({
    orgId: input.orgId,
    actorId: input.actorId,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    metadata: input.metadata ?? {},
  });
}
