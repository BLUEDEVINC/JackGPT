import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createReq, createRes, sseTokens } from './helpers/httpMocks.js';
import { query } from './helpers/queryMocks.js';

const conversationMock = {
  find: vi.fn(),
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  findOneAndDelete: vi.fn(),
  create: vi.fn()
};

const messageMock = {
  find: vi.fn(),
  findOneAndUpdate: vi.fn(),
  create: vi.fn(),
  deleteMany: vi.fn(),
  deleteOne: vi.fn()
};

const streamChatCompletion = vi.fn();

vi.mock('../src/models/Conversation.js', () => ({ Conversation: conversationMock }));
vi.mock('../src/models/Message.js', () => ({ Message: messageMock }));
vi.mock('../src/services/openaiService.js', () => ({
  streamChatCompletion: (...args) => streamChatCompletion(...args)
}));
vi.mock('uuid', () => ({ v4: () => 'generated-uuid' }));

const controller = await import('../src/controllers/conversationController.js');

const USER = { id: 'user-1' };

function req(overrides = {}) {
  return createReq({ user: USER, ...overrides });
}

beforeEach(() => {
  Object.values(conversationMock).forEach((fn) => fn.mockReset());
  Object.values(messageMock).forEach((fn) => fn.mockReset());
  streamChatCompletion.mockReset();
});

describe('listConversations', () => {
  it('returns the caller conversations newest-updated first', async () => {
    const chain = query([{ id: 'c1' }]);
    conversationMock.find.mockReturnValue(chain);
    const res = createRes();

    await controller.listConversations(req(), res);

    expect(conversationMock.find).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(chain.calls.sort).toEqual([{ updatedAt: -1 }]);
    expect(chain.calls.lean).toBe(1);
    expect(res.body).toEqual({ conversations: [{ id: 'c1' }] });
  });
});

describe('createConversation', () => {
  it('uses the provided title', async () => {
    conversationMock.create.mockResolvedValue({ id: 'c1', title: 'Trip planning' });
    const res = createRes();

    await controller.createConversation(req({ body: { title: 'Trip planning' } }), res);

    expect(conversationMock.create).toHaveBeenCalledWith({ userId: 'user-1', title: 'Trip planning' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ conversation: { id: 'c1', title: 'Trip planning' } });
  });

  it('defaults the title when none is given', async () => {
    conversationMock.create.mockResolvedValue({ id: 'c1' });

    await controller.createConversation(req({ body: {} }), createRes());

    expect(conversationMock.create).toHaveBeenCalledWith({ userId: 'user-1', title: 'New conversation' });
  });
});

describe('renameConversation', () => {
  it('scopes the update to the owner and returns the updated document', async () => {
    conversationMock.findOneAndUpdate.mockResolvedValue({ id: 'c1', title: 'Renamed' });
    const res = createRes();

    await controller.renameConversation(req({ params: { id: 'c1' }, body: { title: 'Renamed' } }), res);

    expect(conversationMock.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'c1', userId: 'user-1' },
      { title: 'Renamed' },
      { new: true }
    );
    expect(res.body).toEqual({ conversation: { id: 'c1', title: 'Renamed' } });
  });

  it('falls back to a default title for an empty title', async () => {
    conversationMock.findOneAndUpdate.mockResolvedValue({ id: 'c1' });

    await controller.renameConversation(req({ params: { id: 'c1' }, body: { title: '' } }), createRes());

    expect(conversationMock.findOneAndUpdate.mock.calls[0][1]).toEqual({ title: 'Untitled conversation' });
  });

  it('404s when the conversation does not belong to the caller', async () => {
    conversationMock.findOneAndUpdate.mockResolvedValue(null);
    const res = createRes();

    await controller.renameConversation(req({ params: { id: 'c1' }, body: {} }), res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'Conversation not found' });
  });
});

describe('deleteConversation', () => {
  it('deletes the conversation and its messages', async () => {
    conversationMock.findOneAndDelete.mockResolvedValue({ id: 'c1' });
    messageMock.deleteMany.mockResolvedValue({ deletedCount: 3 });
    const res = createRes();

    await controller.deleteConversation(req({ params: { id: 'c1' } }), res);

    expect(messageMock.deleteMany).toHaveBeenCalledWith({ conversationId: 'c1', userId: 'user-1' });
    expect(res.statusCode).toBe(204);
    expect(res.send).toHaveBeenCalled();
  });

  it('404s and leaves messages untouched when nothing was deleted', async () => {
    conversationMock.findOneAndDelete.mockResolvedValue(null);
    const res = createRes();

    await controller.deleteConversation(req({ params: { id: 'c1' } }), res);

    expect(messageMock.deleteMany).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
  });
});

