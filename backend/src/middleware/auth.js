import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { unauthorized } from '../utils/httpError.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next(unauthorized('Unauthorized'));
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch (err) {
    const message = err instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token';
    return next(unauthorized(message, { cause: err }));
  }

  try {
    // Lookup failures are infrastructure problems, not bad credentials, so they
    // must surface as 5xx instead of being reported as an invalid token.
    const user = await User.findById(payload.sub);
    if (!user) return next(unauthorized('Invalid user'));
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
