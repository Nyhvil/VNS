/**
 * Keyword matching for Vietnamese text.
 *
 * People type Vietnamese both with and without diacritics. Matching without
 * diacritics all the time would confuse different words ("công an" - police,
 * "công ăn" - livelihood), so diacritics are only ignored when the text itself
 * has none.
 */

const DIACRITIC_REGEX = /[̀-ͯ]/g;
const VIETNAMESE_LETTER_REGEX =
  /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

export function stripDiacritics(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITIC_REGEX, '')
    .replace(/đ/g, 'd');
}

export function hasVietnameseDiacritics(text: string): boolean {
  return VIETNAMESE_LETTER_REGEX.test(text.normalize('NFC'));
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface PreparedText {
  lower: string;
  stripped: string;
  hasDiacritics: boolean;
}

export function prepareText(text: string): PreparedText {
  const nfc = text.normalize('NFC');
  return {
    lower: nfc.toLowerCase(),
    stripped: stripDiacritics(nfc),
    hasDiacritics: hasVietnameseDiacritics(nfc),
  };
}

/**
 * Does `keyword` occur in the text?
 *
 * Short keywords made of plain letters and digits ("OTP", "COD", "CCCD") must
 * stand alone as a word, otherwise they match inside unrelated words.
 */
export function containsKeyword(text: PreparedText, keyword: string): boolean {
  const keywordLower = keyword.normalize('NFC').toLowerCase();
  const haystack = text.hasDiacritics ? text.lower : text.stripped;
  const needle = text.hasDiacritics ? keywordLower : stripDiacritics(keywordLower);

  if (!needle) return false;

  if (needle.length <= 4 && /^[a-z0-9]+$/.test(needle)) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(needle)}([^a-z0-9]|$)`).test(haystack);
  }

  return haystack.includes(needle);
}
