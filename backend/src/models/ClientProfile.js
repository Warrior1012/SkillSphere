import mongoose from 'mongoose';

const { Schema } = mongoose;

const clientProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },

    companyName: { type: String, default: '', trim: true },
    industry: { type: String, default: '', trim: true },
    bio: { type: String, default: '', maxlength: 2000 },

    verificationBadge: { type: Boolean, default: false },

    // Denormalized, recomputed as the gig/payment system (Weeks 2 & 4) writes
    // through it — same rationale as FreelancerProfile's stats block.
    totalGigsPosted: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    activeGigs: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('ClientProfile', clientProfileSchema);
