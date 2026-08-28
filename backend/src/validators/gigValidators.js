import { z } from 'zod';

const milestoneSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  amount: z.number().min(0),
  dueDate: z.coerce.date().optional(),
});

export const createGigSchema = z.object({
  title: z.string().trim().min(5).max(150),
  description: z.string().trim().min(20).max(5000),
  category: z.string().trim().optional(),
  skillsRequired: z.array(z.string().trim().min(1)).default([]),
  budgetType: z.enum(['fixed', 'hourly']).default('fixed'),
  budgetMin: z.number().min(0).default(0),
  budgetMax: z.number().min(0).default(0),
  milestones: z.array(milestoneSchema).default([]),
  isRemote: z.boolean().default(true),
  city: z.string().trim().optional(),
  coordinates: z.tuple([z.number(), z.number()]).optional(),
});

export const updateGigSchema = createGigSchema.partial();

export const updateMilestoneStatusSchema = z.object({
  note: z.string().trim().max(1000).optional(),
});

export const gigQuerySchema = z.object({
  q: z.string().trim().optional(),
  skill: z.string().trim().optional(),
  minBudget: z.coerce.number().min(0).optional(),
  maxBudget: z.coerce.number().min(0).optional(),
  isRemote: z.coerce.boolean().optional(),
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const createProposalSchema = z.object({
  coverLetter: z.string().trim().min(10).max(3000),
  bidAmount: z.number().min(0),
  estimatedDays: z.number().int().min(1),
});
