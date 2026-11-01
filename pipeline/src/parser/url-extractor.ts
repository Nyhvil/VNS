/**
 * Find links in free text, including the forms scam messages use to slip past
 * filters that only look for "http://":
 *
 *   - bare domains:        bidv-nangcap.top, zalo-xacthuc.com/login
 *   - "defanged" links:    vietcombank[.]com, hxxps://abc(.)xyz
 *
 * Every link is returned with a scheme (http:// added when missing) so the
 * URL checks downstream can parse it. Email addresses are not links.
 */

const SCHEME_URL = /\bhttps?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

// Top-level domains a bare domain may end with. A closed list keeps ordinary
// text such as "1.500.000", "v.v." or "file.txt" from being taken for a link.
const TLDS = [
  // Vietnam and common generic ones
  'vn', 'com', 'net', 'org', 'info', 'biz', 'io', 'co', 'me', 'app', 'dev', 'ai', 'tv', 'cc', 'us', 'asia',
  // Cheap ones that are common in scam campaigns
  'top', 'xyz', 'site', 'online', 'click', 'link', 'live', 'shop', 'store', 'vip', 'club', 'icu', 'buzz',
  'work', 'fun', 'space', 'website', 'pro', 'cyou', 'sbs', 'cfd', 'rest', 'bond', 'lol', 'mom', 'win',
  'loan', 'tk', 'ml', 'ga', 'cf', 'gq', 'cn', 'ru',
];

const LABEL = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?';
const BARE_DOMAIN = new RegExp(
  // Not part of an email address, a longer word or an existing URL.
  `(?<![@\\w.\\-/:])` +
    `((?:${LABEL}\\.)+(?:${TLDS.join('|')}))` +
    // Port and path are optional; the path stops at whitespace or quotes.
    `(?::\\d{2,5})?(?:/[^\\s<>"{}|\\\\^\`]*)?` +
    // Not followed by more of a word, or by "@" (the domain-like start of an email).
    `(?![\\w@-])`,
  'gi'
);

/** Undo the usual tricks: hxxp, [.], (.), {.}, [dot], " dot ". */
export function refang(text: string): string {
  return text
    .replace(/\bhxxp(s?)/gi, 'http$1')
    .replace(/\s*[[({]\s*(?:\.|dot|chấm|cham)\s*[\])}]\s*/gi, '.')
    .replace(/\[:\]/g, ':');
}

const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"…]+$/;

function clean(url: string): string {
  return url.replace(TRAILING_PUNCTUATION, '');
}

export function extractUrls(text: string): string[] {
  const refanged = refang(text);
  const found: string[] = [];

  for (const match of refanged.match(SCHEME_URL) ?? []) {
    found.push(clean(match));
  }

  // Remove the scheme URLs before looking for bare domains, so their hosts are
  // not reported twice.
  const withoutSchemeUrls = refanged.replace(SCHEME_URL, ' ');
  for (const match of withoutSchemeUrls.matchAll(BARE_DOMAIN)) {
    const candidate = clean(match[0]);
    // At least one dot must remain after trailing punctuation is removed.
    if (candidate.includes('.')) found.push(`http://${candidate.toLowerCase()}`);
  }

  return [...new Set(found)];
}
