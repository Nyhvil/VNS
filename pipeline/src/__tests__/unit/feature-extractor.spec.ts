import { extractFeatures } from '../../features/feature-extractor';
import { ParsedEmail, ParsedText } from '../../types';

const mockEmail: ParsedEmail = {
  sender: 'attacker@evil.com',
  reply_to: 'reply@different-domain.com',
  subject: 'Urgent: verify your account',
  body: 'Click here to verify your account http://192.168.1.1/phish',
  urls: ['http://192.168.1.1/phish', 'https://bit.ly/abc'],
  attachments: [],
  headers: {},
  spf_result: 'fail',
  dkim_result: 'fail',
  originating_ip: '192.168.1.1',
};

const mockPlainText: ParsedText = {
  body: 'Hello, please verify your account at https://example.com',
  urls: ['https://example.com'],
};

describe('Feature Extractor', () => {
  describe('extractFeatures() with email input', () => {
    it('should extract sender domain', () => {
      const features = extractFeatures(mockEmail);
      expect(features.sender_domain).toBe('evil.com');
    });

    it('should extract reply-to domain', () => {
      const features = extractFeatures(mockEmail);
      expect(features.reply_to_domain).toBe('different-domain.com');
    });

    it('should detect domain mismatch', () => {
      const features = extractFeatures(mockEmail);
      expect(features.domain_mismatch).toBe(true);
    });

    it('should not flag domain mismatch when sender = reply-to domain', () => {
      const sameEmail: ParsedEmail = {
        ...mockEmail,
        sender: 'user@example.com',
        reply_to: 'reply@example.com',
      };
      const features = extractFeatures(sameEmail);
      expect(features.domain_mismatch).toBe(false);
    });

    it('should normalize and analyze URLs', () => {
      const features = extractFeatures(mockEmail);
      expect(features.urls.length).toBe(2);
      expect(features.urls[0].is_ip_based).toBe(true);
      expect(features.urls[1].is_shortener).toBe(true);
    });

    it('should detect suspicious keywords from subject and body', () => {
      const features = extractFeatures(mockEmail);
      expect(features.suspicious_keywords).toContain('urgent');
      expect(features.suspicious_keywords).toContain('verify');
    });

    it('should preserve SPF and DKIM results', () => {
      const features = extractFeatures(mockEmail);
      expect(features.spf_result).toBe('fail');
      expect(features.dkim_result).toBe('fail');
    });
  });

  describe('extractFeatures() with plain text input', () => {
    it('should return null for sender_domain', () => {
      const features = extractFeatures(mockPlainText);
      expect(features.sender_domain).toBeNull();
    });

    it('should return false for domain_mismatch', () => {
      const features = extractFeatures(mockPlainText);
      expect(features.domain_mismatch).toBe(false);
    });

    it('should extract URLs from plain text', () => {
      const features = extractFeatures(mockPlainText);
      expect(features.urls.length).toBe(1);
    });

    it('should detect keywords from plain text body', () => {
      const features = extractFeatures(mockPlainText);
      expect(features.suspicious_keywords).toContain('verify');
    });
  });
});
