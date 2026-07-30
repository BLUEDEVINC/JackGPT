import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';

export function conversationScope(req) {
  return { _id: req.params.id, userId: req.user.id };
}

export function messageScope(req) {
  return { conversationId: req.params.id, userId: req.user.id };
}

export function findOwnedConversation(req) {
  return Conversation.findOne(conversationScope(req));
}

export function findConversationMessages(req, { lean = false } = {}) {
  const query = Message.find(messageScope(req)).sort({ createdAt: 1 });
  return lean ? query.lean() : query;
}
