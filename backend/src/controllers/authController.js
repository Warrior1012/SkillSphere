import mongoose from 'mongoose';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

import User from '../models/User.js';
import FreelancerProfile from '../models/FreelancerProfile.js';
import ClientProfile from '../models/ClientProfile.js';

import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { sendEmail } from '../utils/email.js';
import { generateRawAndHashedToken, hashToken } from '../utils/tokens.js';
import {
  signAccessToken,
  signRefreshToken,
  signTwoFactorPendingToken,
  verifyRefreshToken,
  verifyTwoFactorPendingToken,
} from '../utils/jwt.js';
import { env } from '../config/env.js';

const REFRESH_COOKIE_NAME = 'ss_refresh';
const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth',
};

async function issueSession(user, res) {
  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTS);
  return accessToken;
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, city } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'Email is already registered');

  const session = await mongoose.startSession();
  let user;
  try {
    await session.withTransaction(async () => {
      const created = await User.create(
        [{ name, email, password, role, phone, location: { city: city || '' } }],
        { session }
      );
      user = created[0];

      if (role === 'freelancer') {
        await FreelancerProfile.create([{ user: user._id }], { session });
      } else if (role === 'client') {
        await ClientProfile.create([{ user: user._id }], { session });
      }
    });
  } finally {
    await session.endSession();
  }

  const { raw, hash } = generateRawAndHashedToken();
  user.emailVerificationTokenHash = hash;
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  const verifyUrl = `${env.CLIENT_URL}/verify-email/${raw}`;
  await sendEmail({
    to: user.email,
    subject: 'Verify your SkillSphere account',
    html: `<p>Welcome to SkillSphere, ${user.name}.</p><p>Verify your email to unlock posting gigs and payments:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 24 hours.</p>`,
  });

  res
    .status(201)
    .json(new ApiResponse(201, { user: user.toSafeJSON() }, 'Registered. Check your email to verify your account.'));
});

// ---------------------------------------------------------------------------
// Login (password step — may hand back a 2FA challenge instead of a session)
// ---------------------------------------------------------------------------
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password +twoFactorSecret');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (user.isSuspended) throw new ApiError(403, 'This account has been suspended');

  if (user.twoFactorEnabled) {
    const tempToken = signTwoFactorPendingToken(user._id);
    return res.json(new ApiResponse(200, { requires2FA: true, tempToken }, 'Enter your 2FA code to continue'));
  }

  const accessToken = await issueSession(user, res);
  user.lastLoginAt = new Date();
  await user.save();

  res.json(new ApiResponse(200, { user: user.toSafeJSON(), accessToken }, 'Login successful'));
});

// ---------------------------------------------------------------------------
// Login step 2 — 2FA code
// ---------------------------------------------------------------------------
export const verify2FALogin = asyncHandler(async (req, res) => {
  const { tempToken, code } = req.body;

  let decoded;
  try {
    decoded = verifyTwoFactorPendingToken(tempToken);
  } catch {
    throw new ApiError(401, 'This 2FA challenge has expired. Log in again.');
  }
  if (decoded.type !== '2fa_pending') throw new ApiError(401, 'Invalid challenge token');

  const user = await User.findById(decoded.sub).select('+twoFactorSecret');
  if (!user || !user.twoFactorEnabled) throw new ApiError(401, 'Invalid challenge');

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: code,
    window: 1,
  });
  if (!verified) throw new ApiError(400, 'Invalid or expired code');

  const accessToken = await issueSession(user, res);
  user.lastLoginAt = new Date();
  await user.save();

  res.json(new ApiResponse(200, { user: user.toSafeJSON(), accessToken }, 'Login successful'));
});

