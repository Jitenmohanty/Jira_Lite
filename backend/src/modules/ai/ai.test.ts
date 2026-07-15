import { describe, expect, it } from 'vitest';
import { contentHash, toVectorLiteral } from './embeddings';
import { isRateLimited, retryAfterMs } from './provider-errors';

describe('embeddings helpers', () => {
  it('contentHash is stable and content-sensitive', () => {
    expect(contentHash('TRC-1: fix login')).toBe(contentHash('TRC-1: fix login'));
    expect(contentHash('TRC-1: fix login')).not.toBe(contentHash('TRC-1: fix logout'));
  });

  it('toVectorLiteral formats a pgvector literal', () => {
    expect(toVectorLiteral([0.1, -0.2, 0.3])).toBe('[0.1,-0.2,0.3]');
  });
});

describe('provider-errors (AI queue auto-pause)', () => {
  it('treats 429 and 529 as rate-limited, everything else as fatal', () => {
    expect(isRateLimited({ status: 429 })).toBe(true);
    expect(isRateLimited({ status: 529 })).toBe(true);
    expect(isRateLimited({ status: 401 })).toBe(false);
    expect(isRateLimited({ status: 500 })).toBe(false);
    expect(isRateLimited(new Error('boom'))).toBe(false);
  });

  it('honors retry-after, falling back when absent/invalid', () => {
    expect(retryAfterMs({ headers: { 'retry-after': '30' } }, 15_000)).toBe(30_000);
    expect(retryAfterMs({ headers: {} }, 15_000)).toBe(15_000);
    expect(retryAfterMs({ headers: { 'retry-after': 'soon' } }, 5_000)).toBe(5_000);
    expect(retryAfterMs(new Error('boom'), 5_000)).toBe(5_000);
  });
});
