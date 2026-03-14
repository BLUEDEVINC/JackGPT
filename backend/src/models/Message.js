import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', index: true, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    role: { type: String, enum: ['system', 'user', 'assistant'], required: true },
    content: { type: String, required: true },
    regeneratedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    edited: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Message = mongoose.model('Message', messageSchema);
