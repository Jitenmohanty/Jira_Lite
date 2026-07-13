import { Router } from 'express';
import { requireRole } from '../../middleware/require-role';
import { unauthorized } from '../../lib/http-errors';
import { addMemberSchema, changeRoleSchema, createOrgSchema } from './orgs.schemas';
import { addMember, changeRole, createOrg, listMembers, listMyOrgs } from './orgs.service';

// requireAuth is applied at the mount point in app.ts.
export const orgsRouter = Router();

// POST /orgs — create an org (creator becomes owner).
orgsRouter.post('/', async (req, res) => {
  if (!req.user) throw unauthorized();
  const input = createOrgSchema.parse(req.body);
  const org = await createOrg(req.user.id, input);
  res.status(201).json({ org });
});

// GET /orgs — orgs the caller belongs to.
orgsRouter.get('/', async (req, res) => {
  if (!req.user) throw unauthorized();
  const orgs = await listMyOrgs(req.user.id);
  res.json({ orgs });
});

// GET /orgs/:orgId/members — any member may view the roster.
orgsRouter.get('/:orgId/members', requireRole('member'), async (req, res) => {
  const members = await listMembers(req.params.orgId as string);
  res.json({ members });
});

// POST /orgs/:orgId/members — add an existing user by email (admin+).
orgsRouter.post('/:orgId/members', requireRole('admin'), async (req, res) => {
  if (!req.user) throw unauthorized();
  const input = addMemberSchema.parse(req.body);
  const member = await addMember(req.user.id, req.params.orgId as string, input);
  res.status(201).json({ member });
});

// PATCH /orgs/:orgId/members/:userId — change a member's role (owner only).
orgsRouter.patch('/:orgId/members/:userId', requireRole('owner'), async (req, res) => {
  if (!req.user) throw unauthorized();
  const input = changeRoleSchema.parse(req.body);
  const member = await changeRole(
    req.user.id,
    req.params.orgId as string,
    req.params.userId as string,
    input,
  );
  res.json({ member });
});
