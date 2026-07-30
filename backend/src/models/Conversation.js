import mongoose from 'mongoose';
import { objectIdRef } from './fields.js';

const conversationSchema = new mongoose.Schema(
  {
    userId: objectIdRef('User', { required: true }),
    title: { type: String, required: true, default: 'New conversation' },
    sharedToken: { type: String, index: true },
    systemPrompt: { type: String, default: 'You are a helpful AI assistant.' }
  },
  { timestamps: true }
);

export const Conversation = mongoose.model('Conversation', conversationSchema);
