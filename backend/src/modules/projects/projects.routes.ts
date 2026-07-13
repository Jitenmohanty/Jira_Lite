import { Router } from 'express';
import { requireRole } from '../../middleware/require-role';
import { unauthorized } from '../../lib/http-errors';
import { createProjectSchema, updateProjectSchema } from './projects.schemas';
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from './projects.service';

// mergeParams so :orgId from the mount path is available here.
export const projectsRouter = Router({ mergeParams: true });

// GET /orgs/:orgId/projects — list (member+).
projectsRouter.get('/', requireRole('member'), async (req, res) => {
  const projects = await listProjects(req.params.orgId as string);
  res.json({ projects });
});

// POST /orgs/:orgId/projects — create (admin+).
projectsRouter.post('/', requireRole('admin'), async (req, res) => {
  if (!req.user) throw unauthorized();
  const input = createProjectSchema.parse(req.body);
  const project = await createProject(req.user.id, req.params.orgId as string, input);
  res.status(201).json({ project });
});

// GET /orgs/:orgId/projects/:projectId — get (member+).
projectsRouter.get('/:projectId', requireRole('member'), async (req, res) => {
  const project = await getProject(req.params.orgId as string, req.params.projectId as string);
  res.json({ project });
});

// PATCH /orgs/:orgId/projects/:projectId — update (admin+).
projectsRouter.patch('/:projectId', requireRole('admin'), async (req, res) => {
  if (!req.user) throw unauthorized();
  const input = updateProjectSchema.parse(req.body);
  const project = await updateProject(
    req.user.id,
    req.params.orgId as string,
    req.params.projectId as string,
    input,
  );
  res.json({ project });
});

// DELETE /orgs/:orgId/projects/:projectId — delete (admin+).
projectsRouter.delete('/:projectId', requireRole('admin'), async (req, res) => {
  if (!req.user) throw unauthorized();
  await deleteProject(req.user.id, req.params.orgId as string, req.params.projectId as string);
  res.status(204).send();
});
