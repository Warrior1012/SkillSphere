import mongoose from 'mongoose';

const { Schema } = mongoose;

const conversationSchema = new Schema(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    gig: { type: Schema.Types.ObjectId, ref: 'Gig', default: null },

    // Denormalized so the conversation list is a single query, not N+1.
    lastMessageText: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });

export default mongoose.model('Conversation', conversationSchema);
