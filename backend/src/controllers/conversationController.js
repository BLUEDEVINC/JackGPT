import { v4 as uuidv4 } from 'uuid';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { streamChatCompletion } from '../services/openaiService.js';

const CONTEXT_LIMIT = 20;
const MAX_MESSAGE_LENGTH = 32000;

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
    { _id: req.params.id, userId: req.user.id },
    { title: req.body.title || 'Untitled conversation' },
    { new: true }
  );
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  res.json({ conversation });
}

export async function deleteConversation(req, res) {
  const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user.id });
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  await Message.deleteMany({ conversationId: conversation.id, userId: req.user.id });
  await conversation.deleteOne();
  res.status(204).send();
}

export async function shareConversation(req, res) {
  const conversation = await Conversation.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    { sharedToken: uuidv4() },
    { new: true }
  );
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  res.json({ sharedToken: conversation.sharedToken });
}

export async function getSharedConversation(req, res) {
  const conversation = await Conversation.findOne({ sharedToken: req.params.token }).lean();
  if (!conversation) return res.status(404).json({ error: 'Shared conversation not found' });

  const messages = await Message.find({ conversationId: conversation._id, role: { $ne: 'system' } })
    .sort({ createdAt: 1 })
    .select('role content createdAt')
    .lean();

  res.json({ conversation: { title: conversation.title, createdAt: conversation.createdAt }, messages });
}

export async function getConversationMessages(req, res) {
  const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user.id });
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  const messages = await Message.find({ conversationId: req.params.id, userId: req.user.id }).sort({ createdAt: 1 });
  res.json({ messages });
}

export async function editMessage(req, res) {
  const message = await Message.findOneAndUpdate(
    { _id: req.params.messageId, conversationId: req.params.id, userId: req.user.id, role: 'user' },
    { content: req.body.content, edited: true },
    { new: true }
  );
  if (!message) return res.status(404).json({ error: 'Message not found' });
  res.json({ message });
}

export async function regenerateResponse(req, res) {
  const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user.id });
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  const messages = await Message.find({ conversationId: req.params.id, userId: req.user.id }).sort({ createdAt: 1 });
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUser) return res.status(400).json({ error: 'No user message to regenerate' });

  await Message.findOneAndDelete({ conversationId: req.params.id, userId: req.user.id, role: 'assistant' }).sort({
    createdAt: -1
  });
  res.json({ status: 'ready', messageId: lastUser.id, content: lastUser.content });
}

export async function exportConversation(req, res) {
  const { format = 'json' } = req.query;
  const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user.id });
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  const messages = await Message.find({ conversationId: req.params.id, userId: req.user.id }).sort({ createdAt: 1 }).lean();

  const filename = `${(conversation.title || 'conversation').replace(/[^\w.-]+/g, '_').slice(0, 80)}`;

  if (format === 'md') {
    const markdown = messages.map((m) => `## ${m.role}\n\n${m.content}`).join('\n\n');
    res.type('text/markdown').attachment(`${filename}.md`).send(markdown);
    return;
  }

  res.attachment(`${filename}.json`);

  res.json({ conversation, messages });
}

export async function streamMessage(req, res) {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Message content required' });
  if (content.length > MAX_MESSAGE_LENGTH) return res.status(413).json({ error: 'Message too long' });

  const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user.id });
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

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

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const abortController = new AbortController();
  res.on('close', () => abortController.abort());

  let assistantText = '';
  let streamError = null;

  try {
    assistantText = await streamChatCompletion({
      messages: modelMessages,
      signal: abortController.signal,
      onToken: (token) => {
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    });
  } catch (err) {
    streamError = err;
    console.error('Streaming failed', err);
  }

  if (assistantText) {
    await Message.create({
      conversationId: conversation.id,
      userId: req.user.id,
      role: 'assistant',
      content: assistantText
    });
  }

  const titleUpdate =
    conversation.title === 'New conversation'
      ? { title: content.trim().split('\n')[0].slice(0, 60) || 'Conversation' }
      : {};
  await Conversation.updateOne({ _id: conversation._id }, { $set: titleUpdate });

  if (abortController.signal.aborted) return;

  if (streamError) {
    res.write(`data: ${JSON.stringify({ error: 'Failed to generate a response. Please try again.' })}\n\n`);
  }
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
}
