import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth';
import { setAuthCookie, clearAuthCookie } from '../../lib/cookies';
import { signToken } from '../../lib/jwt';
import { loginSchema, signupSchema } from './auth.schemas';
import { login, signup } from './auth.service';

export const authRouter = Router();

// POST /auth/signup — create an account, start a session.
authRouter.post('/signup', async (req, res) => {
  const input = signupSchema.parse(req.body);
  const user = await signup(input);
  setAuthCookie(res, signToken(user.id));
  res.status(201).json({ user });
});

// POST /auth/login — verify credentials, start a session.
authRouter.post('/login', async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = await login(input);
  setAuthCookie(res, signToken(user.id));
  res.json({ user });
});

// POST /auth/logout — end the session.
authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

// GET /auth/me — the current authenticated user.
authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
