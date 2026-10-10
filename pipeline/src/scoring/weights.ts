import { LayerId } from '../types';

/**
 * Share of each detection layer in the risk score.
 *
 *   RAG 35%  ·  Rule 25%  ·  Header 20%  ·  Image 10%  ·  LLM 10%
 */
export const LAYER_WEIGHTS: Record<LayerId, number> = {
  rag: 0.35,
  rule: 0.25,
  header: 0.2,
  image: 0.1,
  llm: 0.1,
};
