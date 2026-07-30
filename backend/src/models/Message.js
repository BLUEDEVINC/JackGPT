import mongoose from 'mongoose';
import { objectIdRef } from './fields.js';

const messageSchema = new mongoose.Schema(
  {
    conversationId: objectIdRef('Conversation', { required: true }),
    userId: objectIdRef('User', { required: true }),
    role: { type: String, enum: ['system', 'user', 'assistant'], required: true },
    content: { type: String, required: true },
    regeneratedFrom: objectIdRef('Message'),
    edited: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Message = mongoose.model('Message', messageSchema);
