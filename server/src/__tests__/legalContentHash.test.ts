import { canonicalLegalPayload, computeLegalContentHash, hashIdempotencyPayload, stableStringify, verifyRevisionHash } from '../modules/legal/legalContentHash.js';

describe('legalContentHash', () => {
  it('computes stable SHA-256 for canonical payload', () => {
    const h1 = computeLegalContentHash('T', 'S', 'B');
    const h2 = computeLegalContentHash('T', 'S', 'B');
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('normalizes CRLF in body', () => {
    const a = computeLegalContentHash('T', 'S', 'a\r\nb');
    const b = computeLegalContentHash('T', 'S', 'a\nb');
    expect(a).toBe(b);
  });

  it('verifies revision hash', () => {
    const title = 'T';
    const summary = 'S';
    const body = 'B';
    const h = computeLegalContentHash(title, summary, body);
    expect(verifyRevisionHash({ title, summary, body, contentHash: h })).toBe(true);
    expect(verifyRevisionHash({ title, summary, body, contentHash: 'deadbeef' })).toBe(false);
  });

  it('stableStringify orders keys for idempotency hash', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
    expect(hashIdempotencyPayload({ b: 1, a: 2 })).toBe(hashIdempotencyPayload({ a: 2, b: 1 }));
  });

  it('canonicalLegalPayload joins title, summary, body', () => {
    expect(canonicalLegalPayload('a', 'b', 'c')).toBe('a\n\nb\n\nc');
  });
});
