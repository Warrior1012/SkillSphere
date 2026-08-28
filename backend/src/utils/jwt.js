import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const signAccessToken = (userId) =>
  jwt.sign({ sub: String(userId), type: 'access' }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES,
  });

export const signRefreshToken = (userId) =>
  jwt.sign({ sub: String(userId), type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES,
  });

// Short-lived token issued after password check when 2FA is enabled, so the
// client can prove "I already passed step 1" without getting a real session.
export const signTwoFactorPendingToken = (userId) =>
  jwt.sign({ sub: String(userId), type: '2fa_pending' }, env.JWT_ACCESS_SECRET, {
    expiresIn: '5m',
  });

export const verifyAccessToken = (token) => jwt.verify(token, env.JWT_ACCESS_SECRET);
export const verifyRefreshToken = (token) => jwt.verify(token, env.JWT_REFRESH_SECRET);
export const verifyTwoFactorPendingToken = (token) => jwt.verify(token, env.JWT_ACCESS_SECRET);
