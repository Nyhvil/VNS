import { DetectionResults, AggregatedScore } from '../types';
import { mapToRiskLevel } from './risk-level-mapper';
import { determineCategory } from './category-determiner';

export function computeWeightedScore(results: DetectionResults): number {
  const raw =
    0.35 * results.rag.score +
    0.25 * results.rule.score +
    0.20 * results.header_score +
    0.10 * results.image_score +
    0.10 * results.llm.score;

  return Math.round(Math.min(100, Math.max(0, raw)));
}

export function aggregateScores(results: DetectionResults): AggregatedScore {
  const riskScore = computeWeightedScore(results);
  const riskLevel = mapToRiskLevel(riskScore);
  const category = determineCategory(
    results.rule.violations,
    results.rag,
    riskScore
  );

  return { risk_score: riskScore, risk_level: riskLevel, category };
}
