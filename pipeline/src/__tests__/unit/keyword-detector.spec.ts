import { detectSuspiciousKeywords, DEFAULT_SUSPICIOUS_KEYWORDS } from '../../features/keyword-detector';

describe('Keyword Detector', () => {
  describe('detectSuspiciousKeywords()', () => {
    it('should detect "urgent" keyword', () => {
      const result = detectSuspiciousKeywords('This is URGENT please act now');
      expect(result).toContain('urgent');
    });

    it('should be case-insensitive', () => {
      const result = detectSuspiciousKeywords('VERIFY your account immediately');
      expect(result).toContain('verify');
    });

    it('should return empty array when no keywords match', () => {
      const result = detectSuspiciousKeywords('Hello, how are you today?');
      expect(result).toEqual([]);
    });

    it('should detect multiple keywords', () => {
      const result = detectSuspiciousKeywords('urgent: verify your account suspended');
      expect(result).toContain('urgent');
      expect(result).toContain('verify');
    });

    it('should deduplicate matched keywords', () => {
      const result = detectSuspiciousKeywords('urgent urgent urgent');
      const urgentCount = result.filter(k => k === 'urgent').length;
      expect(urgentCount).toBe(1);
    });

    it('should use custom keyword list when provided', () => {
      const customKeywords = ['custom_threat', 'another_threat'];
      const result = detectSuspiciousKeywords('this has custom_threat in it', customKeywords);
      expect(result).toContain('custom_threat');
      expect(result).not.toContain('urgent');
    });

    it('should detect "click here" multi-word keyword', () => {
      const result = detectSuspiciousKeywords('Please click here to verify');
      expect(result).toContain('click here');
    });

    it('should detect Vietnamese scam phrases', () => {
      const result = detectSuspiciousKeywords(
        'Chúc mừng bạn đã trúng thưởng xe SH. Vui lòng xác nhận ngay hôm nay.'
      );
      expect(result).toContain('trúng thưởng');
      expect(result).toContain('chúc mừng bạn');
      expect(result).toContain('xác nhận ngay');
    });

    it('should detect Vietnamese phrases typed without diacritics', () => {
      const result = detectSuspiciousKeywords(
        'Tai khoan bi khoa. Vui long cung cap ma OTP trong vong 24h.'
      );
      expect(result).toContain('tài khoản bị khóa');
      expect(result).toContain('mã otp');
      expect(result).toContain('trong vòng 24h');
    });

    it('should not flag an ordinary Vietnamese message', () => {
      const result = detectSuspiciousKeywords(
        'Chào bạn, chiều nay 3 giờ nhóm mình họp ở thư viện tầng 2 nhé. Nhớ mang theo laptop.'
      );
      expect(result).toEqual([]);
    });

    it('should not flag an ordinary delivery notice', () => {
      const result = detectSuspiciousKeywords(
        'Đơn hàng của bạn đã được giao thành công. Cảm ơn bạn đã mua hàng.'
      );
      expect(result).toEqual([]);
    });
  });
});
