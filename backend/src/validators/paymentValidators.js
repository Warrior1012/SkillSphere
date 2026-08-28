import { z } from 'zod';

export const fundPaymentSchema = z.object({
  gigId: z.string().min(1),
  milestoneId: z.string().optional(),
  amount: z.number().positive(),
});

export const confirmPaymentSchema = z.object({
  razorpayPaymentId: z.string().optional(),
  razorpaySignature: z.string().optional(),
});