describe('shareConversation', () => {
  it('assigns a share token', async () => {
    conversationMock.findOneAndUpdate.mockResolvedValue({ sharedToken: 'generated-uuid' });
    const res = createRes();

    await controller.shareConversation(req({ params: { id: 'c1' } }), res);

    expect(conversationMock.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'c1', userId: 'user-1' },
      { sharedToken: 'generated-uuid' },
      { new: true }
    );
    expect(res.body).toEqual({ sharedToken: 'generated-uuid' });
  });

  it('404s for an unknown conversation', async () => {
    conversationMock.findOneAndUpdate.mockResolvedValue(null);
    const res = createRes();

    await controller.shareConversation(req({ params: { id: 'c1' } }), res);

    expect(res.statusCode).toBe(404);
  });
});

describe('getConversationMessages', () => {
  it('returns messages in chronological order', async () => {
    conversationMock.findOne.mockResolvedValue({ id: 'c1' });
    const chain = query([{ id: 'm1' }]);
    messageMock.find.mockReturnValue(chain);
    const res = createRes();

    await controller.getConversationMessages(req({ params: { id: 'c1' } }), res);

    expect(chain.calls.sort).toEqual([{ createdAt: 1 }]);
    expect(res.body).toEqual({ messages: [{ id: 'm1' }] });
  });

  it('404s without querying messages when the conversation is missing', async () => {
    conversationMock.findOne.mockResolvedValue(null);
    const res = createRes();

    await controller.getConversationMessages(req({ params: { id: 'c1' } }), res);

    expect(messageMock.find).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
  });
});

describe('editMessage', () => {
  it('only edits the caller own user messages and flags them as edited', async () => {
    messageMock.findOneAndUpdate.mockResolvedValue({ id: 'm1', content: 'new', edited: true });
    const res = createRes();

    await controller.editMessage(
      req({ params: { id: 'c1', messageId: 'm1' }, body: { content: 'new' } }),
      res
    );

    expect(messageMock.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'm1', conversationId: 'c1', userId: 'user-1', role: 'user' },
      { content: 'new', edited: true },
      { new: true }
    );
    expect(res.body).toEqual({ message: { id: 'm1', content: 'new', edited: true } });
  });

  it('404s when no matching message exists', async () => {
    messageMock.findOneAndUpdate.mockResolvedValue(null);
    const res = createRes();

    await controller.editMessage(req({ params: { id: 'c1', messageId: 'm1' }, body: {} }), res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'Message not found' });
  });
});

describe('regenerateResponse', () => {
  it('404s for an unknown conversation', async () => {
    conversationMock.findOne.mockResolvedValue(null);
    const res = createRes();

    await controller.regenerateResponse(req({ params: { id: 'c1' } }), res);

    expect(res.statusCode).toBe(404);
  });

  it('400s when the conversation has no user message', async () => {
    conversationMock.findOne.mockResolvedValue({ id: 'c1' });
    messageMock.find.mockReturnValue(query([{ id: 'm1', role: 'assistant' }]));
    const res = createRes();

    await controller.regenerateResponse(req({ params: { id: 'c1' } }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'No user message to regenerate' });
    expect(messageMock.deleteOne).not.toHaveBeenCalled();
  });

  it('drops the latest assistant reply and reports the last user message', async () => {
    conversationMock.findOne.mockResolvedValue({ id: 'c1' });
    messageMock.find.mockReturnValue(
      query([
        { id: 'm1', role: 'user' },
        { id: 'm2', role: 'assistant' },
        { id: 'm3', role: 'user' },
        { id: 'm4', role: 'assistant' }
      ])
    );
    messageMock.deleteOne.mockReturnValue(query({ deletedCount: 1 }));
    const res = createRes();

    await controller.regenerateResponse(req({ params: { id: 'c1' } }), res);

    expect(messageMock.deleteOne).toHaveBeenCalledWith({
      conversationId: 'c1',
      userId: 'user-1',
      role: 'assistant'
    });
    expect(res.body).toEqual({ status: 'ready', messageId: 'm3' });
  });
});

describe('exportConversation', () => {
  it('404s for an unknown conversation', async () => {
    conversationMock.findOne.mockResolvedValue(null);
    const res = createRes();

    await controller.exportConversation(req({ params: { id: 'c1' } }), res);

    expect(res.statusCode).toBe(404);
  });

  it('defaults to a JSON payload containing the conversation and messages', async () => {
    conversationMock.findOne.mockResolvedValue({ id: 'c1' });
    messageMock.find.mockReturnValue(query([{ role: 'user', content: 'hi' }]));
    const res = createRes();

    await controller.exportConversation(req({ params: { id: 'c1' } }), res);

    expect(res.body).toEqual({ conversation: { id: 'c1' }, messages: [{ role: 'user', content: 'hi' }] });
    expect(res.type).not.toHaveBeenCalled();
  });

  it('renders markdown with a heading per message when format=md', async () => {
    conversationMock.findOne.mockResolvedValue({ id: 'c1' });
    messageMock.find.mockReturnValue(
      query([
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello' }
      ])
    );
    const res = createRes();

    await controller.exportConversation(req({ params: { id: 'c1' }, query: { format: 'md' } }), res);

    expect(res.contentType).toBe('text/markdown');
    expect(res.body).toBe('## user\n\nhi\n\n## assistant\n\nhello');
  });
});

