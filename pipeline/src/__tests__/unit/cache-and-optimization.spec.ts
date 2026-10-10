import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { SimpleCache, generateHash } from '../../cache/cache-manager';
import { runAnalysis } from '../../orchestrator/analysis-orchestrator';
import { AnalysisRequest } from '../../types';

// Mock dependecies of orchestrator
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
  storeContentToVectorDb: jest.fn(() => Promise.resolve()),
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
    llmEnabled: true,
    openaiApiKey: 'test-key',
    cacheEnabled: true,
    cacheTtlMs: 300000,
    cacheMaxSize: 1000,
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
const { analyzeWithRag } = require('../../rag/rag-analyzer');
const { analyzeWithLlm } = require('../../llm/llm-analyzer');
const { aggregateScores } = require('../../scoring/score-aggregator');
const { resetCaches } = require('../../cache/cache-manager');

describe('Optimization and Cache Verification', () => {
  
  describe('SimpleCache', () => {
    it('should set and get values correctly', () => {
      const cache = new SimpleCache<string>(1000, 5);
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should respect TTL', async () => {
      const cache = new SimpleCache<string>(10, 5); // 10ms TTL
      cache.set('key1', 'value1');
      
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(cache.get('key1')).toBeNull();
    });

    it('should respect maxSize and evict using FIFO', () => {
      const cache = new SimpleCache<string>(10000, 2); // Max 2 entries
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3'); // Exceeds size, should evict key1
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
    });

    it('should generate unique hash correctly', () => {
      const content = 'test string';
      const hash = generateHash(content);
      expect(hash).toHaveLength(64); // SHA256 returns 64 character hex string
      expect(generateHash(content)).toBe(hash);
    });
  });

  describe('Analysis Orchestrator Early Exit and Caching', () => {
    const mockRequest: AnalysisRequest = {
      job_id: 'test-job-uuid-123',
      type: 'plain_text',
      content: 'Unique text content for testing optimizations',
    };

    const mockParsedContent = { body: 'Unique text content for testing optimizations', urls: [] };
    const mockFeatures = {
      sender_domain: null,
      reply_to_domain: null,
      urls: [],
      suspicious_keywords: [],
      domain_mismatch: false,
      spf_result: null,
      dkim_result: null,
    };

    beforeEach(() => {
      jest.clearAllMocks();
      resetCaches();

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
      analyzeWithLlm.mockResolvedValue({ explanation: 'AI Safe', score: 0, enabled: true });
      aggregateScores.mockReturnValue({
        risk_score: 0,
        risk_level: 'low',
        category: 'safe',
      });
    });

    it('should early exit and NOT call LLM when preliminary score is very low (<15)', async () => {
      // Preliminary score: 0.35*0 + 0.25*0 + 0.20*0 + 0.10*0 = 0 (< 15)
      const result = await runAnalysis(mockRequest);
      
      expect(result.risk_score).toBe(0);
      expect(analyzeWithLlm).not.toHaveBeenCalled();
    });

    it('should call LLM when preliminary score is in intermediate zone [15, 75)', async () => {
      // Set RAG score to 50 -> Preliminary: 0.35*50 = 17.5 (>= 15 and < 75)
      analyzeWithRag.mockResolvedValue({
        result: { matches: [], top_score: 0.5, score: 50 },
        finding: null,
      });
      aggregateScores.mockReturnValue({
        risk_score: 25,
        risk_level: 'low',
        category: 'safe',
      });

      const result = await runAnalysis(mockRequest);
      
      expect(analyzeWithLlm).toHaveBeenCalled();
      expect(result.risk_score).toBe(25);
    });

    it('should early exit and NOT call LLM when preliminary score is high (>=75)', async () => {
      // Set RAG score to 90, Rule score to 100, Header score to 80 (SPF & DKIM fail), Image score to 50
      // Preliminary: 0.35*90 (31.5) + 0.25*100 (25) + 0.20*80 (16) + 0.10*50 (5) = 77.5 (>= 75)
      extractFeatures.mockReturnValue({
        ...mockFeatures,
        spf_result: 'fail',
        dkim_result: 'fail',
      });
      
      parseInput.mockResolvedValue({
        content: mockParsedContent,
        imageScore: 50,
        ocrFailed: false,
      });

      analyzeWithRag.mockResolvedValue({
        result: { matches: [], top_score: 0.9, score: 90 },
        finding: null,
      });
      evaluateRules.mockReturnValue({
        violations: [{ rule_id: 'spf_fail', severity: 'high', description: 'SPF fail', evidence: {} }],
        score: 100
      });
      
      aggregateScores.mockReturnValue({
        risk_score: 85,
        risk_level: 'critical',
        category: 'phishing',
      });

      const result = await runAnalysis(mockRequest);
      
      expect(analyzeWithLlm).not.toHaveBeenCalled();
      expect(result.risk_score).toBe(85);
    });

    it('should serve subsequent identical requests from cache directly', async () => {
      // 1st run: will analyze and cache
      await runAnalysis(mockRequest);
      
      expect(parseInput).toHaveBeenCalledTimes(1);
      expect(evaluateRules).toHaveBeenCalledTimes(1);

      // 2nd run with same request content
      jest.clearAllMocks();
      const result = await runAnalysis(mockRequest);

      // Result should be served from Cache! Orchestrator layers should not be called again
      expect(parseInput).not.toHaveBeenCalled();
      expect(evaluateRules).not.toHaveBeenCalled();
      expect(result.risk_score).toBe(0);
      expect(result.status).toBe('completed');
    });
  });
});
