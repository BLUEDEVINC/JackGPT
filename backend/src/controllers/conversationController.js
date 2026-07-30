import { v4 as uuidv4 } from 'uuid';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { streamChatCompletion } from '../services/openaiService.js';
import { badRequest, notFound } from '../utils/http.js';
import {
  conversationScope,
  findConversationMessages,
  findOwnedConversation,
  messageScope
} from '../utils/scope.js';
import { sendSseEvent, startSseStream } from '../utils/sse.js';

const CONTEXT_LIMIT = 20;

export async function listConversations(req, res) {
  const items = await Conversation.find({ userId: req.user.id }).sort({ updatedAt: -1 }).lean();
  res.json({ conversations: items });
}

export async function createConversation(req, res) {
  const conversation = await Conversation.create({ userId: req.user.id, title: req.body.title || 'New conversation' });
  res.status(201).json({ conversation });
}

export async function renameConversation(req, res) {
  const conversation = await Conversation.findOneAndUpdate(
    conversationScope(req),
    { title: req.body.title || 'Untitled conversation' },
    { new: true }
  );
  if (!conversation) return notFound(res, 'Conversation');
  res.json({ conversation });
}

export async function deleteConversation(req, res) {
  const conversation = await Conversation.findOneAndDelete(conversationScope(req));
  if (!conversation) return notFound(res, 'Conversation');

  await Message.deleteMany(messageScope(req));
  res.status(204).send();
}

export async function shareConversation(req, res) {
  const conversation = await Conversation.findOneAndUpdate(
    conversationScope(req),
    { sharedToken: uuidv4() },
    { new: true }
  );
  if (!conversation) return notFound(res, 'Conversation');
  res.json({ sharedToken: conversation.sharedToken });
}

export async function getConversationMessages(req, res) {
  const conversation = await findOwnedConversation(req);
  if (!conversation) return notFound(res, 'Conversation');

  const messages = await findConversationMessages(req);
  res.json({ messages });
}

export async function editMessage(req, res) {
  const message = await Message.findOneAndUpdate(
    { _id: req.params.messageId, ...messageScope(req), role: 'user' },
    { content: req.body.content, edited: true },
    { new: true }
  );
  if (!message) return notFound(res, 'Message');
  res.json({ message });
}

export async function regenerateResponse(req, res) {
  const conversation = await findOwnedConversation(req);
  if (!conversation) return notFound(res, 'Conversation');

  const messages = await findConversationMessages(req);
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUser) return badRequest(res, 'No user message to regenerate');

  await Message.deleteOne({ ...messageScope(req), role: 'assistant' }).sort({ createdAt: -1 });
  res.json({ status: 'ready', messageId: lastUser.id });
}

export async function exportConversation(req, res) {
  const { format = 'json' } = req.query;
  const conversation = await findOwnedConversation(req);
  if (!conversation) return notFound(res, 'Conversation');

  const messages = await findConversationMessages(req, { lean: true });

  if (format === 'md') {
    const markdown = messages.map((m) => `## ${m.role}\n\n${m.content}`).join('\n\n');
    res.type('text/markdown').send(markdown);
    return;
  }

  res.json({ conversation, messages });
}

export async function streamMessage(req, res) {
  const { content } = req.body;
  const conversation = await findOwnedConversation(req);
  if (!conversation) return notFound(res, 'Conversation');
  if (!content?.trim()) return badRequest(res, 'Message content required');

  await Message.create({
    conversationId: conversation.id,
    userId: req.user.id,
    role: 'user',
    content: content.trim()
  });

  const recent = await Message.find({ conversationId: conversation.id, userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(CONTEXT_LIMIT)
    .lean();

  const modelMessages = [
    { role: 'system', content: conversation.systemPrompt },
    ...recent.reverse().map((m) => ({ role: m.role, content: m.content }))
  ];

  startSseStream(res);

  let assistantText = '';
  const fullText = await streamChatCompletion({
    messages: modelMessages,
    onToken: (token) => {
      assistantText += token;
      sendSseEvent(res, { token });
    }
  });

  await Message.create({
    conversationId: conversation.id,
    userId: req.user.id,
    role: 'assistant',
    content: fullText
  });

  if (conversation.title === 'New conversation') {
    const firstLine = content.split('\n')[0].slice(0, 60);
    conversation.title = firstLine || 'Conversation';
    await conversation.save();
  } else {
    conversation.updatedAt = new Date();
    await conversation.save();
  }

  sendSseEvent(res, { done: true });
  res.end();
}
