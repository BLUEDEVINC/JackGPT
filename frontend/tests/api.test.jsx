import { beforeEach, describe, expect, it, vi } from 'vitest';

async function loadApi() {
  vi.resetModules();
  return (await import('../src/lib/api')).default;
}

beforeEach(() => {
  localStorage.clear();
});

describe('api client', () => {
  it('defaults the base URL to the local backend', async () => {
    const api = await loadApi();
    expect(api.defaults.baseURL).toBe('http://localhost:4000/api');
  });

  it('attaches a bearer token from localStorage on each request', async () => {
    const api = await loadApi();
    localStorage.setItem('auth_token', 'jwt-123');

    const config = await api.interceptors.request.handlers[0].fulfilled({ headers: {} });

    expect(config.headers.Authorization).toBe('Bearer jwt-123');
  });

  it('leaves the Authorization header unset when there is no token', async () => {
    const api = await loadApi();

    const config = await api.interceptors.request.handlers[0].fulfilled({ headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
  });

  it('reads the token per request rather than caching it at import time', async () => {
    const api = await loadApi();
    const interceptor = api.interceptors.request.handlers[0].fulfilled;

    localStorage.setItem('auth_token', 'first');
    expect((await interceptor({ headers: {} })).headers.Authorization).toBe('Bearer first');

    localStorage.setItem('auth_token', 'second');
    expect((await interceptor({ headers: {} })).headers.Authorization).toBe('Bearer second');
  });
});
