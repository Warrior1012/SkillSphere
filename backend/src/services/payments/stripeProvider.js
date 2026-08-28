import Stripe from 'stripe';
import { env } from '../../config/env.js';

/**
 * ============================================================================
 * READ THIS BEFORE ENABLING IN PRODUCTION
 * ============================================================================
 * Stripe's own documentation is explicit: "Escrow has a precise legal
 * definition, and Stripe doesn't provide escrow services or support escrow
 * accounts." What this adapter actually does is authorize-then-manually-
 * capture a PaymentIntent, which holds funds for a LIMITED window — 7 days
 * by default, up to 30 with Extended Authorizations (a paid Stripe feature).
 * That's fine for a fast-turnaround gig; it is NOT fine for a milestone that
 * might take six weeks. For real fund-holding across longer timelines, the
 * correct architecture is Stripe Connect with delayed payouts to connected
 * freelancer accounts — a materially bigger integration (KYC onboarding,
 * connected accounts, split transfers) that is NOT built here.
 *
 * This code has never been run against a live or test-mode Stripe account —
 * this build environment cannot reach api.stripe.com. Verify against current
 * Stripe docs and test thoroughly with test-mode keys before relying on it.
 * ============================================================================
 */

let stripeClient = null;
function getClient() {
  if (!stripeClient) {
    if (!env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured');
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

export const stripeProvider = {
  name: 'stripe',

  async createOrder({ amount, currency, receiptId }) {
    const stripe = getClient();
    // capture_method: 'manual' is the "hold, don't charge yet" step.
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe uses the smallest currency unit
      currency,
      capture_method: 'manual',
      metadata: { receiptId },
    });
    return { providerOrderId: intent.id, clientSecret: intent.client_secret, amount, currency };
  },

  /** Frontend confirms the PaymentIntent client-side with Stripe.js; this checks server-side that it actually succeeded before we trust it. */
  async confirmPayment({ providerOrderId }) {
    const stripe = getClient();
    const intent = await stripe.paymentIntents.retrieve(providerOrderId);
    if (intent.status !== 'requires_capture' && intent.status !== 'succeeded') {
      throw new Error(`PaymentIntent not ready to capture (status: ${intent.status})`);
    }
    return { providerPaymentId: intent.id, verified: true };
  },

  async release({ providerPaymentId }) {
    const stripe = getClient();
    const captured = await stripe.paymentIntents.capture(providerPaymentId);
    return { released: captured.status === 'succeeded', providerTransferId: captured.id };
    // NOTE: this captures funds into the PLATFORM's Stripe balance. Getting
    // money to the freelancer from there requires Stripe Connect (see
    // docstring above) — that payout leg is not implemented.
  },

  async refund({ providerPaymentId }) {
    const stripe = getClient();
    const refund = await stripe.refunds.create({ payment_intent: providerPaymentId });
    return { refunded: refund.status === 'succeeded' || refund.status === 'pending', providerRefundId: refund.id };
  },
};
