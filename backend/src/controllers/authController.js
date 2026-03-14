import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { signAuthToken } from '../utils/token.js';

const googleClient = config.googleClientId ? new OAuth2Client(config.googleClientId) : null;

export async function signup(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing required fields' });

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email: email.toLowerCase(), passwordHash, authProvider: 'local' });

  const token = signAuthToken(user);
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
}

export async function signin(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() });
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

  const ticket = await googleClient.verifyIdToken({ idToken, audience: config.googleClientId });
  const payload = ticket.getPayload();

  let user = await User.findOne({ email: payload.email.toLowerCase() });
  if (!user) {
    user = await User.create({
      name: payload.name,
      email: payload.email.toLowerCase(),
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
