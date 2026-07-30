import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const INSECURE_JWT_SECRETS = ['change-me-in-production', 'replace-with-long-random-string', 'secret'];

function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32 || INSECURE_JWT_SECRETS.includes(secret)) {
    throw new Error(
      'JWT_SECRET must be set to a random string of at least 32 characters. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
    );
  }

  return secret;
}

export const config = {
  isProduction,
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chatgpt-clone',
  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  googleClientId: process.env.GOOGLE_CLIENT_ID || ''
};
