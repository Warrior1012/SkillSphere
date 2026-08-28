import dotenv from 'dotenv';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

const DEV_ONLY_ACCESS_SECRET = 'dev-only-access-secret-do-not-use-in-prod';
const DEV_ONLY_REFRESH_SECRET = 'dev-only-refresh-secret-do-not-use-in-prod';

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  MONGO_URI: process.env.MONGO_URI || '',

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || DEV_ONLY_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || DEV_ONLY_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',

  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'no-reply@skillsphere.local',

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',

  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
  PAYMENT_CURRENCY: process.env.PAYMENT_CURRENCY || 'usd',

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
};

// Fail loudly, not silently. A blank Mongo URI or a dev JWT secret in
// production is a data-integrity / security incident waiting to happen —
// crash on boot instead of limping along.
export function assertBootSafety() {
  const problems = [];
  if (!env.MONGO_URI) problems.push('MONGO_URI is not set — no route touching the database will work.');
  if (isProd && env.JWT_ACCESS_SECRET === DEV_ONLY_ACCESS_SECRET) {
    problems.push('JWT_ACCESS_SECRET is unset in production — refusing to boot with the dev fallback.');
  }
  if (isProd && env.JWT_REFRESH_SECRET === DEV_ONLY_REFRESH_SECRET) {
    problems.push('JWT_REFRESH_SECRET is unset in production — refusing to boot with the dev fallback.');
  }

  if (problems.length) {
    problems.forEach((p) => console.warn(`[boot] ${p}`));
    if (isProd) {
      throw new Error('Refusing to start in production with missing critical configuration. See warnings above.');
    }
  }
}
