import { z } from 'zod';

export const startConversationSchema = z.object({
  recipientId: z.string().min(1),
  gigId: z.string().optional(),
});

export const sendMessageSchema = z.object({
  text: z.string().trim().max(5000).default(''),
  attachments: z.array(z.object({ name: z.string(), url: z.string() })).default([]),
});

export const createReviewSchema = z.object({
  gigId: z.string().min(1),
  revieweeId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});
