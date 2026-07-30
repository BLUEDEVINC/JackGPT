import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { signAuthToken } from '../utils/token.js';
import { badRequest, conflict, unauthorized } from '../utils/httpError.js';

const googleClient = config.googleClientId ? new OAuth2Client(config.googleClientId) : null;

export async function signup(req, res) {
  const { name, email, password } = req.body ?? {};
  if (!name || !email || !password) throw badRequest('Missing required fields');

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw conflict('Email already registered');

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email: email.toLowerCase(), passwordHash, authProvider: 'local' });

  const token = signAuthToken(user);
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
}

export async function signin(req, res) {
  const { email, password } = req.body ?? {};
  if (!email || !password) throw badRequest('Email and password are required');

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user?.passwordHash) throw unauthorized('Invalid credentials');

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw unauthorized('Invalid credentials');

  const token = signAuthToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
}

export async function googleSignIn(req, res) {
  if (!googleClient) throw badRequest('Google auth not configured');
  const { idToken } = req.body ?? {};
  if (!idToken) throw badRequest('Missing idToken');

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: config.googleClientId });
    payload = ticket.getPayload();
  } catch (err) {
    // A token Google refuses is a client problem, not a server fault.
    throw unauthorized('Google token verification failed', { cause: err });
  }

  if (!payload?.email) throw unauthorized('Google token did not contain an email');
  if (payload.email_verified === false) throw unauthorized('Google account email is not verified');

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
