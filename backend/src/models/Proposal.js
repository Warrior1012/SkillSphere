import mongoose from 'mongoose';

const { Schema } = mongoose;

const proposalSchema = new Schema(
  {
    gig: { type: Schema.Types.ObjectId, ref: 'Gig', required: true, index: true },
    freelancer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    coverLetter: { type: String, required: true, maxlength: 3000 },
    bidAmount: { type: Number, required: true, min: 0 },
    estimatedDays: { type: Number, required: true, min: 1 },

    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

// A freelancer gets exactly one active proposal per gig — resubmission means
// editing the existing one, not creating duplicates.
proposalSchema.index({ gig: 1, freelancer: 1 }, { unique: true });

export default mongoose.model('Proposal', proposalSchema);
