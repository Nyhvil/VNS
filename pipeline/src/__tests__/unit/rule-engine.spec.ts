import { evaluateRules } from '../../rules/rule-engine';
import { FeatureSet } from '../../types';

function buildFeatureSet(overrides: Partial<FeatureSet> = {}): FeatureSet {
  return {
    sender_domain: 'example.com',
    reply_to_domain: 'example.com',
    urls: [],
    suspicious_keywords: [],
    domain_mismatch: false,
    spf_result: 'pass',
    dkim_result: 'pass',
    ...overrides,
  };
}

describe('Rule Engine', () => {
  describe('evaluateRules()', () => {
    it('should return empty violations for clean input', () => {
      const features = buildFeatureSet();
      const result = evaluateRules(features);
      expect(result.violations).toEqual([]);
      expect(result.score).toBe(0);
    });

    it('should detect SPF fail', () => {
      const features = buildFeatureSet({ spf_result: 'fail' });
      const result = evaluateRules(features);
      expect(result.violations.some(v => v.rule_id === 'spf_fail')).toBe(true);
    });

    it('should detect DKIM fail', () => {
      const features = buildFeatureSet({ dkim_result: 'fail' });
      const result = evaluateRules(features);
      expect(result.violations.some(v => v.rule_id === 'dkim_fail')).toBe(true);
    });

    it('should detect domain mismatch', () => {
      const features = buildFeatureSet({
        sender_domain: 'evil.com',
        reply_to_domain: 'legit.com',
        domain_mismatch: true,
      });
      const result = evaluateRules(features);
      expect(result.violations.some(v => v.rule_id === 'domain_mismatch')).toBe(true);
    });

    it('should detect suspicious keywords', () => {
      const features = buildFeatureSet({ suspicious_keywords: ['urgent', 'verify'] });
      const result = evaluateRules(features);
      expect(result.violations.some(v => v.rule_id === 'suspicious_keyword')).toBe(true);
    });

    it('should detect IP-based URLs', () => {
      const features = buildFeatureSet({
        urls: [{ original: 'http://192.168.1.1/phish', normalized: 'http://192.168.1.1/phish', is_ip_based: true, is_shortener: false }],
      });
      const result = evaluateRules(features);
      expect(result.violations.some(v => v.rule_id === 'ip_url')).toBe(true);
    });

    it('should detect URL shorteners', () => {
      const features = buildFeatureSet({
        urls: [{ original: 'https://bit.ly/abc', normalized: 'https://bit.ly/abc', is_ip_based: false, is_shortener: true }],
      });
      const result = evaluateRules(features);
      expect(result.violations.some(v => v.rule_id === 'url_shortener')).toBe(true);
    });

    it('should return non-null violations array (never null)', () => {
      const features = buildFeatureSet();
      const result = evaluateRules(features);
      expect(result.violations).not.toBeNull();
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should return score > 0 when violations exist', () => {
      const features = buildFeatureSet({ spf_result: 'fail', dkim_result: 'fail' });
      const result = evaluateRules(features);
      expect(result.score).toBeGreaterThan(0);
    });

    it('should return score <= 100', () => {
      const features = buildFeatureSet({
        spf_result: 'fail',
        dkim_result: 'fail',
        domain_mismatch: true,
        suspicious_keywords: ['urgent', 'verify', 'click here', 'account suspended'],
        urls: [
          { original: 'http://1.2.3.4/x', normalized: 'http://1.2.3.4/x', is_ip_based: true, is_shortener: false },
          { original: 'https://bit.ly/x', normalized: 'https://bit.ly/x', is_ip_based: false, is_shortener: true },
        ],
      });
      const result = evaluateRules(features);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('each Finding should have required fields', () => {
      const features = buildFeatureSet({ spf_result: 'fail' });
      const result = evaluateRules(features);
      for (const finding of result.violations) {
        expect(finding).toHaveProperty('rule_id');
        expect(finding).toHaveProperty('severity');
        expect(finding).toHaveProperty('description');
        expect(finding).toHaveProperty('evidence');
      }
    });
  });
});
