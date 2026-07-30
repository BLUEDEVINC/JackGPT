import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { signAuthToken } from '../utils/token.js';
import { badRequest, sendError, unauthorized } from '../utils/http.js';
import { normalizeEmail, publicUser } from '../utils/presenters.js';

const googleClient = config.googleClientId ? new OAuth2Client(config.googleClientId) : null;

function sendAuthResponse(res, user, status = 200) {
  res.status(status).json({ token: signAuthToken(user), user: publicUser(user) });
}

export async function signup(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return badRequest(res, 'Missing required fields');

  const existing = await User.findOne({ email: normalizeEmail(email) });
  if (existing) return sendError(res, 409, 'Email already registered');

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email: normalizeEmail(email), passwordHash, authProvider: 'local' });

  sendAuthResponse(res, user, 201);
}

export async function signin(req, res) {
  const { email, password } = req.body;
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

  const ticket = await googleClient.verifyIdToken({ idToken, audience: config.googleClientId });
  const payload = ticket.getPayload();

  let user = await User.findOne({ email: normalizeEmail(payload.email) });
  if (!user) {
    user = await User.create({
      name: payload.name,
      email: normalizeEmail(payload.email),
      avatarUrl: payload.picture,
      authProvider: 'google'
    });
  }

  sendAuthResponse(res, user);
}

export function me(req, res) {
  res.json({ user: publicUser(req.user) });
}
