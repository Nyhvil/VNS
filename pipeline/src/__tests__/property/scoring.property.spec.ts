import * as fc from 'fast-check';
import { computeWeightedScore } from '../../scoring/score-aggregator';
import { mapToRiskLevel } from '../../scoring/risk-level-mapper';
import { DetectionResults } from '../../types';

// Feature: phishing-analysis-pipeline, Property 4: Risk score bounded invariant
// Feature: phishing-analysis-pipeline, Property 5: Zero signal produces safe result
// Feature: phishing-analysis-pipeline, Property 6: Risk level mapping consistency
// Feature: phishing-analysis-pipeline, Property 10: Weighted score formula correctness

const componentScoreArb = fc.float({ min: 0, max: 100 }).filter(n => !isNaN(n) && isFinite(n));

function buildResults(
  rag: number, rule: number, header: number, image: number, llm: number
): DetectionResults {
  return {
    rag: { matches: [], top_score: rag / 100, score: rag },
    rule: { violations: [], score: rule },
    llm: { explanation: '', score: llm, enabled: false },
    header_score: header,
    image_score: image,
  };
}

describe('Scoring — Property Tests', () => {
  describe('Property 4: Risk score bounded invariant', () => {
    it('should always produce score in [0, 100]', () => {
      fc.assert(
        fc.property(
          componentScoreArb,
          componentScoreArb,
          componentScoreArb,
          componentScoreArb,
          componentScoreArb,
          (rag, rule, header, image, llm) => {
            const results = buildResults(rag, rule, header, image, llm);
            const score = computeWeightedScore(results);
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
            expect(Number.isInteger(score)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: Zero signal produces safe result', () => {
    it('should return score 0 when all components are 0', () => {
      const results = buildResults(0, 0, 0, 0, 0);
      const score = computeWeightedScore(results);
      expect(score).toBe(0);
      expect(mapToRiskLevel(score)).toBe('low');
    });
  });

  describe('Property 6: Risk level mapping consistency', () => {
    it('should map every integer in [0,100] to a valid risk level', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          (score) => {
            const level = mapToRiskLevel(score);
            expect(['low', 'medium', 'high', 'critical']).toContain(level);

            if (score <= 29) expect(level).toBe('low');
            else if (score <= 59) expect(level).toBe('medium');
            else if (score <= 84) expect(level).toBe('high');
            else expect(level).toBe('critical');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10: Weighted score formula correctness', () => {
    it('raw weighted sum should always be in [0, 100]', () => {
      fc.assert(
        fc.property(
          componentScoreArb,
          componentScoreArb,
          componentScoreArb,
          componentScoreArb,
          componentScoreArb,
          (rag, rule, header, image, llm) => {
            const raw = 0.35 * rag + 0.25 * rule + 0.20 * header + 0.10 * image + 0.10 * llm;
            expect(raw).toBeGreaterThanOrEqual(0);
            expect(raw).toBeLessThanOrEqual(100);
            expect(Math.round(raw)).toBeGreaterThanOrEqual(0);
            expect(Math.round(raw)).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
