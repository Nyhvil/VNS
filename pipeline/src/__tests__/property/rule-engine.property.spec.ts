import * as fc from 'fast-check';
import { evaluateRules } from '../../rules/rule-engine';
import { FeatureSet, NormalizedUrl } from '../../types';

// Feature: phishing-analysis-pipeline, Property 7: Findings array non-negative length
// Feature: phishing-analysis-pipeline, Property 9: Rule engine result structure

const normalizedUrlArb = fc.record({
  original: fc.webUrl(),
  normalized: fc.webUrl(),
  is_ip_based: fc.boolean(),
  is_shortener: fc.boolean(),
}) as fc.Arbitrary<NormalizedUrl>;

const featureSetArb = fc.record({
  sender_domain: fc.option(fc.domain(), { nil: null }),
  reply_to_domain: fc.option(fc.domain(), { nil: null }),
  urls: fc.array(normalizedUrlArb, { maxLength: 5 }),
  suspicious_keywords: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
  domain_mismatch: fc.boolean(),
  spf_result: fc.option(fc.constantFrom('pass', 'fail', 'none' as const), { nil: null }),
  dkim_result: fc.option(fc.constantFrom('pass', 'fail', 'none' as const), { nil: null }),
}) as fc.Arbitrary<FeatureSet>;

describe('Rule Engine — Property Tests', () => {
  describe('Property 7: Findings array non-negative length', () => {
    it('should always return non-negative violations count', () => {
      fc.assert(
        fc.property(featureSetArb, (features) => {
          const result = evaluateRules(features);
          expect(result.violations).not.toBeNull();
          expect(Array.isArray(result.violations)).toBe(true);
          expect(result.violations.length).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9: Rule engine result structure', () => {
    it('should always return valid RuleResult structure', () => {
      fc.assert(
        fc.property(featureSetArb, (features) => {
          const result = evaluateRules(features);
          // Score must be a number in [0, 100]
          expect(typeof result.score).toBe('number');
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(100);
          // Each finding must have required fields
          for (const finding of result.violations) {
            expect(typeof finding.rule_id).toBe('string');
            expect(['low', 'medium', 'high', 'critical']).toContain(finding.severity);
            expect(typeof finding.description).toBe('string');
            expect(typeof finding.evidence).toBe('object');
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
