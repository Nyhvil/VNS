import { analyzeWithRag, storeContentToVectorDb } from '../../rag/rag-analyzer';
import { ParsedText } from '../../types';

const mockConfig: { openaiApiKey?: string; ragTopK: number; ragSimilarityThreshold: number } = {
  openaiApiKey: 'test-key',
  ragTopK: 5,
  ragSimilarityThreshold: 0.75,
};

jest.mock('../../rag/embedding-client', () => ({
  createEmbedding: jest.fn(),
  createEmbeddings: jest.fn(),
}));

jest.mock('../../rag/qdrant-client', () => ({
  searchSimilar: jest.fn(),
  upsertPoints: jest.fn(),
}));

jest.mock('../../config/config', () => ({
  getConfig: jest.fn(() => mockConfig),
}));

jest.mock('../../logger/logger', () => ({
  logLayerError: jest.fn(),
}));

const { createEmbedding, createEmbeddings } = require('../../rag/embedding-client');
const { searchSimilar, upsertPoints } = require('../../rag/qdrant-client');

const content: ParsedText = {
  body: 'Chào bạn, chiều nay 3 giờ nhóm mình họp ở thư viện tầng 2 nhé.',
  urls: [],
};

describe('RAG store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig.openaiApiKey = 'test-key';
    createEmbedding.mockResolvedValue(new Array(1536).fill(0.1));
    createEmbeddings.mockImplementation(async (texts: string[]) =>
      texts.map(() => new Array(1536).fill(0.1))
    );
    searchSimilar.mockResolvedValue([]);
    upsertPoints.mockResolvedValue(undefined);
  });

  it('should store content with the label of its verdict', async () => {
    await storeContentToVectorDb(content, 'job-1', 0, 'safe');

    expect(upsertPoints).toHaveBeenCalledTimes(1);
    const points = upsertPoints.mock.calls[0][0];
    expect(points.length).toBeGreaterThan(0);
    for (const point of points) {
      expect(point.payload.label).toBe('safe');
      expect(point.payload.source).toBe('pipeline_auto');
      expect(point.payload.snippet).toBe(String(point.payload.text).slice(0, 200));
    }
  });

  it('should label phishing content as phishing', async () => {
    await storeContentToVectorDb(content, 'job-2', 80, 'phishing');

    const points = upsertPoints.mock.calls[0][0];
    expect(points[0].payload.label).toBe('phishing');
  });

  it('should not store anything without an embedding key', async () => {
    mockConfig.openaiApiKey = undefined;

    await storeContentToVectorDb(content, 'job-3', 0, 'safe');

    expect(createEmbeddings).not.toHaveBeenCalled();
    expect(upsertPoints).not.toHaveBeenCalled();
  });

  it('should skip the similarity search without an embedding key', async () => {
    mockConfig.openaiApiKey = undefined;

    const { result, finding } = await analyzeWithRag(content, 'job-4');

    expect(createEmbedding).not.toHaveBeenCalled();
    expect(searchSimilar).not.toHaveBeenCalled();
    expect(result).toEqual({ matches: [], top_score: 0, score: 0 });
    expect(finding).toBeNull();
  });
});