// ---------------------------------------------------------------------------
// Refresh / logout
// ---------------------------------------------------------------------------
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) throw new ApiError(401, 'No refresh token');

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    throw new ApiError(401, 'Refresh token expired — log in again');
  }

  const user = await User.findById(decoded.sub).select('+refreshTokenHash');
  if (!user || user.refreshTokenHash !== hashToken(token)) {
    // Hash mismatch means the stored token was rotated/revoked elsewhere —
    // treat as compromised rather than silently re-trusting it.
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    throw new ApiError(401, 'Session no longer valid — log in again');
  }

  const accessToken = await issueSession(user, res); // rotates the refresh token too
  res.json(new ApiResponse(200, { user: user.toSafeJSON(), accessToken }, 'Session refreshed'));
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (token) {
    try {
      const decoded = verifyRefreshToken(token);
      await User.findByIdAndUpdate(decoded.sub, { $unset: { refreshTokenHash: 1 } });
    } catch {
      // token already invalid/expired — nothing to revoke, fall through
    }
  }
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
  res.json(new ApiResponse(200, null, 'Logged out'));
});

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const hash = hashToken(token);

  const user = await User.findOne({
    emailVerificationTokenHash: hash,
    emailVerificationExpires: { $gt: new Date() },
  }).select('+emailVerificationTokenHash +emailVerificationExpires');

  if (!user) throw new ApiError(400, 'Verification link is invalid or has expired');

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  res.json(new ApiResponse(200, null, 'Email verified'));
});

export const resendVerification = asyncHandler(async (req, res) => {
  const user = req.user;
  if (user.isEmailVerified) throw new ApiError(400, 'Email is already verified');

  const { raw, hash } = generateRawAndHashedToken();
  user.emailVerificationTokenHash = hash;
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  const verifyUrl = `${env.CLIENT_URL}/verify-email/${raw}`;
  await sendEmail({
    to: user.email,
    subject: 'Verify your SkillSphere account',
    html: `<p>Verify your email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });

  res.json(new ApiResponse(200, null, 'Verification email sent'));
});

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Same response whether or not the account exists — don't leak which
  // emails are registered.
  const genericMessage = 'If that email is registered, a reset link has been sent';

  if (!user) return res.json(new ApiResponse(200, null, genericMessage));

  const { raw, hash } = generateRawAndHashedToken();
  user.passwordResetTokenHash = hash;
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  const resetUrl = `${env.CLIENT_URL}/reset-password/${raw}`;
  await sendEmail({
    to: user.email,
    subject: 'Reset your SkillSphere password',
    html: `<p>Reset your password (expires in 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, ignore this email.</p>`,
  });

  res.json(new ApiResponse(200, null, genericMessage));
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  const hash = hashToken(token);

  const user = await User.findOne({
    passwordResetTokenHash: hash,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpires');

  if (!user) throw new ApiError(400, 'Reset link is invalid or has expired');

  user.password = password; // pre-save hook rehashes
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokenHash = undefined; // password change invalidates all sessions
  await user.save();

  res.json(new ApiResponse(200, null, 'Password reset — log in with your new password'));
});

// ---------------------------------------------------------------------------
// Two-factor authentication (setup happens post-login, in account settings)
// ---------------------------------------------------------------------------
export const setup2FA = asyncHandler(async (req, res) => {
  const secret = speakeasy.generateSecret({ name: `SkillSphere (${req.user.email})` });

  req.user.twoFactorSecret = secret.base32; // stored but not "enabled" until confirmed below
  await req.user.save();

  const qrDataUrl = await qrcode.toDataURL(secret.otpauth_url);
  res.json(new ApiResponse(200, { qrCode: qrDataUrl, secret: secret.base32 }, 'Scan the QR code, then confirm with a code to enable 2FA'));
});

export const enable2FA = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const user = await User.findById(req.user._id).select('+twoFactorSecret');
  if (!user.twoFactorSecret) throw new ApiError(400, 'Call /2fa/setup first');

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: code,
    window: 1,
  });
  if (!verified) throw new ApiError(400, 'Invalid code');

  user.twoFactorEnabled = true;
  await user.save();
  res.json(new ApiResponse(200, null, '2FA enabled'));
});

export const disable2FA = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  await user.save();
  res.json(new ApiResponse(200, null, '2FA disabled'));
});

// ---------------------------------------------------------------------------
// Google OAuth callback — passport has already attached req.user by the time
// this runs (see routes/authRoutes.js). Issues a full session, same as a
// normal login, then redirects back to the frontend with a short-lived
// one-time access token in the URL for the SPA to pick up.
// ---------------------------------------------------------------------------
export const googleCallbackSession = async (user, res) => {
  const accessToken = await issueSession(user, res);
  user.lastLoginAt = new Date();
  await user.save();
  res.redirect(`${env.CLIENT_URL}/oauth/callback?token=${accessToken}`);
};

// ---------------------------------------------------------------------------
// Current user
// ---------------------------------------------------------------------------
export const getMe = asyncHandler(async (req, res) => {
  res.json(new ApiResponse(200, { user: req.user.toSafeJSON() }));
});
