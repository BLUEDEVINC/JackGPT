import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { signAuthToken } from '../utils/token.js';
import { badRequest, sendError, unauthorized } from '../utils/http.js';
import { publicUser } from '../utils/presenters.js';
import { requireEmail, requirePassword, requireString } from '../utils/validate.js';

const googleClient = config.googleClientId ? new OAuth2Client(config.googleClientId) : null;

function sendAuthResponse(res, user, status = 200) {
  res.status(status).json({ token: signAuthToken(user), user: publicUser(user) });
}

export async function signup(req, res) {
  const name = requireString(req.body?.name, 'name', { max: 80 });
  const email = requireEmail(req.body?.email);
  const password = requirePassword(req.body?.password);

  const existing = await User.findOne({ email });
  if (existing) return sendError(res, 409, 'Email already registered');

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash, authProvider: 'local' });

  sendAuthResponse(res, user, 201);
}

export async function signin(req, res) {
  const email = requireEmail(req.body?.email);
  const password = requirePassword(req.body?.password);

  const user = await User.findOne({ email });
  if (!user?.passwordHash) return unauthorized(res, 'Invalid credentials');

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return unauthorized(res, 'Invalid credentials');

  sendAuthResponse(res, user);
}

export async function googleSignIn(req, res) {
  if (!googleClient) return badRequest(res, 'Google auth not configured');
  const idToken = requireString(req.body?.idToken, 'idToken', { max: 4096 });

  const ticket = await googleClient.verifyIdToken({ idToken, audience: config.googleClientId });
  const payload = ticket.getPayload();
  if (!payload?.email || payload.email_verified !== true) {
    return unauthorized(res, 'Google account email is not verified');
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

  sendAuthResponse(res, user);
}

export function me(req, res) {
  res.json({ user: publicUser(req.user) });
}
