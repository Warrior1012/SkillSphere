import { z } from 'zod';

const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be under 72 characters') // bcrypt's hard limit
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[0-9]/, 'Password must include a number');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(100),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: passwordRule,
  // Admin accounts are never created through public registration.
  role: z.enum(['client', 'freelancer']),
  phone: z.string().trim().optional(),
  city: z.string().trim().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const verify2FALoginSchema = z.object({
  tempToken: z.string().min(1),
  code: z.string().length(6, 'Code must be 6 digits'),
});

export const enable2FASchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  password: passwordRule,
});
