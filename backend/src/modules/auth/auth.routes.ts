import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth';
import { setAuthCookie, clearAuthCookie } from '../../lib/cookies';
import { signToken } from '../../lib/jwt';
import { unauthorized } from '../../lib/http-errors';
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  tokenSchema,
} from './auth.schemas';
import { login, signup } from './auth.service';
import {
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
} from './verification.service';

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

// POST /auth/verify-email — verify an email address with a token.
authRouter.post('/verify-email', async (req, res) => {
  const { token } = tokenSchema.parse(req.body);
  await verifyEmail(token);
  res.json({ ok: true });
});

// POST /auth/verify-email/request — resend the verification email (auth'd).
authRouter.post('/verify-email/request', requireAuth, async (req, res) => {
  if (!req.user) throw unauthorized();
  if (!req.user.emailVerified) await sendVerificationEmail(req.user.id, req.user.email);
  res.json({ ok: true });
});

// POST /auth/forgot-password — begin a password reset (always 200).
authRouter.post('/forgot-password', async (req, res) => {
  const { email } = forgotPasswordSchema.parse(req.body);
  await requestPasswordReset(email);
  res.json({ ok: true });
});

// POST /auth/reset-password — complete a password reset with a token.
authRouter.post('/reset-password', async (req, res) => {
  const { token, password } = resetPasswordSchema.parse(req.body);
  await resetPassword(token, password);
  res.json({ ok: true });
});
