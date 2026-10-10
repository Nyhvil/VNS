/**
 * Clean up text read from an image.
 *
 * OCR often confuses similar-looking characters (0/o, 1/l, rn/m). The same
 * substitutions are also used on purpose in scam images ("passw0rd",
 * "verlfy") to slip past keyword filters, so normalising them helps the
 * later layers either way.
 */
const WORD_FIXES: Record<string, string> = {
  'acc0unt': 'account', 'passw0rd': 'password', 'verlfy': 'verify',
  'ver1fy': 'verify', 's1gn': 'sign', 'l0gin': 'login', 'log1n': 'login',
  'c0nfirm': 'confirm', 'c0ntact': 'contact', 'susp1cious': 'suspicious',
  'seclurity': 'security', 'secur1ty': 'security', 'lnformation': 'information',
  'inf0rmation': 'information', 'transact1on': 'transaction', 'act1vity': 'activity',
  'upd4te': 'update', 'cl1ck': 'click', 'llnk': 'link', 'l1nk': 'link',
  'rec0very': 'recovery', 'exp1red': 'expired', 'susp3nded': 'suspended',
  'bl0cked': 'blocked', 'b1ocked': 'blocked', 'wr0ng': 'wrong',
};

export function normalizeOcrText(raw: string): string {
  let text = raw;

  for (const [bad, good] of Object.entries(WORD_FIXES)) {
    text = text.replace(new RegExp(bad, 'gi'), good);
  }

  text = text.replace(/\bhltps/gi, 'https').replace(/\bhltp/gi, 'http');
  text = text.replace(/\.corn\b/gi, '.com').replace(/\.c0m\b/gi, '.com');
  text = text.replace(/\.n3t\b/gi, '.net').replace(/\.0rg\b/gi, '.org');

  // Keep line breaks: chat screenshots are split into messages by line.
  return text
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
