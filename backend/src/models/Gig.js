import mongoose from 'mongoose';

const { Schema } = mongoose;

const progressLogEntrySchema = new Schema(
  {
    note: { type: String, required: true, maxlength: 1000 },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const milestoneSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date },
    status: { type: String, enum: ['pending', 'in_progress', 'submitted', 'approved', 'paid'], default: 'pending' },
    progressLog: { type: [progressLogEntrySchema], default: [] },
  },
  { timestamps: true }
);

const attachmentSchema = new Schema(
  { name: { type: String, required: true }, url: { type: String, required: true } },
  { _id: false }
);

const gigSchema = new Schema(
  {
    client: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, required: true, maxlength: 5000 },
    category: { type: String, default: '', trim: true },
    skillsRequired: { type: [String], default: [] },

    budgetType: { type: String, enum: ['fixed', 'hourly'], default: 'fixed' },
    budgetMin: { type: Number, min: 0, default: 0 },
    budgetMax: { type: Number, min: 0, default: 0 },

    milestones: { type: [milestoneSchema], default: [] },
    attachments: { type: [attachmentSchema], default: [] },

    isRemote: { type: Boolean, default: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
      city: { type: String, default: '' },
    },

    invitedFreelancers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    selectedFreelancer: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    status: {
      type: String,
      enum: ['open', 'in_progress', 'completed', 'cancelled'],
      default: 'open',
      index: true,
    },

    proposalsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

gigSchema.index({ location: '2dsphere' });
gigSchema.index({ skillsRequired: 1 });
gigSchema.index({ title: 'text', description: 'text' });

// Amount-weighted, not just a milestone count — a $50 milestone finishing
// shouldn't move the needle as much as a $2000 one.
gigSchema.methods.computeProgress = function computeProgress() {
  if (!this.milestones.length) return this.status === 'completed' ? 100 : 0;
  const totalAmount = this.milestones.reduce((sum, m) => sum + m.amount, 0);
  if (totalAmount === 0) return 0;
  const doneAmount = this.milestones
    .filter((m) => m.status === 'approved' || m.status === 'paid')
    .reduce((sum, m) => sum + m.amount, 0);
  return Math.round((doneAmount / totalAmount) * 100);
};

export default mongoose.model('Gig', gigSchema);
