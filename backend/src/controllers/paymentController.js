import Payment from '../models/Payment.js';
import Gig from '../models/Gig.js';
import Dispute from '../models/Dispute.js';
import ClientProfile from '../models/ClientProfile.js';
import FreelancerProfile from '../models/FreelancerProfile.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { getPaymentProvider } from '../services/payments/index.js';
import { env } from '../config/env.js';
import { notify } from '../utils/notify.js';

// ---------------------------------------------------------------------------
// Fund — client creates an order for a milestone (or the whole gig)
// ---------------------------------------------------------------------------
export const fundPayment = asyncHandler(async (req, res) => {
  const { gigId, milestoneId, amount } = req.body;

  const gig = await Gig.findById(gigId);
  if (!gig) throw new ApiError(404, 'Gig not found');
  if (String(gig.client) !== String(req.user._id)) throw new ApiError(403, 'Only the gig owner can fund a payment');
  if (!gig.selectedFreelancer) throw new ApiError(400, 'This gig has no accepted freelancer yet');

  if (milestoneId) {
    const milestone = gig.milestones.id(milestoneId);
    if (!milestone) throw new ApiError(404, 'Milestone not found on this gig');
  }

  const payment = await Payment.create({
    gig: gig._id,
    milestoneId: milestoneId || null,
    client: req.user._id,
    freelancer: gig.selectedFreelancer,
    amount,
    currency: env.PAYMENT_CURRENCY,
    provider: getPaymentProvider().name,
  });

  const provider = getPaymentProvider();
  const order = await provider.createOrder({ amount, currency: payment.currency, receiptId: String(payment._id) });

  payment.providerOrderId = order.providerOrderId;

  // Mock has no real checkout step to wait on — auto-confirm so funding is
  // genuinely one click for the demo. Real providers still require the
  // separate /confirm call once client-side checkout completes.
  if (provider.name === 'mock') {
    const confirmed = await provider.confirmPayment({ providerOrderId: order.providerOrderId });
    payment.providerPaymentId = confirmed.providerPaymentId;
    payment.status = 'authorized';
  }
  await payment.save();

  res.status(201).json(
    new ApiResponse(
      201,
      { payment, providerOrderId: order.providerOrderId, clientSecret: order.clientSecret, provider: provider.name },
      provider.name === 'mock' ? 'Order created (mock provider — will auto-confirm)' : 'Order created — complete checkout, then confirm'
    )
  );
});

// ---------------------------------------------------------------------------
// Confirm — verifies the payment actually went through, moves to 'authorized' (held)
// ---------------------------------------------------------------------------
export const confirmPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw new ApiError(404, 'Payment not found');
  if (String(payment.client) !== String(req.user._id)) throw new ApiError(403, 'Not your payment');
  if (payment.status !== 'created') throw new ApiError(400, `Payment is already ${payment.status}`);

  const provider = getPaymentProvider();
  try {
    const result = await provider.confirmPayment({
      providerOrderId: payment.providerOrderId,
      razorpayPaymentId: req.body.razorpayPaymentId,
      razorpaySignature: req.body.razorpaySignature,
    });
    payment.providerPaymentId = result.providerPaymentId;
    payment.status = 'authorized';
    await payment.save();
  } catch (err) {
    payment.status = 'failed';
    payment.failureReason = err.message;
    await payment.save();
    throw new ApiError(400, `Payment verification failed: ${err.message}`);
  }

  res.json(new ApiResponse(200, { payment }, 'Funds held — release once the milestone is approved'));
});

// ---------------------------------------------------------------------------
// Release — client approves the work, funds move to the freelancer
// ---------------------------------------------------------------------------
export const releasePayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw new ApiError(404, 'Payment not found');
  if (String(payment.client) !== String(req.user._id)) throw new ApiError(403, 'Only the client can release a payment');
  if (payment.status !== 'authorized') throw new ApiError(400, `Cannot release a payment that is ${payment.status}`);

  const openDispute = await Dispute.findOne({ payment: payment._id, status: { $ne: 'resolved' } });
  if (openDispute) throw new ApiError(409, 'This payment has an open dispute — an admin must resolve it first');

  const provider = getPaymentProvider();
  const result = await provider.release({
    providerPaymentId: payment.providerPaymentId,
    amount: payment.amount,
    currency: payment.currency,
  });
  if (!result.released) throw new ApiError(502, 'Provider did not confirm the release');

  payment.status = 'released';
  await payment.save();

  await Promise.all([
    ClientProfile.updateOne({ user: payment.client }, { $inc: { totalSpent: payment.amount } }),
    FreelancerProfile.updateOne({ user: payment.freelancer }, { $inc: { totalEarnings: payment.amount } }),
  ]);

  await notify({
    user: payment.freelancer,
    type: 'gig_completed',
    title: `Payment released: $${payment.amount}`,
    link: `/gigs/${payment.gig}`,
  });

  res.json(new ApiResponse(200, { payment }, 'Payment released to freelancer'));
});

// ---------------------------------------------------------------------------
// Refund — client or admin reverses a held payment
// ---------------------------------------------------------------------------
export const refundPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw new ApiError(404, 'Payment not found');
  const isOwner = String(payment.client) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') throw new ApiError(403, 'Not authorized to refund this payment');
  if (payment.status !== 'authorized') throw new ApiError(400, `Cannot refund a payment that is ${payment.status}`);

  const openDispute = await Dispute.findOne({ payment: payment._id, status: { $ne: 'resolved' } });
  if (openDispute) throw new ApiError(409, 'This payment has an open dispute — an admin must resolve it first');

  const provider = getPaymentProvider();
  const result = await provider.refund({ providerPaymentId: payment.providerPaymentId });
  if (!result.refunded) throw new ApiError(502, 'Provider did not confirm the refund');

  payment.status = 'refunded';
  await payment.save();

  res.json(new ApiResponse(200, { payment }, 'Payment refunded'));
});

// ---------------------------------------------------------------------------
// Transaction history
// ---------------------------------------------------------------------------
export const getMyPayments = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'freelancer' ? { freelancer: req.user._id } : { client: req.user._id };
  const payments = await Payment.find(filter).sort({ createdAt: -1 }).populate('gig', 'title');
  res.json(new ApiResponse(200, { payments }));
});

export const getGigPayments = asyncHandler(async (req, res) => {
  const gig = await Gig.findById(req.params.gigId);
  if (!gig) throw new ApiError(404, 'Gig not found');
  const isParticipant = [String(gig.client), String(gig.selectedFreelancer)].includes(String(req.user._id));
  if (!isParticipant && req.user.role !== 'admin') throw new ApiError(403, 'Not authorized');

  const payments = await Payment.find({ gig: gig._id }).sort({ createdAt: -1 });
  res.json(new ApiResponse(200, { payments }));
});
