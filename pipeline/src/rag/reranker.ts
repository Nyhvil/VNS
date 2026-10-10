import { RagMatch } from '../types';
import { stripDiacritics } from '../knowledge/text-match';

/**
 * Second-stage ranking of the samples returned by the vector search.
 *
 * Embedding similarity alone can rank a sample high because it talks about the
 * same broad topic. The reranker also looks at how many concrete words the
 * content shares with each sample, then keeps the best `topK`.
 */

/** Share of the final ranking score that comes from the vector similarity. */
export const DEFAULT_VECTOR_WEIGHT = 0.7;

// Compared without diacritics, so words whose stripped form collides with a
// meaningful one are left out on purpose ("tại"/"tài", "the"/"thẻ", "để"/"đề").
const STOPWORDS = new Set([
  'va', 'la', 'cua', 'cho', 'co', 'cac', 'nhung', 'mot', 'duoc', 'trong', 'khi',
  'voi', 'ban', 'nay', 'da', 'se', 'vui', 'long', 'and', 'for', 'you', 'your',
  'to', 'of', 'in', 'is', 'at', 'on', 'a', 'an',
]);

export function tokenize(text: string): Set<string> {
  const tokens = stripDiacritics(text).match(/[a-z0-9]+/g) ?? [];
  return new Set(tokens.filter(token => token.length >= 2 && !STOPWORDS.has(token)));
}

/** Overlap coefficient of two token sets: shared tokens over the size of the smaller set. */
export function lexicalOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;

  let shared = 0;
  for (const token of a) {
    if (b.has(token)) shared++;
  }
  return shared / Math.min(a.size, b.size);
}

export interface RankedMatch extends RagMatch {
  /** Combined score used for ordering, 0-1. */
  rerank_score: number;
}

export function rerankMatches(
  queryText: string,
  matches: RagMatch[],
  topK: number,
  vectorWeight: number = DEFAULT_VECTOR_WEIGHT
): RankedMatch[] {
  const queryTokens = tokenize(queryText);

  return matches
    .map(match => {
      const lexical = lexicalOverlap(queryTokens, tokenize(match.snippet));
      return {
        ...match,
        rerank_score: vectorWeight * match.similarity + (1 - vectorWeight) * lexical,
      };
    })
    .sort((x, y) => y.rerank_score - x.rerank_score || y.similarity - x.similarity)
    .slice(0, topK);
}
