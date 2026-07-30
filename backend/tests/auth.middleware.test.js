import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { createReq, createRes } from './helpers/httpMocks.js';

const findById = vi.fn();

vi.mock('../src/models/User.js', () => ({ User: { findById: (...args) => findById(...args) } }));

const { requireAuth } = await import('../src/middleware/auth.js');
const { config } = await import('../src/config.js');

function bearer(payload) {
  return `Bearer ${jwt.sign(payload, config.jwtSecret, { expiresIn: '1h' })}`;
}

beforeEach(() => {
  findById.mockReset();
});

describe('requireAuth', () => {
  it('rejects requests without an Authorization header', async () => {
    const res = createRes();
    const next = vi.fn();

    await requireAuth(createReq(), res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects Authorization headers that are not Bearer tokens', async () => {
    const res = createRes();
    const next = vi.fn();

    await requireAuth(createReq({ headers: { authorization: 'Basic abc' } }), res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
    expect(findById).not.toHaveBeenCalled();
  });

  it('rejects tokens that cannot be verified', async () => {
    const res = createRes();
    const next = vi.fn();

    await requireAuth(createReq({ headers: { authorization: 'Bearer tampered.token.value' } }), res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects expired tokens', async () => {
    const token = jwt.sign({ sub: 'user-1' }, config.jwtSecret, { expiresIn: -10 });
    const res = createRes();
    const next = vi.fn();

    await requireAuth(createReq({ headers: { authorization: `Bearer ${token}` } }), res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid token' });
  });

  it('rejects valid tokens whose user no longer exists', async () => {
    findById.mockResolvedValue(null);
    const res = createRes();
    const next = vi.fn();

    await requireAuth(createReq({ headers: { authorization: bearer({ sub: 'missing-user' }) } }), res, next);

    expect(findById).toHaveBeenCalledWith('missing-user');
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid user' });
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches the user and calls next for a valid token', async () => {
    const user = { id: 'user-1', email: 'jack@example.com' };
    findById.mockResolvedValue(user);
    const req = createReq({ headers: { authorization: bearer({ sub: 'user-1' }) } });
    const res = createRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(req.user).toBe(user);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when the user lookup throws', async () => {
    findById.mockRejectedValue(new Error('db down'));
    const res = createRes();
    const next = vi.fn();

    await requireAuth(createReq({ headers: { authorization: bearer({ sub: 'user-1' }) } }), res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid token' });
  });
});
