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

/**
 * Expand an IPv6 address to its 8 16-bit groups. Handles `::` compression and a
 * trailing dotted-decimal IPv4 tail (e.g. `::ffff:1.2.3.4`). Returns null if the
 * input isn't a well-formed IPv6 literal.
 */
function expandIpv6(ip: string): number[] | null {
  let s = ip;
  // Fold a trailing dotted IPv4 (`…:a.b.c.d`) into two hex groups so the whole
  // address is uniform hex before we split it.
  if (s.includes('.')) {
    const lastColon = s.lastIndexOf(':');
    if (lastColon === -1) return null;
    const v4 = s.slice(lastColon + 1).split('.').map(Number);
    if (v4.length !== 4 || v4.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    const hi = ((v4[0]! << 8) | v4[1]!).toString(16);
    const lo = ((v4[2]! << 8) | v4[3]!).toString(16);
    s = `${s.slice(0, lastColon + 1)}${hi}:${lo}`;
  }

  const halves = s.split('::');
  if (halves.length > 2) return null; // more than one `::` is invalid
  const head = halves[0] ? halves[0]!.split(':') : [];
  let groups: string[];
  if (halves.length === 2) {
    const tail = halves[1] ? halves[1]!.split(':') : [];
    const missing = 8 - head.length - tail.length;
    if (missing < 0) return null;
    groups = [...head, ...Array<string>(missing).fill('0'), ...tail];
  } else {
    groups = head;
  }
  if (groups.length !== 8) return null;
  return groups.map((g) => parseInt(g || '0', 16));
}

function isBlockedIpv6(ip: string, loopbackOk = false): boolean {
  const g = expandIpv6(ip);
  if (!g) return true; // unparseable → block

  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible (::a.b.c.d): the first five
  // (or six) groups are zero and the address embeds an IPv4 in the last two.
  // Node's URL parser serializes these in HEX (e.g. `::ffff:7f00:1`), so we must
  // reconstruct the IPv4 from the group values rather than string-match dotted form.
  const firstFiveZero = g[0] === 0 && g[1] === 0 && g[2] === 0 && g[3] === 0 && g[4] === 0;
  if (firstFiveZero && g[5] === 0xffff) {
    return isBlockedIpv4(groupsToIpv4(g[6]!, g[7]!), loopbackOk); // IPv4-mapped
  }
  if (firstFiveZero && g[5] === 0) {
    if (g[6] === 0 && g[7] === 0) return true; // :: unspecified
    if (g[6] === 0 && g[7] === 1) return !loopbackOk; // ::1 loopback (relaxable in dev)
    return isBlockedIpv4(groupsToIpv4(g[6]!, g[7]!), loopbackOk); // IPv4-compatible / embedded
  }

  const head = g[0]!;
  if (head >= 0xfc00 && head <= 0xfdff) return true; // fc00::/7 unique-local
  if (head >= 0xfe80 && head <= 0xfebf) return true; // fe80::/10 link-local
  return false;
}

/** Rebuild a dotted-decimal IPv4 from the two low 16-bit groups of a v6 address. */
function groupsToIpv4(hi: number, lo: number): string {
  return `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
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
