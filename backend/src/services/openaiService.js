import OpenAI from 'openai';
import { config } from '../config.js';

const openai = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;

export async function streamChatCompletion({ messages, onToken }) {
  if (!openai) {
    const fallback = 'OpenAI key missing on backend. Add OPENAI_API_KEY to enable AI responses.';
    fallback.split(' ').forEach((w) => onToken(`${w} `));
    return fallback;
  }

  const stream = await openai.chat.completions.create({
    model: config.openaiModel,
    messages,
    stream: true,
    temperature: 0.7,
    max_tokens: 900
  });

  let fullText = '';
  for await (const event of stream) {
    const token = event.choices?.[0]?.delta?.content || '';
    if (!token) continue;
    fullText += token;
    onToken(token);
  }

  return fullText;
}
