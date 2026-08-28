import mongoose from 'mongoose';

const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    gig: { type: Schema.Types.ObjectId, ref: 'Gig', required: true, index: true },
    reviewer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewee: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', maxlength: 2000 },

    // Basic, explainable fraud signal (not ML): flags reviews from very-new
    // accounts or reviews posted implausibly fast after gig completion.
    // See utils/fraudSignals.js.
    flaggedForReview: { type: Boolean, default: false },
    flagReasons: { type: [String], default: [] },
  },
  { timestamps: true }
);

// One review per direction per gig — a client reviews the freelancer once,
// the freelancer reviews the client once, for a given gig.
reviewSchema.index({ gig: 1, reviewer: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);
