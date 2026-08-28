import mongoose from 'mongoose';

const { Schema } = mongoose;

const attachmentSchema = new Schema({ name: { type: String, required: true }, url: { type: String, required: true } }, { _id: false });

const messageSchema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '', maxlength: 5000 },
    attachments: { type: [attachmentSchema], default: [] },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);
