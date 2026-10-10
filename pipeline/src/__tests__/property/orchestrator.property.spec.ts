import * as fc from 'fast-check';

// Feature: phishing-analysis-pipeline, Property 8: Job ID echo

jest.mock('../../parser/input-parser', () => ({
  parseInput: jest.fn().mockResolvedValue({
    content: { body: 'test', urls: [] },
    imageScore: 0,
    ocrFailed: false,
  }),
}));
jest.mock('../../features/feature-extractor', () => ({
  extractFeatures: jest.fn().mockReturnValue({
    sender_domain: null,
    reply_to_domain: null,
    urls: [],
    suspicious_keywords: [],
    domain_mismatch: false,
    spf_result: null,
    dkim_result: null,
  }),
}));
jest.mock('../../rules/rule-engine', () => ({
  evaluateRules: jest.fn().mockReturnValue({ violations: [], score: 0 }),
}));
jest.mock('../../rag/rag-analyzer', () => ({
  analyzeWithRag: jest.fn().mockResolvedValue({
    result: { matches: [], top_score: 0, score: 0 },
    finding: null,
  }),
  storeContentToVectorDb: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../llm/llm-analyzer', () => ({
  analyzeWithLlm: jest.fn().mockResolvedValue({ explanation: '', score: 0, enabled: false }),
}));
jest.mock('../../scoring/score-aggregator', () => ({
  aggregateScores: jest.fn().mockReturnValue({ risk_score: 0, risk_level: 'low', category: 'safe' }),
}));
jest.mock('../../config/config', () => ({
  getConfig: jest.fn(() => ({ pipelineTimeoutMs: 30000, ragSimilarityThreshold: 0.75 })),
}));
jest.mock('../../logger/logger', () => ({
  logAnalysisReceived: jest.fn(),
  logAnalysisCompleted: jest.fn(),
  logLayerError: jest.fn(),
}));

import { runAnalysis } from '../../orchestrator/analysis-orchestrator';

describe('Orchestrator — Property Tests', () => {
  describe('Property 8: Job ID echo', () => {
    it('should always return the same job_id as the request', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.constantFrom('plain_text' as const, 'email_text' as const),
          fc.string({ minLength: 1 }),
          async (jobId, type, content) => {
            const response = await runAnalysis({ job_id: jobId, type, content });
            expect(response.job_id).toBe(jobId);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
