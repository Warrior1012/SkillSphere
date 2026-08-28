import mongoose from 'mongoose';

const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    gig: { type: Schema.Types.ObjectId, ref: 'Gig', required: true, index: true },
    milestoneId: { type: Schema.Types.ObjectId, default: null }, // null = full-gig payment, not tied to a specific milestone
    client: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    freelancer: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'usd' },

    provider: { type: String, enum: ['mock', 'stripe', 'razorpay'], required: true },
    providerOrderId: { type: String, default: '' },
    providerPaymentId: { type: String, default: '' },

    // created -> authorized (funds held) -> released (paid to freelancer) | refunded
    status: {
      type: String,
      enum: ['created', 'authorized', 'released', 'refunded', 'failed'],
      default: 'created',
      index: true,
    },

    failureReason: { type: String, default: '' },
  },
  { timestamps: true }
);

paymentSchema.index({ client: 1, createdAt: -1 });
paymentSchema.index({ freelancer: 1, createdAt: -1 });

export default mongoose.model('Payment', paymentSchema);
