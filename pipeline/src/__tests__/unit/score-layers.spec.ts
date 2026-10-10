import { aggregateScores, buildLayers, computeWeightedScore, LAYER_WEIGHTS } from '../../scoring/score-aggregator';
import { DetectionResults, Finding } from '../../types';

const highRule: Finding = { rule_id: 'ip_url', severity: 'high', description: 'IP URL', evidence: {} };
const lowRule: Finding = { rule_id: 'suspicious_keyword', severity: 'low', description: 'kw', evidence: {} };

function results(overrides: Partial<DetectionResults> = {}): DetectionResults {
  return {
    rule: { violations: [], score: 0 },
    rag: { matches: [], top_score: 0, score: 0 },
    llm: { explanation: '', score: 0, enabled: false },
    header_score: 0,
    image_score: 0,
    ...overrides,
  };
}

const llm = (score: number) => ({ explanation: 'x', score, enabled: true, succeeded: true });

describe('Score aggregator — layers with a signal', () => {
  it('should use the documented weights', () => {
    expect(LAYER_WEIGHTS).toEqual({ rag: 0.35, rule: 0.25, header: 0.2, image: 0.1, llm: 0.1 });
    const sum = Object.values(LAYER_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it('should report all five layers', () => {
    const layers = buildLayers(results());
    expect(layers.map(l => l.id)).toEqual(['rag', 'rule', 'header', 'image', 'llm']);
    expect(layers.every(l => !l.applied)).toBe(true);
  });

  it('should leave out a rule layer that found nothing', () => {
    // Only the LLM has a signal, so it alone decides.
    const agg = aggregateScores(results({ llm: llm(95) }));
    expect(agg.risk_score).toBe(95);
    expect(agg.layers?.find(l => l.id === 'rule')?.applied).toBe(false);
  });

  it('should leave out RAG when no sample is similar enough', () => {
    const r = results({
      rag: { matches: [], top_score: 0.4, score: 40 },
      rule: { violations: [highRule], score: 80 },
    });
    expect(buildLayers(r).find(l => l.id === 'rag')?.applied).toBe(false);
    expect(computeWeightedScore(r)).toBe(80);
  });

  it('should respect a custom RAG threshold', () => {
    const r = results({ rag: { matches: [], top_score: 0.6, score: 60 } });
    expect(computeWeightedScore(r, { ragThreshold: 0.5 })).toBe(60);
    expect(computeWeightedScore(r, { ragThreshold: 0.75 })).toBe(0);
  });

  it('should normalise the weights over the layers that have a signal', () => {
    // (0.35*90 + 0.25*80 + 0.10*70) / 0.70 = 83.57
    const r = results({
      rag: { matches: [], top_score: 0.9, score: 90 },
      rule: { violations: [highRule], score: 80 },
      llm: llm(70),
    });
    expect(computeWeightedScore(r)).toBe(84);
  });

  it('should match the plain weighted sum when every layer has a signal', () => {
    const r = results({
      rag: { matches: [], top_score: 0.8, score: 80 },
      rule: { violations: [highRule], score: 60 },
      header_score: 40,
      image_score: 90,
      llm: llm(50),
    });
    // 0.35*80 + 0.25*60 + 0.20*40 + 0.10*90 + 0.10*50 = 65
    expect(computeWeightedScore(r)).toBe(65);
  });

  it('should ignore an LLM that did not answer', () => {
    const r = results({
      rule: { violations: [lowRule], score: 20 },
      llm: { explanation: '', score: 0, enabled: true, succeeded: false },
    });
    expect(buildLayers(r).find(l => l.id === 'llm')?.applied).toBe(false);
    expect(aggregateScores(r).risk_score).toBe(20);
  });

  describe('LLM safety floor', () => {
    it('should not let other layers pull the score below the LLM score', () => {
      // formula: (0.25*20 + 0.10*90) / 0.35 = 40
      const agg = aggregateScores(results({ rule: { violations: [lowRule], score: 20 }, llm: llm(90) }));
      expect(agg.formula_score).toBe(40);
      expect(agg.risk_score).toBe(90);
      expect(agg.llm_floor_applied).toBe(true);
    });

    it('should let the other layers raise the score above the LLM score', () => {
      // formula: (0.35*95 + 0.25*85 + 0.10*40) / 0.70 = 83.57
      const agg = aggregateScores(
        results({
          rag: { matches: [], top_score: 0.95, score: 95 },
          rule: { violations: [highRule], score: 85 },
          llm: llm(40),
        })
      );
      expect(agg.risk_score).toBe(84);
      expect(agg.llm_floor_applied).toBe(false);
    });

    it('should keep safe content safe', () => {
      const agg = aggregateScores(results({ llm: llm(5) }));
      expect(agg.risk_score).toBe(5);
      expect(agg.risk_level).toBe('low');
      expect(agg.category).toBe('safe');
    });
  });

  it('should score a single strong rule on its own when nothing else has a signal', () => {
    const agg = aggregateScores(results({ rule: { violations: [highRule], score: 80 } }));
    expect(agg.risk_score).toBe(80);
    expect(agg.risk_level).toBe('high');
    expect(agg.category).toBe('phishing');
  });
});
