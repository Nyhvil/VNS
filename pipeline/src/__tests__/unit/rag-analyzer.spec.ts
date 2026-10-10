import { analyzeWithRag } from '../../rag/rag-analyzer';
import { ParsedText } from '../../types';

// Mock dependencies
jest.mock('../../rag/embedding-client', () => ({
  createEmbedding: jest.fn(),
}));

jest.mock('../../rag/qdrant-client', () => ({
  searchSimilar: jest.fn(),
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

const { createEmbedding } = require('../../rag/embedding-client');
const { searchSimilar } = require('../../rag/qdrant-client');

const mockContent: ParsedText = {
  body: 'Urgent: verify your account now',
  urls: [],
};

describe('RAG Analyzer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createEmbedding.mockResolvedValue(new Array(1536).fill(0.1));
  });

  it('should return finding when similarity > 0.75', async () => {
    searchSimilar.mockResolvedValue([
      { id: '1', score: 0.92, payload: { label: 'phishing', snippet: 'Verify your account' } },
      { id: '2', score: 0.80, payload: { label: 'phishing', snippet: 'Click here' } },
    ]);

    const { result, finding } = await analyzeWithRag(mockContent, 'job-1');

    expect(result.top_score).toBe(0.92);
    expect(result.matches.length).toBe(2);
    expect(finding).not.toBeNull();
    expect(finding?.rule_id).toBe('similar_to_known_phishing');
  });

  it('should return no finding when similarity <= 0.75', async () => {
    searchSimilar.mockResolvedValue([
      { id: '1', score: 0.50, payload: { label: 'safe', snippet: 'Hello world' } },
    ]);

    const { result, finding } = await analyzeWithRag(mockContent, 'job-2');

    expect(result.top_score).toBe(0.50);
    expect(finding).toBeNull();
  });

  it('should return empty result when Qdrant is unavailable', async () => {
    createEmbedding.mockResolvedValue(new Array(1536).fill(0.1));
    searchSimilar.mockRejectedValue(new Error('Connection refused'));

    const { result, finding } = await analyzeWithRag(mockContent, 'job-3');

    expect(result.top_score).toBe(0);
    expect(result.score).toBe(0);
    expect(result.matches).toEqual([]);
    expect(finding).toBeNull();
  });

  it('should return empty result for empty content', async () => {
    const emptyContent: ParsedText = { body: '', urls: [] };

    const { result, finding } = await analyzeWithRag(emptyContent, 'job-4');

    expect(result.top_score).toBe(0);
    expect(finding).toBeNull();
  });

  it('should cap matches at topK', async () => {
    searchSimilar.mockResolvedValue([
      { id: '1', score: 0.95, payload: { label: 'phishing', snippet: 'A' } },
      { id: '2', score: 0.90, payload: { label: 'phishing', snippet: 'B' } },
      { id: '3', score: 0.85, payload: { label: 'phishing', snippet: 'C' } },
      { id: '4', score: 0.80, payload: { label: 'phishing', snippet: 'D' } },
      { id: '5', score: 0.76, payload: { label: 'phishing', snippet: 'E' } },
    ]);

    const { result } = await analyzeWithRag(mockContent, 'job-5');

    expect(result.matches.length).toBeLessThanOrEqual(5);
  });
});
