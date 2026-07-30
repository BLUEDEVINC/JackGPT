import { v4 as uuidv4 } from 'uuid';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { streamChatCompletion } from '../services/openaiService.js';
import { badRequest, notFound } from '../utils/httpError.js';

const CONTEXT_LIMIT = 20;
const EXPORT_FORMATS = ['json', 'md'];

async function findOwnedConversation(req) {
  const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user.id });
  if (!conversation) throw notFound('Conversation not found');
  return conversation;
}

export async function listConversations(req, res) {
  const items = await Conversation.find({ userId: req.user.id }).sort({ updatedAt: -1 }).lean();
  res.json({ conversations: items });
}

export async function createConversation(req, res) {
  const conversation = await Conversation.create({
    userId: req.user.id,
    title: req.body?.title || 'New conversation'
  });
  res.status(201).json({ conversation });
}

export async function renameConversation(req, res) {
  const title = req.body?.title?.trim();
  if (!title) throw badRequest('A non-empty title is required');

  const conversation = await Conversation.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    { title },
    { new: true, runValidators: true }
  );
  if (!conversation) throw notFound('Conversation not found');
  res.json({ conversation });
}

export async function deleteConversation(req, res) {
  const conversation = await Conversation.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!conversation) throw notFound('Conversation not found');

  await Message.deleteMany({ conversationId: req.params.id, userId: req.user.id });
  res.status(204).send();
}

export async function shareConversation(req, res) {
  const conversation = await Conversation.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    { sharedToken: uuidv4() },
    { new: true }
  );
  if (!conversation) throw notFound('Conversation not found');
  res.json({ sharedToken: conversation.sharedToken });
}

export async function getConversationMessages(req, res) {
  await findOwnedConversation(req);

  const messages = await Message.find({ conversationId: req.params.id, userId: req.user.id }).sort({ createdAt: 1 });
  res.json({ messages });
}

export async function editMessage(req, res) {
  const content = req.body?.content?.trim();
  if (!content) throw badRequest('Message content required');

  const message = await Message.findOneAndUpdate(
    { _id: req.params.messageId, conversationId: req.params.id, userId: req.user.id, role: 'user' },
    { content, edited: true },
    { new: true, runValidators: true }
  );
  if (!message) throw notFound('Message not found');
  res.json({ message });
}

export async function regenerateResponse(req, res) {
  await findOwnedConversation(req);

  const messages = await Message.find({ conversationId: req.params.id, userId: req.user.id }).sort({ createdAt: 1 });
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUser) throw badRequest('No user message to regenerate');

  // deleteOne() ignores sort(), so the newest assistant message has to be
  // resolved explicitly instead of deleting an arbitrary one.
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  if (lastAssistant) {
    await Message.deleteOne({ _id: lastAssistant.id, userId: req.user.id });
  }

  res.json({ status: 'ready', messageId: lastUser.id });
}

export async function exportConversation(req, res) {
  const { format = 'json' } = req.query;
  if (!EXPORT_FORMATS.includes(format)) {
    throw badRequest(`Unsupported export format '${format}'. Expected one of: ${EXPORT_FORMATS.join(', ')}`);
  }

  const conversation = await findOwnedConversation(req);
  const messages = await Message.find({ conversationId: req.params.id, userId: req.user.id })
    .sort({ createdAt: 1 })
    .lean();

  if (format === 'md') {
    const markdown = messages.map((m) => `## ${m.role}\n\n${m.content}`).join('\n\n');
    res.type('text/markdown').send(markdown);
    return;
  }

  res.json({ conversation, messages });
}

function writeSse(res, payload) {
  if (res.writableEnded || res.destroyed) return false;
  return res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function streamMessage(req, res) {
  const content = req.body?.content;
  if (!content?.trim()) throw badRequest('Message content required');

  const conversation = await findOwnedConversation(req);

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

  let clientGone = false;
  res.once('close', () => {
    if (!res.writableEnded) clientGone = true;
  });

  let assistantText = '';
  let streamError = null;
  try {
    assistantText = await streamChatCompletion({
      messages: modelMessages,
      onToken: (token) => {
        assistantText += token;
        writeSse(res, { token });
      }
    });
  } catch (err) {
    streamError = err;
    assistantText = err.partialText || assistantText;
    console.error('Assistant stream failed', err);
  }

  // Persist whatever was generated so a mid-stream failure does not lose the reply.
  if (assistantText.trim()) {
    try {
      await Message.create({
        conversationId: conversation.id,
        userId: req.user.id,
        role: 'assistant',
        content: assistantText
      });

      if (conversation.title === 'New conversation') {
        conversation.title = content.split('\n')[0].slice(0, 60).trim() || 'Conversation';
      } else {
        conversation.updatedAt = new Date();
      }
      await conversation.save();
    } catch (err) {
      console.error('Failed to persist assistant message', err);
      writeSse(res, { error: 'The reply could not be saved to your history.' });
    }
  }

  if (streamError) {
    const status = streamError.status ?? 500;
    writeSse(res, {
      error: streamError.expose ? streamError.message : 'The assistant failed to respond. Please try again.',
      status,
      code: streamError.code
    });
  }

  if (!clientGone && !res.writableEnded) {
    writeSse(res, { done: true, error: streamError ? true : undefined });
    res.end();
  }
}
