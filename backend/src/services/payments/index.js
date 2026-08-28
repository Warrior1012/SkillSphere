import { env } from '../../config/env.js';
import { mockProvider } from './mockProvider.js';
import { stripeProvider } from './stripeProvider.js';
import { razorpayProvider } from './razorpayProvider.js';

export function getPaymentProvider() {
  if (env.STRIPE_SECRET_KEY) return stripeProvider;
  if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) return razorpayProvider;
  return mockProvider;
}
