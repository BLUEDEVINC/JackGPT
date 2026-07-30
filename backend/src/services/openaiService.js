import OpenAI from 'openai';
import { config } from '../config.js';
import { HttpError, badGateway } from '../utils/httpError.js';

const openai = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;

function toHttpError(err) {
  if (err instanceof HttpError) return err;

  const status = err?.status ?? err?.response?.status;
  const detail = err?.message || 'Unknown upstream error';

  if (status === 401 || status === 403) {
    return new HttpError(502, 'OpenAI rejected the configured API key.', { cause: err });
  }
  if (status === 429) {
    return new HttpError(429, 'OpenAI rate limit reached. Please retry shortly.', { cause: err });
  }
  if (status === 400) {
    return new HttpError(400, `OpenAI rejected the request: ${detail}`, { cause: err });
  }
  return badGateway(`Upstream AI request failed: ${detail}`, { cause: err });
}

export async function streamChatCompletion({ messages, onToken }) {
  if (!openai) {
    throw new HttpError(503, 'OpenAI key missing on backend. Add OPENAI_API_KEY to enable AI responses.', {
      code: 'openai_not_configured',
      expose: true
    });
  }

  let stream;
  try {
    stream = await openai.chat.completions.create({
      model: config.openaiModel,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 900
    });
  } catch (err) {
    throw toHttpError(err);
  }

  let fullText = '';
  try {
    for await (const event of stream) {
      const token = event.choices?.[0]?.delta?.content || '';
      if (!token) continue;
      fullText += token;
      onToken(token);
    }
  } catch (err) {
    // Mid-stream failure: surface it with whatever was already generated so the
    // caller can persist the partial reply instead of losing it silently.
    const httpError = toHttpError(err);
    httpError.partialText = fullText;
    throw httpError;
  }

  return fullText;
}