describe('streamMessage', () => {
  it('404s for an unknown conversation', async () => {
    conversationMock.findOne.mockResolvedValue(null);
    const res = createRes();

    await controller.streamMessage(req({ params: { id: 'c1' }, body: { content: 'hi' } }), res);

    expect(res.statusCode).toBe(404);
    expect(messageMock.create).not.toHaveBeenCalled();
  });

  it.each([['', 'empty'], ['   ', 'whitespace-only'], [undefined, 'missing']])(
    'rejects %s (%s) content',
    async (content) => {
      conversationMock.findOne.mockResolvedValue({ id: 'c1' });
      const res = createRes();

      await controller.streamMessage(req({ params: { id: 'c1' }, body: { content } }), res);

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: 'Message content required' });
      expect(streamChatCompletion).not.toHaveBeenCalled();
    }
  );

  it('streams tokens over SSE, persists both messages and titles a new conversation', async () => {
    const conversation = {
      id: 'c1',
      title: 'New conversation',
      systemPrompt: 'You are Jack.',
      save: vi.fn()
    };
    conversationMock.findOne.mockResolvedValue(conversation);
    messageMock.create.mockResolvedValue({});
    messageMock.find.mockReturnValue(
      query([
        { role: 'assistant', content: 'earlier answer' },
        { role: 'user', content: 'earlier question' }
      ])
    );
    streamChatCompletion.mockImplementation(async ({ onToken }) => {
      onToken('Hel');
      onToken('lo');
      return 'Hello';
    });
    const res = createRes();

    await controller.streamMessage(
      req({ params: { id: 'c1' }, body: { content: '  How do I test this?\nsecond line  ' } }),
      res
    );

    expect(messageMock.create).toHaveBeenNthCalledWith(1, {
      conversationId: 'c1',
      userId: 'user-1',
      role: 'user',
      content: 'How do I test this?\nsecond line'
    });

    const findChain = messageMock.find.mock.results[0].value;
    expect(findChain.calls.limit).toEqual([20]);

    // Oldest-first history prefixed by the system prompt.
    expect(streamChatCompletion.mock.calls[0][0].messages).toEqual([
      { role: 'system', content: 'You are Jack.' },
      { role: 'user', content: 'earlier question' },
      { role: 'assistant', content: 'earlier answer' }
    ]);

    expect(res.headers['Content-Type']).toBe('text/event-stream');
    expect(sseTokens(res)).toEqual(['Hel', 'lo']);
    expect(res.chunks.at(-1)).toBe('data: {"done":true}\n\n');
    expect(res.ended).toBe(true);

    expect(messageMock.create).toHaveBeenNthCalledWith(2, {
      conversationId: 'c1',
      userId: 'user-1',
      role: 'assistant',
      content: 'Hello'
    });

    expect(conversation.title).toBe('  How do I test this?');
    expect(conversation.save).toHaveBeenCalled();
  });

  it('truncates a generated title to 60 characters', async () => {
    const conversation = { id: 'c1', title: 'New conversation', systemPrompt: 'sys', save: vi.fn() };
    conversationMock.findOne.mockResolvedValue(conversation);
    messageMock.create.mockResolvedValue({});
    messageMock.find.mockReturnValue(query([]));
    streamChatCompletion.mockResolvedValue('ok');

    await controller.streamMessage(
      req({ params: { id: 'c1' }, body: { content: 'a'.repeat(120) } }),
      createRes()
    );

    expect(conversation.title).toBe('a'.repeat(60));
  });

  it('falls back to a generic title when the first line is empty', async () => {
    const conversation = { id: 'c1', title: 'New conversation', systemPrompt: 'sys', save: vi.fn() };
    conversationMock.findOne.mockResolvedValue(conversation);
    messageMock.create.mockResolvedValue({});
    messageMock.find.mockReturnValue(query([]));
    streamChatCompletion.mockResolvedValue('ok');

    await controller.streamMessage(req({ params: { id: 'c1' }, body: { content: '\nhi' } }), createRes());

    expect(conversation.title).toBe('Conversation');
  });

  it('keeps an existing title and bumps updatedAt instead', async () => {
    const conversation = {
      id: 'c1',
      title: 'Trip planning',
      systemPrompt: 'sys',
      updatedAt: new Date('2020-01-01T00:00:00Z'),
      save: vi.fn()
    };
    conversationMock.findOne.mockResolvedValue(conversation);
    messageMock.create.mockResolvedValue({});
    messageMock.find.mockReturnValue(query([]));
    streamChatCompletion.mockResolvedValue('ok');

    await controller.streamMessage(req({ params: { id: 'c1' }, body: { content: 'hi' } }), createRes());

    expect(conversation.title).toBe('Trip planning');
    expect(conversation.updatedAt.getTime()).toBeGreaterThan(new Date('2020-01-01T00:00:00Z').getTime());
    expect(conversation.save).toHaveBeenCalled();
  });
});
