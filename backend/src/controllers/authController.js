import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { signAuthToken } from '../utils/token.js';
import { badRequest, sendError, unauthorized } from '../utils/http.js';
import { normalizeEmail, publicUser } from '../utils/presenters.js';

const googleClient = config.googleClientId ? new OAuth2Client(config.googleClientId) : null;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function sendAuthResponse(res, user, status = 200) {
  res.status(status).json({ token: signAuthToken(user), user: publicUser(user) });
}

export async function signup(req, res) {
  const { name, email, password } = req.body;
  if (!name?.trim() || !email || !password) return badRequest(res, 'Missing required fields');
  if (!EMAIL_PATTERN.test(email)) return badRequest(res, 'Invalid email address');
  if (password.length < MIN_PASSWORD_LENGTH) {
    return badRequest(res, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let user;
  try {
    user = await User.create({ name: name.trim(), email: normalizeEmail(email), passwordHash, authProvider: 'local' });
  } catch (err) {
    if (err.code === 11000) return sendError(res, 409, 'Email already registered');
    throw err;
  }

  sendAuthResponse(res, user, 201);
}

export async function signin(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return badRequest(res, 'Missing required fields');

  const user = await User.findOne({ email: normalizeEmail(email) });
  if (!user?.passwordHash) return unauthorized(res, 'Invalid credentials');

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return unauthorized(res, 'Invalid credentials');

  sendAuthResponse(res, user);
}

export async function googleSignIn(req, res) {
  if (!googleClient) return badRequest(res, 'Google auth not configured');
  const { idToken } = req.body;
  if (!idToken) return badRequest(res, 'Missing idToken');

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: config.googleClientId });
    payload = ticket.getPayload();
  } catch {
    return unauthorized(res, 'Invalid Google token');
  }

  if (!payload?.email || !payload.email_verified) {
    return unauthorized(res, 'Google account email is not verified');
  }

  const email = normalizeEmail(payload.email);
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ name: payload.name || email, email, avatarUrl: payload.picture, authProvider: 'google' });
  } else if (user.authProvider !== 'google') {
    return sendError(res, 409, 'This email is registered with a password. Sign in with your password instead.');
  }

  sendAuthResponse(res, user);
}

export function me(req, res) {
  res.json({ user: publicUser(req.user) });
}
