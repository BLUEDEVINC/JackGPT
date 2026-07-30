import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { signAuthToken } from '../utils/token.js';

const googleClient = config.googleClientId ? new OAuth2Client(config.googleClientId) : null;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export async function signup(req, res) {
  const { name, email, password } = req.body;
  if (!name?.trim() || !email || !password) return res.status(400).json({ error: 'Missing required fields' });
  if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: 'Invalid email address' });
  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let user;
  try {
    user = await User.create({ name: name.trim(), email: email.toLowerCase(), passwordHash, authProvider: 'local' });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already registered' });
    throw err;
  }

  const token = signAuthToken(user);
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
}

export async function signin(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing required fields' });

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user?.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signAuthToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
}

export async function googleSignIn(req, res) {
  if (!googleClient) return res.status(400).json({ error: 'Google auth not configured' });
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'Missing idToken' });

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: config.googleClientId });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: 'Invalid Google token' });
  }

  if (!payload?.email || !payload.email_verified) {
    return res.status(401).json({ error: 'Google account email is not verified' });
  }

  const email = payload.email.toLowerCase();
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ name: payload.name || email, email, avatarUrl: payload.picture, authProvider: 'google' });
  } else if (user.authProvider !== 'google') {
    return res.status(409).json({ error: 'This email is registered with a password. Sign in with your password instead.' });
  }

  const token = signAuthToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
}

export function me(req, res) {
  res.json({ user: { id: req.user.id, name: req.user.name, email: req.user.email, avatarUrl: req.user.avatarUrl } });
}
