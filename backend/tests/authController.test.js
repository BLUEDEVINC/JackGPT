import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { createReq, createRes } from './helpers/httpMocks.js';

const findOne = vi.fn();
const create = vi.fn();
const verifyIdToken = vi.fn();

vi.mock('../src/config.js', () => ({
  config: {
    jwtSecret: 'test-secret',
    jwtExpiresIn: '1h',
    googleClientId: 'google-client-id'
  }
}));

vi.mock('../src/models/User.js', () => ({
  User: {
    findOne: (...args) => findOne(...args),
    create: (...args) => create(...args)
  }
}));

vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    constructor(clientId) {
      this.clientId = clientId;
    }

    verifyIdToken(...args) {
      return verifyIdToken(...args);
    }
  }
}));

const { signup, signin, googleSignIn, me } = await import('../src/controllers/authController.js');
const bcrypt = (await import('bcryptjs')).default;

function decode(token) {
  return jwt.verify(token, 'test-secret');
}

beforeEach(() => {
  findOne.mockReset();
  create.mockReset();
  verifyIdToken.mockReset();
});

describe('signup', () => {
  it.each([
    ['name', { email: 'a@b.c', password: 'pw' }],
    ['email', { name: 'Jack', password: 'pw' }],
    ['password', { name: 'Jack', email: 'a@b.c' }]
  ])('rejects a body missing %s', async (_field, body) => {
    const res = createRes();
    await signup(createReq({ body }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Missing required fields' });
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects an already registered email, matched case-insensitively', async () => {
    findOne.mockResolvedValue({ id: 'existing' });
    const res = createRes();

    await signup(createReq({ body: { name: 'Jack', email: 'Jack@Example.COM', password: 'pw' } }), res);

    expect(findOne).toHaveBeenCalledWith({ email: 'jack@example.com' });
    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({ error: 'Email already registered' });
  });

  it('creates a local user with a hashed password and returns a token', async () => {
    findOne.mockResolvedValue(null);
    create.mockImplementation(async (doc) => ({
      ...doc,
      id: 'user-1',
      _id: { toString: () => 'user-1' }
    }));
    const res = createRes();

    await signup(createReq({ body: { name: 'Jack', email: 'JACK@example.com', password: 'hunter2' } }), res);

    const created = create.mock.calls[0][0];
    expect(created.email).toBe('jack@example.com');
    expect(created.authProvider).toBe('local');
    expect(created.passwordHash).not.toBe('hunter2');
    await expect(bcrypt.compare('hunter2', created.passwordHash)).resolves.toBe(true);

    expect(res.statusCode).toBe(201);
    expect(res.body.user).toEqual({ id: 'user-1', name: 'Jack', email: 'jack@example.com' });
    expect(decode(res.body.token)).toMatchObject({ sub: 'user-1', email: 'jack@example.com' });
  });
});

describe('signin', () => {
  it('returns 401 for an unknown email', async () => {
    findOne.mockResolvedValue(null);
    const res = createRes();

    await signin(createReq({ body: { email: 'nobody@example.com', password: 'pw' } }), res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid credentials' });
  });

  it('returns 401 for accounts without a password (e.g. google-only)', async () => {
    findOne.mockResolvedValue({ id: 'user-1', email: 'jack@example.com' });
    const res = createRes();

    await signin(createReq({ body: { email: 'jack@example.com', password: 'pw' } }), res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid credentials' });
  });

  it('returns 401 for a wrong password', async () => {
    findOne.mockResolvedValue({
      id: 'user-1',
      email: 'jack@example.com',
      passwordHash: await bcrypt.hash('correct', 4)
    });
    const res = createRes();

    await signin(createReq({ body: { email: 'jack@example.com', password: 'wrong' } }), res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid credentials' });
  });

  it('returns a token for valid credentials and lowercases the lookup email', async () => {
    findOne.mockResolvedValue({
      id: 'user-1',
      _id: { toString: () => 'user-1' },
      name: 'Jack',
      email: 'jack@example.com',
      passwordHash: await bcrypt.hash('correct', 4)
    });
    const res = createRes();

    await signin(createReq({ body: { email: 'JACK@example.com', password: 'correct' } }), res);

    expect(findOne).toHaveBeenCalledWith({ email: 'jack@example.com' });
    expect(res.status).not.toHaveBeenCalled();
    expect(res.body.user).toEqual({ id: 'user-1', name: 'Jack', email: 'jack@example.com' });
    expect(decode(res.body.token).sub).toBe('user-1');
  });

  it('handles a missing email without throwing', async () => {
    findOne.mockResolvedValue(null);
    const res = createRes();

    await signin(createReq({ body: {} }), res);

    expect(findOne).toHaveBeenCalledWith({ email: undefined });
    expect(res.statusCode).toBe(401);
  });
});

describe('googleSignIn', () => {
  it('rejects a request without an idToken', async () => {
    const res = createRes();

    await googleSignIn(createReq({ body: {} }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Missing idToken' });
  });

  it('signs in an existing user matched by lowercased email', async () => {
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({ email: 'Jack@Example.com', name: 'Jack', picture: 'https://img/a.png' })
    });
    findOne.mockResolvedValue({
      id: 'user-1',
      _id: { toString: () => 'user-1' },
      name: 'Jack',
      email: 'jack@example.com',
      avatarUrl: 'https://img/old.png'
    });
    const res = createRes();

    await googleSignIn(createReq({ body: { idToken: 'google-token' } }), res);

    expect(verifyIdToken).toHaveBeenCalledWith({ idToken: 'google-token', audience: 'google-client-id' });
    expect(create).not.toHaveBeenCalled();
    expect(res.body.user).toEqual({
      id: 'user-1',
      name: 'Jack',
      email: 'jack@example.com',
      avatarUrl: 'https://img/old.png'
    });
    expect(decode(res.body.token).sub).toBe('user-1');
  });

  it('provisions a google user on first sign in', async () => {
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({ email: 'NEW@Example.com', name: 'New User', picture: 'https://img/new.png' })
    });
    findOne.mockResolvedValue(null);
    create.mockImplementation(async (doc) => ({ ...doc, id: 'user-2', _id: { toString: () => 'user-2' } }));
    const res = createRes();

    await googleSignIn(createReq({ body: { idToken: 'google-token' } }), res);

    expect(create).toHaveBeenCalledWith({
      name: 'New User',
      email: 'new@example.com',
      avatarUrl: 'https://img/new.png',
      authProvider: 'google'
    });
    expect(res.body.user.id).toBe('user-2');
  });
});

describe('me', () => {
  it('echoes the authenticated user profile', () => {
    const res = createRes();

    me(
      createReq({
        user: { id: 'user-1', name: 'Jack', email: 'jack@example.com', avatarUrl: 'https://img/a.png' }
      }),
      res
    );

    expect(res.body).toEqual({
      user: { id: 'user-1', name: 'Jack', email: 'jack@example.com', avatarUrl: 'https://img/a.png' }
    });
  });
});
