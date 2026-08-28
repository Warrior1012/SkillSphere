/**
 * Simulates a payment gateway with zero external dependencies. Every
 * operation resolves instantly and deterministically — this is intentional:
 * it's what makes the fund → release → refund loop demoable today, without
 * waiting on Stripe/Razorpay test accounts to be set up.
 */
export const mockProvider = {
  name: 'mock',

  async createOrder({ amount, currency, receiptId }) {
    return {
      providerOrderId: `mock_order_${receiptId}_${Date.now()}`,
      clientSecret: 'mock_client_secret', // frontend uses this to know "no real checkout needed"
      amount,
      currency,
    };
  },

  /** In a real provider this is where a client-submitted payment gets verified. Mock always succeeds. */
  async confirmPayment({ providerOrderId }) {
    return { providerPaymentId: `mock_payment_${providerOrderId}`, verified: true };
  },

  async release({ providerPaymentId }) {
    return { released: true, providerTransferId: `mock_transfer_${providerPaymentId}` };
  },

  async refund({ providerPaymentId }) {
    return { refunded: true, providerRefundId: `mock_refund_${providerPaymentId}` };
  },
};
