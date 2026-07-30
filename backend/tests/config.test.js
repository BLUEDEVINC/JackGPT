import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ENV_KEYS = [
  'PORT',
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'CLIENT_URL',
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  'GOOGLE_CLIENT_ID'
];

let saved;

async function loadConfig() {
  vi.resetModules();
  vi.doMock('dotenv', () => ({ default: { config: () => ({}) } }));
  return (await import('../src/config.js')).config;
}

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  ENV_KEYS.forEach((key) => delete process.env[key]);
});

afterEach(() => {
  ENV_KEYS.forEach((key) => {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  });
  vi.doUnmock('dotenv');
  vi.resetModules();
});

describe('config', () => {
  it('falls back to development defaults when env vars are absent', async () => {
    const config = await loadConfig();

    expect(config).toEqual({
      port: 4000,
      mongoUri: 'mongodb://127.0.0.1:27017/chatgpt-clone',
      jwtSecret: 'change-me-in-production',
      jwtExpiresIn: '7d',
      clientUrl: 'http://localhost:5173',
      openaiApiKey: '',
      openaiModel: 'gpt-4o-mini',
      googleClientId: ''
    });
  });

  it('reads overrides from the environment and coerces the port to a number', async () => {
    process.env.PORT = '8080';
    process.env.MONGO_URI = 'mongodb://db:27017/app';
    process.env.JWT_SECRET = 'secret';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.CLIENT_URL = 'https://app.example.com';
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.OPENAI_MODEL = 'gpt-4o';
    process.env.GOOGLE_CLIENT_ID = 'google-id';

    const config = await loadConfig();

    expect(config.port).toBe(8080);
    expect(config.mongoUri).toBe('mongodb://db:27017/app');
    expect(config.jwtSecret).toBe('secret');
    expect(config.jwtExpiresIn).toBe('1h');
    expect(config.clientUrl).toBe('https://app.example.com');
    expect(config.openaiApiKey).toBe('sk-test');
    expect(config.openaiModel).toBe('gpt-4o');
    expect(config.googleClientId).toBe('google-id');
  });
});
