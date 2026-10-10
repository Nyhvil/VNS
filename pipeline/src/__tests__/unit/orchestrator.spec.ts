import { runAnalysis } from '../../orchestrator/analysis-orchestrator';
import { AnalysisRequest } from '../../types';

// Mock all dependencies
jest.mock('../../parser/input-parser', () => ({
  parseInput: jest.fn(),
}));
jest.mock('../../features/feature-extractor', () => ({
  extractFeatures: jest.fn(),
}));
jest.mock('../../rules/rule-engine', () => ({
  evaluateRules: jest.fn(),
}));
jest.mock('../../rag/rag-analyzer', () => ({
  analyzeWithRag: jest.fn(),
  storeContentToVectorDb: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../llm/llm-analyzer', () => ({
  analyzeWithLlm: jest.fn(),
}));
jest.mock('../../scoring/score-aggregator', () => ({
  aggregateScores: jest.fn(),
}));
jest.mock('../../config/config', () => ({
  getConfig: jest.fn(() => ({
    pipelineTimeoutMs: 30000,
    ragSimilarityThreshold: 0.75,
  })),
}));
jest.mock('../../logger/logger', () => ({
  logAnalysisReceived: jest.fn(),
  logAnalysisCompleted: jest.fn(),
  logLayerError: jest.fn(),
}));

const { parseInput } = require('../../parser/input-parser');
const { extractFeatures } = require('../../features/feature-extractor');
const { evaluateRules } = require('../../rules/rule-engine');
const { analyzeWithRag, storeContentToVectorDb } = require('../../rag/rag-analyzer');
const { analyzeWithLlm } = require('../../llm/llm-analyzer');
const { aggregateScores } = require('../../scoring/score-aggregator');

const mockRequest: AnalysisRequest = {
  job_id: '550e8400-e29b-41d4-a716-446655440000',
  type: 'plain_text',
  content: 'Hello world',
};

const mockParsedContent = { body: 'Hello world', urls: [] };
const mockFeatures = {
  sender_domain: null,
  reply_to_domain: null,
  urls: [],
  suspicious_keywords: [],
  domain_mismatch: false,
  spf_result: null,
  dkim_result: null,
};

describe('Analysis Orchestrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    parseInput.mockResolvedValue({
      content: mockParsedContent,
      imageScore: 0,
      ocrFailed: false,
    });
    extractFeatures.mockReturnValue(mockFeatures);
    evaluateRules.mockReturnValue({ violations: [], score: 0 });
    analyzeWithRag.mockResolvedValue({
      result: { matches: [], top_score: 0, score: 0 },
      finding: null,
    });
    analyzeWithLlm.mockResolvedValue({ explanation: '', score: 0, enabled: false });
    aggregateScores.mockReturnValue({
      risk_score: 0,
      risk_level: 'low',
      category: 'safe',
    });
  });

  describe('runAnalysis()', () => {
    it('should return job_id matching request', async () => {
      const result = await runAnalysis(mockRequest);
      expect(result.job_id).toBe(mockRequest.job_id);
    });

    it('should return status completed', async () => {
      const result = await runAnalysis(mockRequest);
      expect(result.status).toBe('completed');
    });

    it('should return safe result for clean input', async () => {
      const result = await runAnalysis(mockRequest);
      expect(result.risk_score).toBe(0);
      expect(result.risk_level).toBe('low');
      expect(result.category).toBe('safe');
    });

    it('should return unreadable_image when OCR fails', async () => {
      parseInput.mockResolvedValue({
        content: { body: '', urls: [] },
        imageScore: 0,
        ocrFailed: true,
      });

      const imageRequest: AnalysisRequest = {
        ...mockRequest,
        type: 'image',
        content: 'base64data',
      };

      const result = await runAnalysis(imageRequest);
      expect(result.category).toBe('unreadable_image');
      expect(result.risk_score).toBe(0);
      expect(result.findings.length).toBeGreaterThan(0);
    });

    it('should continue when a detection layer fails', async () => {
      analyzeWithRag.mockRejectedValue(new Error('Qdrant down'));

      const result = await runAnalysis(mockRequest);
      // Should still complete successfully
      expect(result.job_id).toBe(mockRequest.job_id);
      expect(result.status).toBe('completed');
    });

    it('should include findings from rule engine', async () => {
      evaluateRules.mockReturnValue({
        violations: [
          { rule_id: 'spf_fail', severity: 'high', description: 'SPF fail', evidence: {} },
        ],
        score: 75,
      });
      aggregateScores.mockReturnValue({
        risk_score: 75,
        risk_level: 'high',
        category: 'phishing',
      });

      const result = await runAnalysis(mockRequest);
      expect(result.findings.some(f => f.rule_id === 'spf_fail')).toBe(true);
    });
  });

  describe('storing analysed content', () => {
    it('should store safe content with the safe label', async () => {
      await runAnalysis(mockRequest);

      expect(storeContentToVectorDb).toHaveBeenCalledWith(
        mockParsedContent,
        mockRequest.job_id,
        0,
        'safe'
      );
    });

    it('should store rule-confirmed phishing as a known phishing sample', async () => {
      evaluateRules.mockReturnValue({
        violations: [
          { rule_id: 'ip_url', severity: 'high', description: 'IP URL', evidence: {} },
        ],
        score: 80,
      });
      aggregateScores.mockReturnValue({
        risk_score: 20,
        risk_level: 'low',
        category: 'phishing',
      });

      await runAnalysis(mockRequest);

      expect(storeContentToVectorDb).toHaveBeenCalledWith(
        mockParsedContent,
        mockRequest.job_id,
        20,
        'phishing'
      );
    });

    it('should not turn similarity-only phishing into a known phishing sample', async () => {
      analyzeWithRag.mockResolvedValue({
        result: {
          matches: [{ id: '1', similarity: 0.9, label: 'phishing', snippet: 'x' }],
          top_score: 0.9,
          score: 90,
        },
        finding: null,
      });
      aggregateScores.mockReturnValue({
        risk_score: 32,
        risk_level: 'medium',
        category: 'phishing',
      });

      await runAnalysis(mockRequest);

      expect(storeContentToVectorDb).toHaveBeenCalledWith(
        mockParsedContent,
        mockRequest.job_id,
        32,
        'phishing_similar'
      );
    });
  });
});
