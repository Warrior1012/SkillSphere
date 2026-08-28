import mongoose from 'mongoose';

const { Schema } = mongoose;

const skillSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    proficiency: {
      type: String,
      enum: ['beginner', 'intermediate', 'expert'],
      default: 'intermediate',
    },
  },
  { _id: false }
);

const portfolioItemSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    projectUrl: { type: String, default: '' },
    imageUrl: { type: String, default: '' }, // Cloudinary wiring lands in a later phase; URL field works today
  },
  { timestamps: true }
);

const certificationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    issuer: { type: String, default: '', trim: true },
    year: { type: Number },
    credentialUrl: { type: String, default: '' },
  },
  { _id: false }
);

const experienceSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, default: '', trim: true },
    from: { type: Date },
    to: { type: Date }, // null/undefined = "present"
    description: { type: String, default: '' },
  },
  { _id: false }
);

const freelancerProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },

    headline: { type: String, default: '', trim: true, maxlength: 120 },
    bio: { type: String, default: '', maxlength: 2000 },

    skills: { type: [skillSchema], default: [] },
    portfolio: { type: [portfolioItemSchema], default: [] },
    resumeUrl: { type: String, default: '' },
    certifications: { type: [certificationSchema], default: [] },
    experience: { type: [experienceSchema], default: [] },

    pricingModel: {
      type: String,
      enum: ['hourly', 'milestone', 'both'],
      default: 'both',
    },
    hourlyRate: { type: Number, min: 0, default: 0 },

    // Simplified weekly availability for v1; the full booking/calendar
    // scheduler (Module 12) is a later phase — this is enough to display
    // "generally available" info and filter search by it.
    weeklyAvailability: {
      type: [String], // e.g. ["mon", "tue", "wed"]
      default: [],
    },

    verificationBadge: { type: Boolean, default: false },

    // Denormalized stats, recomputed by the review/reputation system
    // (Module 8, later phase). Kept here so profile reads stay a single
    // query instead of an aggregation on every page load.
    reputationScore: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    totalJobsCompleted: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    profileViews: { type: Number, default: 0 },
  },
  { timestamps: true }
);

freelancerProfileSchema.index({ 'skills.name': 1 });
freelancerProfileSchema.index({ reputationScore: -1 });

export default mongoose.model('FreelancerProfile', freelancerProfileSchema);
