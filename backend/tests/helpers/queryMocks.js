import { vi } from 'vitest';

/**
 * Mongoose-style chainable query stub: sort/limit/lean return the same object,
 * and awaiting it resolves to `result`.
 */
export function query(result) {
  const chain = {
    calls: { sort: [], limit: [], lean: 0 },
    sort: vi.fn((arg) => {
      chain.calls.sort.push(arg);
      return chain;
    }),
    limit: vi.fn((arg) => {
      chain.calls.limit.push(arg);
      return chain;
    }),
    lean: vi.fn(() => {
      chain.calls.lean += 1;
      return chain;
    }),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject)
  };
  return chain;
}
