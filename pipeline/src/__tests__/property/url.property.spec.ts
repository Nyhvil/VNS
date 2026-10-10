import * as fc from 'fast-check';
import { normalizeUrl } from '../../features/url-normalizer';
import { extractFeatures } from '../../features/feature-extractor';
import { ParsedText } from '../../types';

// Feature: phishing-analysis-pipeline, Property 2: URL normalization idempotence
// Feature: phishing-analysis-pipeline, Property 3: Extracted URL count non-negative

describe('URL — Property Tests', () => {
  describe('Property 2: URL normalization idempotence', () => {
    it('should produce same result when normalized twice', () => {
      fc.assert(
        fc.property(
          fc.webUrl(),
          (url) => {
            const once = normalizeUrl(url);
            const twice = normalizeUrl(once);
            expect(once).toBe(twice);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be idempotent for arbitrary strings', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (str) => {
            const once = normalizeUrl(str);
            const twice = normalizeUrl(once);
            expect(once).toBe(twice);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Extracted URL count non-negative', () => {
    it('should always return non-negative URL count for plain text', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.array(fc.webUrl()),
          (body, urls) => {
            const content: ParsedText = { body, urls };
            const features = extractFeatures(content);
            expect(features.urls.length).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
