import { ParsedContent } from '../types';
import { checkUrlSafety } from '../knowledge';

/**
 * Score of the image layer (0-100): the risk that is specific to an image,
 * which today means a QR code.
 *
 * - QR code that leads to a suspicious link            -> 90
 * - QR code that leads to a link on an unknown domain   -> 50
 * - QR code with non-link content                       -> 30
 * - QR code that leads to a verified official domain,
 *   or no QR code at all                                -> 0 (no signal)
 *
 * How well the text could be read (OCR confidence) says nothing about risk,
 * so it is reported separately and is not part of this score.
 */
export function computeImageRiskScore(content: ParsedContent): number {
  const qrCodes = 'qr_codes' in content ? content.qr_codes ?? [] : [];
  if (qrCodes.length === 0) return 0;

  let score = 0;
  for (const code of qrCodes) {
    if (!/^https?:\/\//i.test(code)) {
      score = Math.max(score, 30);
      continue;
    }

    const check = checkUrlSafety(code);
    if (check.official) continue;
    score = Math.max(score, check.suspicious ? 90 : 50);
  }

  return score;
}
