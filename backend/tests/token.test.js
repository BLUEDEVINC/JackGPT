import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { signAuthToken } from '../src/utils/token.js';
import { config } from '../src/config.js';

describe('signAuthToken', () => {
  it('signs a verifiable token carrying the user id and email', () => {
    const token = signAuthToken({ _id: '507f1f77bcf86cd799439011', email: 'jack@example.com' });
    const payload = jwt.verify(token, config.jwtSecret);

    expect(payload.sub).toBe('507f1f77bcf86cd799439011');
    expect(payload.email).toBe('jack@example.com');
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it('stringifies non-string ids', () => {
    const token = signAuthToken({ _id: { toString: () => 'object-id' }, email: 'a@b.c' });
    expect(jwt.verify(token, config.jwtSecret).sub).toBe('object-id');
  });

  it('produces a token that fails verification with a different secret', () => {
    const token = signAuthToken({ _id: '1', email: 'a@b.c' });
    expect(() => jwt.verify(token, 'not-the-secret')).toThrow();
  });
});
