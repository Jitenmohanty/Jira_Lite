import { describe, expect, it } from 'vitest';
import { generateApiKey, hashApiKey, hashesEqual, looksLikeApiKey } from './api-key';
import { signWebhook } from './webhook-signature';
import { _internal } from './ssrf';

describe('api-key', () => {
  it('generates a trc_ key whose stored hash matches a re-hash of the raw', () => {
    const { raw, hash, prefix } = generateApiKey();
    expect(raw.startsWith('trc_')).toBe(true);
    expect(looksLikeApiKey(raw)).toBe(true);
    expect(prefix).toBe(raw.slice(0, 12));
    expect(hashApiKey(raw)).toBe(hash); // lookup by re-hashing works
    expect(hash).not.toContain(raw); // raw is not embedded in the hash
  });

  it('rejects non-keys and compares hashes in constant time', () => {
    expect(looksLikeApiKey('Bearer something')).toBe(false);
    expect(looksLikeApiKey('trc_short')).toBe(false);
    expect(hashesEqual('abc', 'abc')).toBe(true);
    expect(hashesEqual('abc', 'abd')).toBe(false);
    expect(hashesEqual('abc', 'abcd')).toBe(false);
  });
});

describe('webhook signature', () => {
  it('is deterministic and changes with body, timestamp, or secret', () => {
    const base = signWebhook('secret', '1000', '{"a":1}');
    expect(base).toMatch(/^sha256=[0-9a-f]{64}$/);
    expect(signWebhook('secret', '1000', '{"a":1}')).toBe(base); // deterministic
    expect(signWebhook('secret', '1000', '{"a":2}')).not.toBe(base); // body
    expect(signWebhook('secret', '1001', '{"a":1}')).not.toBe(base); // timestamp
    expect(signWebhook('other', '1000', '{"a":1}')).not.toBe(base); // secret
  });
});

describe('ssrf isBlockedIp', () => {
  const { isBlockedIp } = _internal;
  it('blocks private / loopback / link-local / metadata addresses', () => {
    for (const ip of [
      '127.0.0.1', '10.0.0.5', '172.16.0.1', '172.31.255.255', '192.168.1.1',
      '169.254.169.254', // cloud metadata
      '100.64.0.1', '0.0.0.0', '224.0.0.1',
      '::1', 'fe80::1', 'fc00::1', 'fd12:3456::1', '::ffff:127.0.0.1',
    ]) {
      expect(isBlockedIp(ip), ip).toBe(true);
    }
  });
  it('allows genuinely public addresses', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '93.184.216.34', '172.15.0.1', '172.32.0.1', '2606:4700:4700::1111']) {
      expect(isBlockedIp(ip), ip).toBe(false);
    }
  });
  it('blocks anything that is not a valid IP', () => {
    expect(isBlockedIp('not-an-ip')).toBe(true);
    expect(isBlockedIp('')).toBe(true);
  });
});
