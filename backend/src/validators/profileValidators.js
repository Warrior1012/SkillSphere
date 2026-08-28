import { z } from 'zod';

export const updateFreelancerProfileSchema = z.object({
  headline: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(2000).optional(),
  skills: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        proficiency: z.enum(['beginner', 'intermediate', 'expert']).optional(),
      })
    )
    .optional(),
  resumeUrl: z.string().trim().url().optional().or(z.literal('')),
  certifications: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        issuer: z.string().trim().optional(),
        year: z.number().int().optional(),
        credentialUrl: z.string().trim().optional(),
      })
    )
    .optional(),
  experience: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        company: z.string().trim().optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
        description: z.string().trim().optional(),
      })
    )
    .optional(),
  pricingModel: z.enum(['hourly', 'milestone', 'both']).optional(),
  hourlyRate: z.number().min(0).optional(),
  weeklyAvailability: z.array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])).optional(),
});

export const updateClientProfileSchema = z.object({
  companyName: z.string().trim().max(150).optional(),
  industry: z.string().trim().max(100).optional(),
  bio: z.string().trim().max(2000).optional(),
});

export const updateUserBasicsSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().optional(),
  avatarUrl: z.string().trim().url().optional().or(z.literal('')),
  city: z.string().trim().optional(),
  address: z.string().trim().optional(),
  coordinates: z.tuple([z.number(), z.number()]).optional(), // [lng, lat]
});
