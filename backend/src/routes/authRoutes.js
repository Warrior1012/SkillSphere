import { Router } from 'express';
import passport from '../config/passport.js';
import { isGoogleOAuthConfigured } from '../config/passport.js';

import { protect } from '../middleware/auth.js';
import { requireDb } from '../middleware/requireDb.js';
import { validate } from '../middleware/validate.js';
import { loginLimiter, registerLimiter, passwordResetLimiter } from '../middleware/rateLimiters.js';

import {
  registerSchema,
  loginSchema,
  verify2FALoginSchema,
  enable2FASchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/authValidators.js';

import {
  register,
  login,
  verify2FALogin,
  refresh,
  logout,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  setup2FA,
  enable2FA,
  disable2FA,
  getMe,
  googleCallbackSession,
} from '../controllers/authController.js';
import { env } from '../config/env.js';

const router = Router();

router.post('/register', registerLimiter, validate(registerSchema), requireDb, register);
router.post('/login', loginLimiter, validate(loginSchema), requireDb, login);
router.post('/2fa/verify-login', loginLimiter, validate(verify2FALoginSchema), requireDb, verify2FALogin);

router.post('/refresh', requireDb, refresh);
router.post('/logout', logout); // degrades gracefully without DB — see controller

router.get('/verify-email/:token', requireDb, verifyEmail);
router.post('/resend-verification', requireDb, protect, resendVerification);

router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), requireDb, forgotPassword);
router.post('/reset-password/:token', passwordResetLimiter, validate(resetPasswordSchema), requireDb, resetPassword);

router.post('/2fa/setup', requireDb, protect, setup2FA);
router.post('/2fa/enable', requireDb, protect, validate(enable2FASchema), enable2FA);
router.post('/2fa/disable', requireDb, protect, disable2FA);

router.get('/me', requireDb, protect, getMe);

// --- Google OAuth ---
// Deliberately NOT gated by requireDb: the initial redirect to Google
// touches no database, and "OAuth isn't configured" is a more specific,
// more actionable error than "database is down" — checking it first means
// that's the message an operator actually sees.
router.get('/google', (req, res, next) => {
  if (!isGoogleOAuthConfigured) {
    return res.status(501).json({ success: false, message: 'Google OAuth is not configured on this server' });
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

router.get('/google/callback', requireDb, (req, res, next) => {
  if (!isGoogleOAuthConfigured) {
    return res.status(501).json({ success: false, message: 'Google OAuth is not configured on this server' });
  }
  passport.authenticate('google', { session: false, failureRedirect: `${env.CLIENT_URL}/login?error=google` }, async (err, user) => {
    if (err || !user) {
      return res.redirect(`${env.CLIENT_URL}/login?error=google`);
    }
    await googleCallbackSession(user, res);
  })(req, res, next);
});

export default router;
