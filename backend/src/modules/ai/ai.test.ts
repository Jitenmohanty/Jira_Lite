import { describe, expect, it } from 'vitest';
import { contentHash, toVectorLiteral } from './embeddings';
import { isFatalClientError, isRateLimited, retryAfterMs } from './provider-errors';

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
  it('treats Gemini 429 and 503 as rate-limited, everything else as fatal', () => {
    expect(isRateLimited({ status: 429 })).toBe(true);
    expect(isRateLimited({ status: 503 })).toBe(true);
    expect(isRateLimited({ status: 401 })).toBe(false);
    expect(isRateLimited({ status: 500 })).toBe(false);
    expect(isRateLimited(new Error('boom'))).toBe(false);
  });

  it('fails fast on non-429 client errors, not on 429/5xx/network', () => {
    expect(isFatalClientError({ status: 400 })).toBe(true); // bad request / invalid key
    expect(isFatalClientError({ status: 403 })).toBe(true);
    expect(isFatalClientError({ status: 429 })).toBe(false); // rate limit -> retry
    expect(isFatalClientError({ status: 503 })).toBe(false); // overloaded -> retry
    expect(isFatalClientError(new Error('network'))).toBe(false);
  });

  it('honors retry-after, falling back when absent/invalid', () => {
    expect(retryAfterMs({ headers: { 'retry-after': '30' } }, 30_000)).toBe(30_000);
    expect(retryAfterMs({ headers: {} }, 30_000)).toBe(30_000);
    expect(retryAfterMs({ headers: { 'retry-after': 'soon' } }, 5_000)).toBe(5_000);
    expect(retryAfterMs(new Error('boom'), 5_000)).toBe(5_000);
  });
});
