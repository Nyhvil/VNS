import { sanitizePii } from '../../llm/pii-sanitizer';

describe('PII Sanitizer', () => {
  describe('sanitizePii()', () => {
    it('should redact email addresses', () => {
      const result = sanitizePii('Contact us at user@example.com for help');
      expect(result).not.toContain('user@example.com');
      expect(result).toContain('[EMAIL_REDACTED]');
    });

    it('should redact multiple email addresses', () => {
      const result = sanitizePii('From: a@b.com, reply to c@d.org');
      expect(result).not.toContain('a@b.com');
      expect(result).not.toContain('c@d.org');
    });

    it('should not modify text without PII', () => {
      const text = 'Hello, please verify your account now.';
      const result = sanitizePii(text);
      expect(result).toBe(text);
    });

    it('should redact SSN patterns', () => {
      const result = sanitizePii('My SSN is 123-45-6789');
      expect(result).not.toContain('123-45-6789');
      expect(result).toContain('[SSN_REDACTED]');
    });

    it('should handle empty string', () => {
      const result = sanitizePii('');
      expect(result).toBe('');
    });
  });
});
