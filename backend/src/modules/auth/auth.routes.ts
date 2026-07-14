import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth';
import { setAuthCookie, clearAuthCookie } from '../../lib/cookies';
import { CSRF_COOKIE, issueCsrfToken } from '../../lib/csrf';
import { signToken } from '../../lib/jwt';
import { unauthorized } from '../../lib/http-errors';
import { env, isProd } from '../../config/env';
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
import {
  buildGoogleAuthUrl,
  exchangeGoogleCode,
  generateState,
  isGoogleConfigured,
  upsertGoogleUser,
} from './oauth.service';

export const authRouter = Router();

const OAUTH_STATE_COOKIE = 'oauth_state';

// GET /auth/csrf — issue/refresh the double-submit CSRF token cookie.
authRouter.get('/csrf', (req, res) => {
  const token = issueCsrfToken(res, req.cookies?.[CSRF_COOKIE]);
  res.json({ csrfToken: token });
});

// POST /auth/signup — create an account, start a session.
authRouter.post('/signup', async (req, res) => {
  const input = signupSchema.parse(req.body);
  const user = await signup(input);
  setAuthCookie(res, signToken(user.id));
  issueCsrfToken(res);
  res.status(201).json({ user });
});

// POST /auth/login — verify credentials, start a session.
authRouter.post('/login', async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = await login(input);
  setAuthCookie(res, signToken(user.id));
  issueCsrfToken(res);
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

// GET /auth/config — public feature flags the frontend uses to render options.
authRouter.get('/config', (_req, res) => {
  res.json({ google: isGoogleConfigured() });
});

// GET /auth/google — start the Google OAuth2 flow.
authRouter.get('/google', (_req, res) => {
  if (!isGoogleConfigured()) {
    res.redirect(`${env.APP_URL}/login?error=oauth_unavailable`);
    return;
  }
  const state = generateState();
  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 10 * 60 * 1000,
    path: '/',
  });
  res.redirect(buildGoogleAuthUrl(state));
});

// GET /auth/google/callback — verify state, exchange code, start a session.
authRouter.get('/google/callback', async (req, res) => {
  const { code, state } = req.query as { code?: string; state?: string };
  const cookieState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;
  res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });

  // CSRF: the returned state must match the one we stored.
  if (!code || !state || !cookieState || state !== cookieState) {
    res.redirect(`${env.APP_URL}/login?error=oauth`);
    return;
  }
  try {
    const profile = await exchangeGoogleCode(code);
    const user = await upsertGoogleUser(profile);
    setAuthCookie(res, signToken(user.id));
    issueCsrfToken(res);
    res.redirect(`${env.APP_URL}/app`);
  } catch {
    res.redirect(`${env.APP_URL}/login?error=oauth`);
  }
});
