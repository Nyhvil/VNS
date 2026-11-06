/**
 * Does the text read from an image look like a message, an email or a page
 * that can be checked for scams?
 *
 * A photo of a bowl of rice, a face or a landscape has no such content, but OCR
 * still returns a few stray letters ("Ele mm. Hig i"). Scoring those letters
 * gives a meaningless result, sometimes "scam". Such images are reported as
 * unreadable instead, and the user is asked for a screenshot of the message.
 *
 * Real messages, even short ones, contain common Vietnamese or English words
 * ("bạn", "của", "không", "vui lòng", "the", "your"); stray OCR letters rarely
 * form two different ones. A link or a QR code is always worth checking.
 */
import { stripDiacritics } from '../knowledge/text-match';
import { extractUrls } from './url-extractor';

const COMMON_WORDS = new Set([
  // Vietnamese, without diacritics (OCR often drops them). Words of one or two
  // letters are left out: stray OCR letters form them by chance.
  'ban', 'cua', 'khong', 'ko', 'duoc', 'dang', 'cho', 'anh', 'chi', 'toi', 'minh', 'quy', 'khach', 'vui', 'long',
  'tai', 'khoan', 'ngan', 'hang', 'tien', 'chuyen', 'nhan', 'gui', 'dien', 'thoai', 'ngay', 'gio', 'thang', 'nam',
  'nay', 'voi', 'trong', 'den', 'neu', 'thi', 'hay', 'cac', 'nhung', 'mot', 'nhe', 'nha', 'roi', 'lam', 'viec',
  'thong', 'tin', 'bao', 'xac', 'link', 'truy', 'cap', 'nhap', 'hoac', 'theo', 'tren', 'duoi', 'sau', 'truoc', 'phi',
  'don', 'qua',
  // English
  'the', 'you', 'your', 'and', 'for', 'are', 'please', 'account', 'click', 'here', 'this', 'with', 'from', 'our',
  'have', 'has', 'will', 'not', 'code', 'bank', 'verify',
]);

/** Distinct common words in the text. */
export function commonWordCount(text: string): number {
  const words = stripDiacritics(text).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return new Set(words.filter(w => COMMON_WORDS.has(w))).size;
}

export const MIN_COMMON_WORDS = 2;

/** True when an image's text (plus any QR codes) is worth analysing. */
export function hasCheckableContent(text: string, qrCodes: string[] = []): boolean {
  if (qrCodes.length > 0) return true;
  if (extractUrls(text).length > 0) return true;
  return commonWordCount(text) >= MIN_COMMON_WORDS;
}
