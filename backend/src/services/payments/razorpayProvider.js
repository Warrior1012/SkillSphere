import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../../config/env.js';

/**
 * ============================================================================
 * READ THIS BEFORE ENABLING IN PRODUCTION
 * ============================================================================
 * Same fundamental limitation as Stripe (see stripeProvider.js): Razorpay
 * doesn't offer indefinite escrow either. Authorized-but-uncaptured payments
 * are auto-refunded within a few days if not captured (Razorpay's docs cite
 * figures from 3-5 days depending on account configuration — check your
 * dashboard's capture settings for the current number). For real
 * marketplace fund-splitting across longer milestone timelines, the
 * intended tool is Razorpay Route (transfers to linked sub-merchant
 * accounts) — not built here.
 *
 * This code has never been run against a live or test-mode Razorpay account
 * — this build environment cannot reach api.razorpay.com. Verify against
 * current Razorpay docs and test thoroughly with test-mode keys first.
 * ============================================================================
 */

let client = null;
function getClient() {
  if (!client) {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) throw new Error('Razorpay keys are not configured');
    client = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
  }
  return client;
}

export const razorpayProvider = {
  name: 'razorpay',

  async createOrder({ amount, currency, receiptId }) {
    const razorpay = getClient();
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // smallest currency unit, same convention as Stripe
      currency: currency.toUpperCase(),
      receipt: receiptId,
      payment_capture: 0, // manual capture — this is the "hold" step
    });
    return { providerOrderId: order.id, clientSecret: order.id, amount, currency };
  },

  /**
   * Razorpay's checkout returns razorpay_payment_id + razorpay_signature to
   * the frontend, which must be forwarded here and verified server-side —
   * trusting a client-submitted "it worked" without this check would let
   * anyone fake a successful payment.
   */
  async confirmPayment({ providerOrderId, razorpayPaymentId, razorpaySignature }) {
    if (!razorpayPaymentId || !razorpaySignature) {
      throw new Error('Missing Razorpay payment verification fields');
    }
    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${providerOrderId}|${razorpayPaymentId}`)
      .digest('hex');
    if (expected !== razorpaySignature) {
      throw new Error('Razorpay signature verification failed — possible tampering');
    }
    return { providerPaymentId: razorpayPaymentId, verified: true };
  },

  async release({ providerPaymentId, amount, currency }) {
    const razorpay = getClient();
    const captured = await razorpay.payments.capture(providerPaymentId, Math.round(amount * 100), currency.toUpperCase());
    return { released: captured.status === 'captured', providerTransferId: captured.id };
    // NOTE: same caveat as Stripe — this captures into the PLATFORM's
    // account. Getting funds to the freelancer needs Razorpay Route.
  },

  async refund({ providerPaymentId }) {
    const razorpay = getClient();
    const refund = await razorpay.payments.refund(providerPaymentId);
    return { refunded: !!refund.id, providerRefundId: refund.id };
  },
};
