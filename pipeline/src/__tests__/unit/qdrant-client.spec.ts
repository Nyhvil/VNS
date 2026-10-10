const mockGetCollections = jest.fn();
const mockCreateCollection = jest.fn();
const mockCreatePayloadIndex = jest.fn();
const mockSearch = jest.fn();
const mockUpsert = jest.fn();

jest.mock('@qdrant/js-client-rest', () => ({
  QdrantClient: jest.fn().mockImplementation(() => ({
    getCollections: mockGetCollections,
    createCollection: mockCreateCollection,
    createPayloadIndex: mockCreatePayloadIndex,
    search: mockSearch,
    upsert: mockUpsert,
  })),
}));

jest.mock('../../config/config', () => ({
  getConfig: jest.fn(() => ({
    qdrantUrl: 'http://localhost:6333',
    qdrantCollection: 'phishing_emails',
    qdrantApiKey: undefined,
  })),
}));

import {
  searchSimilar,
  upsertPoints,
  resetQdrantClient,
  KNOWN_PHISHING_LABEL,
} from '../../rag/qdrant-client';

const vector = new Array(1536).fill(0.1);

describe('Qdrant client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetQdrantClient();
    mockGetCollections.mockResolvedValue({ collections: [{ name: 'phishing_emails' }] });
    mockCreateCollection.mockResolvedValue(true);
    mockCreatePayloadIndex.mockResolvedValue({});
    mockSearch.mockResolvedValue([]);
    mockUpsert.mockResolvedValue({});
  });

  it('should only search samples labelled as known phishing', async () => {
    await searchSimilar(vector, 5);

    expect(mockSearch).toHaveBeenCalledTimes(1);
    const [collection, params] = mockSearch.mock.calls[0];
    expect(collection).toBe('phishing_emails');
    expect(params.limit).toBe(5);
    expect(params.filter).toEqual({
      must: [{ key: 'label', match: { value: KNOWN_PHISHING_LABEL } }],
    });
  });

  it('should create the collection when it does not exist yet', async () => {
    mockGetCollections.mockResolvedValue({ collections: [] });

    await searchSimilar(vector, 5);

    expect(mockCreateCollection).toHaveBeenCalledWith('phishing_emails', {
      vectors: { size: 1536, distance: 'Cosine' },
    });
    expect(mockSearch).toHaveBeenCalledTimes(1);
  });

  it('should not recreate a collection that already exists', async () => {
    await searchSimilar(vector, 5);
    await upsertPoints([{ id: 'a', vector, payload: { label: 'safe' } }]);

    expect(mockCreateCollection).not.toHaveBeenCalled();
    expect(mockGetCollections).toHaveBeenCalledTimes(1);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it('should keep working when the label index cannot be created', async () => {
    mockCreatePayloadIndex.mockRejectedValue(new Error('index exists'));
    mockSearch.mockResolvedValue([{ id: 7, score: 0.9, payload: { label: 'phishing' } }]);

    const results = await searchSimilar(vector, 5);

    expect(results).toEqual([{ id: '7', score: 0.9, payload: { label: 'phishing' } }]);
  });

  it('should retry the collection check after Qdrant was unreachable', async () => {
    mockGetCollections.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await expect(searchSimilar(vector, 5)).rejects.toThrow('Qdrant search failed');
    await expect(searchSimilar(vector, 5)).resolves.toEqual([]);
    expect(mockGetCollections).toHaveBeenCalledTimes(2);
  });

  it('should not call Qdrant when there is nothing to upsert', async () => {
    await upsertPoints([]);

    expect(mockGetCollections).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
