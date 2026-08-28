import mongoose from 'mongoose';

const { Schema } = mongoose;

const disputeSchema = new Schema(
  {
    payment: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    gig: { type: Schema.Types.ObjectId, ref: 'Gig', required: true },
    raisedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    against: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    reason: { type: String, required: true, maxlength: 2000 },
    evidenceUrls: { type: [String], default: [] },

    status: { type: String, enum: ['open', 'under_review', 'resolved'], default: 'open', index: true },

    resolution: { type: String, default: '' },
    resolutionAction: { type: String, enum: ['none', 'released', 'refunded'], default: 'none' },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Dispute', disputeSchema);
