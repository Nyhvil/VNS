import { DetectionResults, AggregatedScore, LayerScore, LayerId } from '../types';
import { mapToRiskLevel } from './risk-level-mapper';
import { determineCategory } from './category-determiner';
import { LAYER_WEIGHTS } from './weights';

/**
 * Risk score = weighted average of the detection layers.
 *
 *   RAG 35%  ·  Rule 25%  ·  Header 20%  ·  Image 10%  ·  LLM 10%
 *
 * Two things keep the formula honest on real content:
 *
 * 1. A layer takes part only when it has a signal. "No similar sample found"
 *    or "no rule fired" is not evidence that content is safe, so such a layer
 *    is left out and the weights are normalised over the layers that remain.
 *
 * 2. The final score is never lower than the LLM's own score. The LLM reads
 *    the whole content together with everything the other layers found; if it
 *    judges the content dangerous, the other layers must not dilute that.
 */

export { LAYER_WEIGHTS };

const LAYER_LABELS: Record<LayerId, string> = {
  rag: 'So khớp mẫu lừa đảo (RAG)',
  rule: 'Bộ luật',
  header: 'Tiêu đề email',
  image: 'Ảnh và mã QR',
  llm: 'Mô hình ngôn ngữ (LLM)',
};

export const DEFAULT_RAG_THRESHOLD = 0.75;

export interface AggregateOptions {
  /** Minimum similarity for a stored sample to count as a match (0-1). */
  ragThreshold?: number;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function buildLayers(results: DetectionResults, options: AggregateOptions = {}): LayerScore[] {
  const ragThreshold = options.ragThreshold ?? DEFAULT_RAG_THRESHOLD;

  const layer = (id: LayerId, score: number, applied: boolean): LayerScore => ({
    id,
    label: LAYER_LABELS[id],
    weight: LAYER_WEIGHTS[id],
    score: Math.round(clampScore(score)),
    applied,
  });

  return [
    layer('rag', results.rag.score, results.rag.top_score >= ragThreshold && results.rag.score > 0),
    layer('rule', results.rule.score, results.rule.violations.length > 0),
    layer('header', results.header_score, results.header_score > 0),
    layer('image', results.image_score, results.image_score > 0),
    layer('llm', results.llm.score, results.llm.succeeded === true),
  ];
}

/** Weighted average over the layers that have a signal; 0 when none has. */
export function computeWeightedScore(results: DetectionResults, options: AggregateOptions = {}): number {
  const applied = buildLayers(results, options).filter(l => l.applied);
  const weightSum = applied.reduce((sum, l) => sum + l.weight, 0);
  if (weightSum <= 0) return 0;

  const weighted = applied.reduce((sum, l) => sum + l.weight * l.score, 0);
  return Math.round(clampScore(weighted / weightSum));
}

export function aggregateScores(results: DetectionResults, options: AggregateOptions = {}): AggregatedScore {
  const layers = buildLayers(results, options);
  const formulaScore = computeWeightedScore(results, options);

  const llmLayer = layers.find(l => l.id === 'llm');
  const llmScore = llmLayer?.applied ? llmLayer.score : 0;
  const llmFloorApplied = llmScore > formulaScore;
  const riskScore = llmFloorApplied ? llmScore : formulaScore;

  const riskLevel = mapToRiskLevel(riskScore);
  const category = determineCategory(results.rule.violations, results.rag, riskScore);

  return {
    risk_score: riskScore,
    risk_level: riskLevel,
    category,
    layers,
    formula_score: formulaScore,
    llm_floor_applied: llmFloorApplied,
  };
}
