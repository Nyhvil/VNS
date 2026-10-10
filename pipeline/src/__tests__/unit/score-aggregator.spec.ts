import { computeWeightedScore, aggregateScores } from '../../scoring/score-aggregator';
import { mapToRiskLevel } from '../../scoring/risk-level-mapper';
import { DetectionResults } from '../../types';

function buildDetectionResults(overrides: Partial<DetectionResults> = {}): DetectionResults {
  return {
    rule: { violations: [], score: 0 },
    rag: { matches: [], top_score: 0, score: 0 },
    llm: { explanation: '', score: 0, enabled: false },
    header_score: 0,
    image_score: 0,
    ...overrides,
  };
}

describe('Score Aggregator', () => {
  describe('mapToRiskLevel()', () => {
    it('should return low for score 0', () => {
      expect(mapToRiskLevel(0)).toBe('low');
    });

    it('should return low for score 29', () => {
      expect(mapToRiskLevel(29)).toBe('low');
    });

    it('should return medium for score 30', () => {
      expect(mapToRiskLevel(30)).toBe('medium');
    });

    it('should return medium for score 59', () => {
      expect(mapToRiskLevel(59)).toBe('medium');
    });

    it('should return high for score 60', () => {
      expect(mapToRiskLevel(60)).toBe('high');
    });

    it('should return high for score 84', () => {
      expect(mapToRiskLevel(84)).toBe('high');
    });

    it('should return critical for score 85', () => {
      expect(mapToRiskLevel(85)).toBe('critical');
    });

    it('should return critical for score 100', () => {
      expect(mapToRiskLevel(100)).toBe('critical');
    });
  });

  describe('computeWeightedScore()', () => {
    it('should return 0 when all scores are 0', () => {
      const results = buildDetectionResults();
      expect(computeWeightedScore(results)).toBe(0);
    });

    it('should apply correct weights', () => {
      const results = buildDetectionResults({
        rag: { matches: [], top_score: 1, score: 100 },
        rule: { violations: [], score: 100 },
        header_score: 100,
        image_score: 100,
        llm: { explanation: '', score: 100, enabled: true },
      });
      expect(computeWeightedScore(results)).toBe(100);
    });

    it('should clamp to 100 maximum', () => {
      const results = buildDetectionResults({
        rag: { matches: [], top_score: 1, score: 100 },
        rule: { violations: [], score: 100 },
        header_score: 100,
        image_score: 100,
        llm: { explanation: '', score: 100, enabled: true },
      });
      expect(computeWeightedScore(results)).toBeLessThanOrEqual(100);
    });

    it('should clamp to 0 minimum', () => {
      const results = buildDetectionResults({
        rag: { matches: [], top_score: 0, score: -10 },
      });
      expect(computeWeightedScore(results)).toBeGreaterThanOrEqual(0);
    });

    it('should return integer', () => {
      const results = buildDetectionResults({
        rag: { matches: [], top_score: 0.5, score: 50 },
        rule: { violations: [], score: 30 },
      });
      const score = computeWeightedScore(results);
      expect(Number.isInteger(score)).toBe(true);
    });
  });

  describe('aggregateScores()', () => {
    it('should return safe category for zero signals', () => {
      const results = buildDetectionResults();
      const agg = aggregateScores(results);
      expect(agg.risk_score).toBe(0);
      expect(agg.risk_level).toBe('low');
      expect(agg.category).toBe('safe');
    });

    it('should return phishing for high RAG + high rule score', () => {
      const results = buildDetectionResults({
        rag: { matches: [{ id: '1', similarity: 0.9, label: 'phishing', snippet: 'test' }], top_score: 0.9, score: 90 },
        rule: {
          violations: [{ rule_id: 'spf_fail', severity: 'high', description: 'SPF fail', evidence: {} }],
          score: 75,
        },
      });
      const agg = aggregateScores(results);
      expect(agg.category).toBe('phishing');
    });
  });
});
