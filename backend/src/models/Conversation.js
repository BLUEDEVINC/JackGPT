import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    title: { type: String, required: true, default: 'New conversation' },
    sharedToken: { type: String, index: true },
    systemPrompt: { type: String, default: 'You are a helpful AI assistant.' }
  },
  { timestamps: true }
);

export const Conversation = mongoose.model('Conversation', conversationSchema);
