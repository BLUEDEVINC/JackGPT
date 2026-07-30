import { describe, expect, it, vi } from 'vitest';
import { createReq, createRes } from './helpers/httpMocks.js';

vi.mock('../src/config.js', () => ({
  config: { jwtSecret: 'test-secret', jwtExpiresIn: '1h', googleClientId: '' }
}));

vi.mock('../src/models/User.js', () => ({ User: { findOne: vi.fn(), create: vi.fn() } }));

const { googleSignIn } = await import('../src/controllers/authController.js');

describe('googleSignIn without GOOGLE_CLIENT_ID', () => {
  it('reports that google auth is not configured', async () => {
    const res = createRes();

    await googleSignIn(createReq({ body: { idToken: 'token' } }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Google auth not configured' });
  });
});
