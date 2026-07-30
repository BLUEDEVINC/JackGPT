import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { signAuthToken } from '../utils/token.js';
import { requireEmail, requirePassword, requireString } from '../utils/validate.js';

const googleClient = config.googleClientId ? new OAuth2Client(config.googleClientId) : null;

export async function signup(req, res) {
  const name = requireString(req.body?.name, 'name', { max: 80 });
  const email = requireEmail(req.body?.email);
  const password = requirePassword(req.body?.password);

  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash, authProvider: 'local' });

  const token = signAuthToken(user);
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
}

export async function signin(req, res) {
  const email = requireEmail(req.body?.email);
  const password = requirePassword(req.body?.password);

  const user = await User.findOne({ email });
  if (!user?.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signAuthToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
}

export async function googleSignIn(req, res) {
  if (!googleClient) return res.status(400).json({ error: 'Google auth not configured' });
  const idToken = requireString(req.body?.idToken, 'idToken', { max: 4096 });

  const ticket = await googleClient.verifyIdToken({ idToken, audience: config.googleClientId });
  const payload = ticket.getPayload();
  if (!payload?.email || payload.email_verified !== true) {
    return res.status(401).json({ error: 'Google account email is not verified' });
  }

  const email = payload.email.toLowerCase();
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name: payload.name || email,
      email,
      avatarUrl: payload.picture,
      authProvider: 'google'
    });
  }

  const token = signAuthToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
}

export function me(req, res) {
  res.json({ user: { id: req.user.id, name: req.user.name, email: req.user.email, avatarUrl: req.user.avatarUrl } });
}
