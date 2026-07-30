import dotenv from 'dotenv';

const result = dotenv.config();
if (result.error && result.error.code !== 'ENOENT') {
  throw new Error(`Failed to load .env file: ${result.error.message}`);
}

const DEV_JWT_SECRET = 'change-me-in-production';

function parsePort(value) {
  const port = Number(value ?? 4000);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT value: ${value}`);
  }
  return port;
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parsePort(process.env.PORT),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chatgpt-clone',
  jwtSecret: process.env.JWT_SECRET || DEV_JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  googleClientId: process.env.GOOGLE_CLIENT_ID || ''
};

if (config.env === 'production') {
  const missing = [];
  if (!process.env.JWT_SECRET || config.jwtSecret === DEV_JWT_SECRET) missing.push('JWT_SECRET');
  if (!process.env.MONGO_URI) missing.push('MONGO_URI');
  if (missing.length) {
    throw new Error(`Refusing to start in production without: ${missing.join(', ')}`);
  }
} else if (config.jwtSecret === DEV_JWT_SECRET) {
  console.warn('JWT_SECRET is not set; using an insecure development default.');
}

if (!config.openaiApiKey) {
  console.warn('OPENAI_API_KEY is not set; assistant replies will return a configuration error.');
}
