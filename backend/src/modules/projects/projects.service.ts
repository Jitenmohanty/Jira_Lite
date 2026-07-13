import { and, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { projects } from '../../db/schema';
import { conflict, notFound } from '../../lib/http-errors';
import { recordActivity } from '../../lib/activity';
import type { CreateProjectInput, UpdateProjectInput } from './projects.schemas';

/** Derives a project key from its name: initials for multi-word, else a prefix. */
function keyFromName(name: string): string {
  const words = name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  const base =
    words.length >= 2 ? words.slice(0, 3).map((w) => w[0]).join('') : (words[0] ?? 'PRJ').slice(0, 4);
  return (base || 'PRJ').slice(0, 10);
}

async function ensureUniqueKey(orgId: string, base: string): Promise<string> {
  for (let i = 0; i < 100; i++) {
    const candidate = i === 0 ? base : `${base}${i + 1}`.slice(0, 10);
    const existing = await db.query.projects.findFirst({
      where: and(eq(projects.orgId, orgId), eq(projects.key, candidate)),
      columns: { id: true },
    });
    if (!existing) return candidate;
  }
  return `${base}${Math.floor(Math.random() * 1000)}`.slice(0, 10);
}

export async function listProjects(orgId: string) {
  return db.query.projects.findMany({
    where: eq(projects.orgId, orgId),
    orderBy: (p, { asc }) => asc(p.createdAt),
  });
}

export async function getProject(orgId: string, projectId: string) {
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.orgId, orgId)),
  });
  if (!project) throw notFound('Project not found');
  return project;
}

export async function createProject(actorId: string, orgId: string, input: CreateProjectInput) {
  let key: string;
  if (input.key) {
    const taken = await db.query.projects.findFirst({
      where: and(eq(projects.orgId, orgId), eq(projects.key, input.key)),
      columns: { id: true },
    });
    if (taken) throw conflict('A project with that key already exists in this organization');
    key = input.key;
  } else {
    key = await ensureUniqueKey(orgId, keyFromName(input.name));
  }

  return db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({ orgId, name: input.name, key, description: input.description ?? null })
      .returning();
    if (!project) throw new Error('Failed to create project');

    await recordActivity(tx, {
      orgId,
      actorId,
      entityType: 'project',
      entityId: project.id,
      action: 'project.created',
      metadata: { name: project.name, key: project.key },
    });
    return project;
  });
}

export async function updateProject(
  actorId: string,
  orgId: string,
  projectId: string,
  input: UpdateProjectInput,
) {
  await getProject(orgId, projectId); // 404 if missing / wrong org

  return db.transaction(async (tx) => {
    const [project] = await tx
      .update(projects)
      .set(input)
      .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)))
      .returning();
    if (!project) throw notFound('Project not found');

    await recordActivity(tx, {
      orgId,
      actorId,
      entityType: 'project',
      entityId: project.id,
      action: 'project.updated',
      metadata: { changed: Object.keys(input) },
    });
    return project;
  });
}

export async function deleteProject(actorId: string, orgId: string, projectId: string) {
  const project = await getProject(orgId, projectId);

  await db.transaction(async (tx) => {
    await tx.delete(projects).where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)));
    await recordActivity(tx, {
      orgId,
      actorId,
      entityType: 'project',
      entityId: projectId,
      action: 'project.deleted',
      metadata: { name: project.name, key: project.key },
    });
  });
}
