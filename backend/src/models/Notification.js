import mongoose from 'mongoose';

const { Schema } = mongoose;

const NOTIFICATION_TYPES = [
  'proposal_received',
  'proposal_accepted',
  'proposal_rejected',
  'gig_completed',
  'review_received',
  'new_message',
];

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    link: { type: String, default: '' }, // frontend route, e.g. /gigs/:id
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });

export { NOTIFICATION_TYPES };
export default mongoose.model('Notification', notificationSchema);
