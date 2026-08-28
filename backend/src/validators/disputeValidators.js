import { z } from 'zod';

export const raiseDisputeSchema = z.object({
  paymentId: z.string().min(1),
  reason: z.string().trim().min(10).max(2000),
  evidenceUrls: z.array(z.string().trim()).default([]),
});

export const resolveDisputeSchema = z.object({
  resolution: z.string().trim().min(5).max(2000),
  action: z.enum(['none', 'released', 'refunded']),
});
