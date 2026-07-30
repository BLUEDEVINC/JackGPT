import { vi } from 'vitest';

export function createRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    headers: {},
    contentType: undefined,
    chunks: [],
    ended: false
  };

  res.status = vi.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((payload) => {
    res.body = payload;
    return res;
  });
  res.send = vi.fn((payload) => {
    res.body = payload;
    return res;
  });
  res.type = vi.fn((value) => {
    res.contentType = value;
    return res;
  });
  res.setHeader = vi.fn((key, value) => {
    res.headers[key] = value;
  });
  res.write = vi.fn((chunk) => {
    res.chunks.push(chunk);
    return true;
  });
  res.end = vi.fn(() => {
    res.ended = true;
  });

  return res;
}

export function createReq(overrides = {}) {
  return { headers: {}, body: {}, params: {}, query: {}, ...overrides };
}

export function sseTokens(res) {
  return res.chunks
    .map((chunk) => JSON.parse(chunk.replace(/^data: /, '').trim()))
    .filter((event) => typeof event.token === 'string')
    .map((event) => event.token);
}
