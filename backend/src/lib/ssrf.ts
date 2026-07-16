import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { env, isProd } from '../config/env';

/** Loopback is targetable only in dev, and only when explicitly opted in. */
const allowLoopback = () => !isProd && env.WEBHOOK_ALLOW_LOOPBACK;

/**
 * SSRF protection for outbound webhook delivery. Webhook URLs are user-supplied
 * and fetched by the server, so without validation an attacker could point one
 * at internal services or the cloud metadata endpoint (169.254.169.254) to
 * exfiltrate credentials. We:
 *   - allow only http/https (https-only in production),
 *   - resolve the hostname and reject if ANY resolved IP is private, loopback,
 *     link-local, unique-local, or otherwise non-public.
 *
 * `assertPublicUrl` is called both when a webhook is created and again at
 * delivery time — the second check defeats DNS-rebinding (a name that resolved
 * public at creation but flips to 127.0.0.1 at delivery).
 */

export class SsrfError extends Error {}

/** IPv4/IPv6 ranges that must never be reached from a server-side fetch.
 *  `loopbackOk` relaxes ONLY loopback (for opt-in local dev); every other
 *  private/link-local/metadata range stays blocked regardless. */
function isBlockedIp(ip: string, loopbackOk = false): boolean {
  const fam = isIP(ip);
  if (fam === 4) return isBlockedIpv4(ip, loopbackOk);
  if (fam === 6) return isBlockedIpv6(ip.toLowerCase(), loopbackOk);
  return true; // not a valid IP → block
}

function isBlockedIpv4(ip: string, loopbackOk = false): boolean {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p as [number, number, number, number];
  if (a === 127) return !loopbackOk; // loopback (relaxable in dev)
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 0) return true; // "this" network
  if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a >= 224) return true; // multicast/reserved (224.0.0.0/3)
  return false;
}

function isBlockedIpv6(ip: string, loopbackOk = false): boolean {
  if (ip === '::1') return !loopbackOk; // loopback (relaxable in dev)
  if (ip === '::') return true; // unspecified
  // IPv4-mapped (::ffff:a.b.c.d) — check the embedded IPv4.
  const mapped = ip.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIpv4(mapped[1]!, loopbackOk);
  const head = ip.split(':')[0] ?? '';
  if (head.startsWith('fc') || head.startsWith('fd')) return true; // fc00::/7 unique-local
  if (head.startsWith('fe8') || head.startsWith('fe9') || head.startsWith('fea') || head.startsWith('feb'))
    return true; // fe80::/10 link-local
  return false;
}

/**
 * Throws `SsrfError` unless `raw` is a well-formed http(s) URL whose host
 * resolves entirely to public IP addresses. Safe to call on untrusted input.
 */
export async function assertPublicUrl(raw: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SsrfError('Invalid URL');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new SsrfError('Webhook URL must use http or https');
  }
  if (isProd && url.protocol !== 'https:') {
    throw new SsrfError('Webhook URL must use https');
  }

  const loopbackOk = allowLoopback();
  const host = url.hostname.replace(/^\[|\]$/g, ''); // strip IPv6 brackets
  if (/^localhost$/i.test(host) && !loopbackOk) {
    throw new SsrfError('Webhook URL host is not allowed');
  }

  // If the host is a literal IP, check it directly; otherwise resolve it.
  if (isIP(host)) {
    if (isBlockedIp(host, loopbackOk)) throw new SsrfError('Webhook URL resolves to a non-public address');
    return;
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new SsrfError('Could not resolve webhook host');
  }
  if (addresses.length === 0) throw new SsrfError('Webhook host did not resolve');
  for (const { address } of addresses) {
    if (isBlockedIp(address, loopbackOk)) {
      throw new SsrfError('Webhook URL resolves to a non-public address');
    }
  }
}

// Exported for unit testing.
export const _internal = { isBlockedIp };
