import { afterEach, describe, expect, it, vi } from 'vitest';

const create = vi.fn();

vi.mock('openai', () => ({
  default: class {
    constructor(options) {
      this.options = options;
      this.chat = { completions: { create: (...args) => create(...args) } };
    }
  }
}));

async function loadService({ openaiApiKey, openaiModel = 'gpt-4o-mini' }) {
  vi.resetModules();
  vi.doMock('../src/config.js', () => ({ config: { openaiApiKey, openaiModel } }));
  return import('../src/services/openaiService.js');
}

function stream(chunks) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk;
    }
  };
}

afterEach(() => {
  create.mockReset();
  vi.doUnmock('../src/config.js');
  vi.resetModules();
});

describe('streamChatCompletion without an API key', () => {
  it('streams a word-by-word fallback message and never calls OpenAI', async () => {
    const { streamChatCompletion } = await loadService({ openaiApiKey: '' });
    const tokens = [];

    const text = await streamChatCompletion({ messages: [], onToken: (t) => tokens.push(t) });

    expect(text).toContain('OpenAI key missing on backend');
    expect(tokens.length).toBeGreaterThan(1);
    expect(tokens.every((token) => token.endsWith(' '))).toBe(true);
    expect(tokens.join('').trim()).toBe(text);
    expect(create).not.toHaveBeenCalled();
  });
});

describe('streamChatCompletion with an API key', () => {
  it('forwards the configured model and streaming options', async () => {
    const { streamChatCompletion } = await loadService({ openaiApiKey: 'sk-test', openaiModel: 'gpt-4o' });
    create.mockResolvedValue(stream([]));
    const messages = [{ role: 'user', content: 'hi' }];

    await streamChatCompletion({ messages, onToken: () => {} });

    expect(create).toHaveBeenCalledWith({
      model: 'gpt-4o',
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 900
    });
  });

  it('accumulates delta content and emits each token', async () => {
    const { streamChatCompletion } = await loadService({ openaiApiKey: 'sk-test' });
    create.mockResolvedValue(
      stream([
        { choices: [{ delta: { content: 'Hello' } }] },
        { choices: [{ delta: { content: ' world' } }] }
      ])
    );
    const tokens = [];

    const text = await streamChatCompletion({ messages: [], onToken: (t) => tokens.push(t) });

    expect(tokens).toEqual(['Hello', ' world']);
    expect(text).toBe('Hello world');
  });

  it('skips empty, missing and malformed chunks', async () => {
    const { streamChatCompletion } = await loadService({ openaiApiKey: 'sk-test' });
    create.mockResolvedValue(
      stream([
        {},
        { choices: [] },
        { choices: [{ delta: {} }] },
        { choices: [{ delta: { content: '' } }] },
        { choices: [{ delta: { content: 'ok' } }] }
      ])
    );
    const tokens = [];

    const text = await streamChatCompletion({ messages: [], onToken: (t) => tokens.push(t) });

    expect(tokens).toEqual(['ok']);
    expect(text).toBe('ok');
  });

  it('propagates errors raised while opening the stream', async () => {
    const { streamChatCompletion } = await loadService({ openaiApiKey: 'sk-test' });
    create.mockRejectedValue(new Error('rate limited'));

    await expect(streamChatCompletion({ messages: [], onToken: () => {} })).rejects.toThrow('rate limited');
  });
});
