import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function signAuthToken(user) {
  return jwt.sign({ sub: user._id.toString(), email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
}
