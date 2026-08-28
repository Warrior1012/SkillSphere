import Dispute from '../models/Dispute.js';
import Payment from '../models/Payment.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { getPaymentProvider } from '../services/payments/index.js';
import { notify } from '../utils/notify.js';

export const raiseDispute = asyncHandler(async (req, res) => {
  const { paymentId, reason, evidenceUrls } = req.body;

  const payment = await Payment.findById(paymentId);
  if (!payment) throw new ApiError(404, 'Payment not found');

  const isClient = String(payment.client) === String(req.user._id);
  const isFreelancer = String(payment.freelancer) === String(req.user._id);
  if (!isClient && !isFreelancer) throw new ApiError(403, 'Not part of this payment');

  if (payment.status !== 'authorized') {
    throw new ApiError(400, `Can only dispute a payment that's currently held (status: ${payment.status})`);
  }

  const existing = await Dispute.findOne({ payment: paymentId, status: { $ne: 'resolved' } });
  if (existing) throw new ApiError(409, 'There is already an open dispute on this payment');

  const dispute = await Dispute.create({
    payment: paymentId,
    gig: payment.gig,
    raisedBy: req.user._id,
    against: isClient ? payment.freelancer : payment.client,
    reason,
    evidenceUrls,
  });

  res.status(201).json(new ApiResponse(201, { dispute }, 'Dispute raised — payment is frozen until an admin resolves it'));
});

export const getMyDisputes = asyncHandler(async (req, res) => {
  const disputes = await Dispute.find({ $or: [{ raisedBy: req.user._id }, { against: req.user._id }] })
    .sort({ createdAt: -1 })
    .populate('gig', 'title')
    .populate('raisedBy', 'name')
    .populate('against', 'name');
  res.json(new ApiResponse(200, { disputes }));
});

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export const getAllDisputes = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const disputes = await Dispute.find(filter)
    .sort({ createdAt: -1 })
    .populate('gig', 'title')
    .populate('payment')
    .populate('raisedBy', 'name email')
    .populate('against', 'name email');
  res.json(new ApiResponse(200, { disputes }));
});

export const resolveDispute = asyncHandler(async (req, res) => {
  const { resolution, action } = req.body;

  const dispute = await Dispute.findById(req.params.id).populate('payment');
  if (!dispute) throw new ApiError(404, 'Dispute not found');
  if (dispute.status === 'resolved') throw new ApiError(400, 'Dispute is already resolved');

  const payment = dispute.payment;

  if (action !== 'none') {
    if (payment.status !== 'authorized') {
      throw new ApiError(400, `Underlying payment is ${payment.status}, not held — can't ${action} it`);
    }
    const provider = getPaymentProvider();
    if (action === 'released') {
      const result = await provider.release({ providerPaymentId: payment.providerPaymentId, amount: payment.amount, currency: payment.currency });
      if (!result.released) throw new ApiError(502, 'Provider did not confirm the release');
      payment.status = 'released';
    } else if (action === 'refunded') {
      const result = await provider.refund({ providerPaymentId: payment.providerPaymentId });
      if (!result.refunded) throw new ApiError(502, 'Provider did not confirm the refund');
      payment.status = 'refunded';
    }
    await payment.save();
  }

  dispute.status = 'resolved';
  dispute.resolution = resolution;
  dispute.resolutionAction = action;
  dispute.resolvedBy = req.user._id;
  dispute.resolvedAt = new Date();
  await dispute.save();

  await Promise.all([
    notify({ user: dispute.raisedBy, type: 'gig_completed', title: 'Your dispute was resolved', body: resolution.slice(0, 100), link: `/gigs/${dispute.gig}` }),
    notify({ user: dispute.against, type: 'gig_completed', title: 'A dispute involving you was resolved', body: resolution.slice(0, 100), link: `/gigs/${dispute.gig}` }),
  ]);

  res.json(new ApiResponse(200, { dispute }, 'Dispute resolved'));
});
