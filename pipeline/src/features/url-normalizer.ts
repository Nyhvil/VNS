import { NormalizedUrl } from '../types';

// Known URL shortener domains
const URL_SHORTENER_DOMAINS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'short.link',
  'buff.ly', 'adf.ly', 'tiny.cc', 'is.gd', 'cli.gs', 'pic.gd',
  'digg.com', 'tr.im', 'su.pr', 'twurl.nl', 'snipurl.com',
  'short.to', 'BudURL.com', 'ping.fm', 'post.ly', 'Just.as',
  'bkite.com', 'snipr.com', 'fic.kr', 'loopt.us', 'doiop.com',
  'twitthis.com', 'htxt.it', 'AltURL.com', 'RedirX.com', 'DigBig.com',
  'url.ie', 'u.nu', 'x.co', 'prettylinkpro.com', 'viralurl.com',
  'budurl.com', 'qr.net', 'cutt.ly', 'rb.gy', 'shorturl.at',
]);

// Regex to detect IP-based URLs (IPv4)
const IP_URL_REGEX = /^https?:\/\/(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/|$)/i;

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const scheme = parsed.protocol.toLowerCase();
    const host = parsed.host.toLowerCase();
    // For URLs with a host (http/https/ftp), normalize scheme+host, preserve path case
    if (host) {
      return `${scheme}//${host}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    // For opaque URLs (no host, e.g. "A:A"), lowercase everything for idempotence
    return url.toLowerCase();
  } catch {
    // If URL is invalid, return fully lowercase version (idempotent)
    return url.toLowerCase();
  }
}

export function isIpBasedUrl(url: string): boolean {
  return IP_URL_REGEX.test(url);
}

export function isUrlShortener(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    // Check exact match and www. prefix
    return URL_SHORTENER_DOMAINS.has(host) || URL_SHORTENER_DOMAINS.has(host.replace(/^www\./, ''));
  } catch {
    return false;
  }
}

export function normalizeAndAnalyzeUrl(url: string): NormalizedUrl {
  return {
    original: url,
    normalized: normalizeUrl(url),
    is_ip_based: isIpBasedUrl(url),
    is_shortener: isUrlShortener(url),
  };
}
