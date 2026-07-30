import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { unauthorized } from '../utils/http.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return unauthorized(res);
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(payload.sub);
    if (!user) return unauthorized(res, 'Invalid user');
    req.user = user;
    next();
  } catch {
    return unauthorized(res, 'Invalid token');
  }
}
