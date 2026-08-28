import crypto from 'crypto';

export function generateRawAndHashedToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

export function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
