import { describe, expect, it } from '@jest/globals';
import { commonWordCount, hasCheckableContent } from '../../parser/content-check';

describe('hasCheckableContent', () => {
  it('rejects stray OCR letters from a photo with no message (a bowl of rice)', () => {
    expect(hasCheckableContent('Ele mm. Hig i\n---- Si mĩ ; hạ :\n= : \\ ©')).toBe(false);
    expect(hasCheckableContent('~ ,. ii | Il')).toBe(false);
  });

  it('accepts short real messages, with or without diacritics', () => {
    expect(hasCheckableContent('Chuyển gấp 5tr cho em nhé')).toBe(true);
    expect(hasCheckableContent('Chuyen gap 5tr cho em nhe')).toBe(true);
    expect(hasCheckableContent('Your account has been locked, please verify')).toBe(true);
  });

  it('always accepts a link or a QR code', () => {
    expect(hasCheckableContent('vcb-xacminh.top')).toBe(true);
    expect(hasCheckableContent('~ ,.', ['https://pay.example'])).toBe(true);
  });

  it('counts distinct common words only', () => {
    expect(commonWordCount('cho cho cho')).toBe(1);
  });
});
