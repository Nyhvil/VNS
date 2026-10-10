import * as fc from 'fast-check';

// Feature: phishing-analysis-pipeline, Property 12: RAG top-K invariant
// Feature: phishing-analysis-pipeline, Property 13: RAG threshold finding

// Mock dependencies before importing
jest.mock('../../rag/embedding-client', () => ({
  createEmbedding: jest.fn().mockResolvedValue(new Array(1536).fill(0.1)),
}));

jest.mock('../../config/config', () => ({
  getConfig: jest.fn(() => ({
    ragTopK: 5,
    ragSimilarityThreshold: 0.75,
    openaiApiKey: 'test-key',
  })),
}));

jest.mock('../../logger/logger', () => ({
  logLayerError: jest.fn(),
}));

import { analyzeWithRag } from '../../rag/rag-analyzer';
import { ParsedText } from '../../types';

const { searchSimilar } = jest.requireMock('../../rag/qdrant-client');

jest.mock('../../rag/qdrant-client', () => ({
  searchSimilar: jest.fn(),
}));

describe('RAG Analyzer — Property Tests', () => {
  describe('Property 12: RAG top-K invariant — matches.length <= 5', () => {
    it('should never return more than topK matches', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              score: fc.float({ min: 0, max: 1 }),
              payload: fc.constant({ label: 'phishing', snippet: 'test' }),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          async (mockResults) => {
            searchSimilar.mockResolvedValue(mockResults);

            const content: ParsedText = { body: 'test content', urls: [] };
            const { result } = await analyzeWithRag(content, 'prop-test');

            expect(result.matches.length).toBeLessThanOrEqual(5);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 13: RAG threshold finding — finding created iff top_score > 0.75', () => {
    it('should create finding only when top_score > 0.75', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.float({ min: 0, max: 1 }),
          async (topScore) => {
            searchSimilar.mockResolvedValue([
              { id: '1', score: topScore, payload: { label: 'phishing', snippet: 'test' } },
            ]);

            const content: ParsedText = { body: 'test content', urls: [] };
            const { result, finding } = await analyzeWithRag(content, 'prop-test');

            if (result.top_score > 0.75) {
              expect(finding).not.toBeNull();
            } else {
              expect(finding).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
