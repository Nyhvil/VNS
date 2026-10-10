import { getConfig } from '../config/config';
import { QdrantPoint } from '../types';

export interface QdrantSearchResult {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}

/** Payload label of the samples the RAG layer is allowed to match against. */
export const KNOWN_PHISHING_LABEL = 'phishing';

/** Size of text-embedding-3-small vectors. */
const VECTOR_SIZE = 1536;

type QdrantClientInstance = InstanceType<typeof import('@qdrant/js-client-rest').QdrantClient>;

let clientPromise: Promise<QdrantClientInstance> | null = null;
let collectionReady: Promise<void> | null = null;

async function getClient(): Promise<QdrantClientInstance> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const config = getConfig();
      const { QdrantClient } = await import('@qdrant/js-client-rest');
      return new QdrantClient({
        url: config.qdrantUrl,
        apiKey: config.qdrantApiKey,
      });
    })();
  }
  return clientPromise;
}

/**
 * Create the collection (and the index on `label`) the first time it is
 * needed. Without this a fresh Qdrant has no collection, every search and
 * upsert fails, and the RAG layer silently scores 0 forever.
 */
async function ensureCollection(): Promise<void> {
  if (!collectionReady) {
    collectionReady = (async () => {
      const config = getConfig();
      const client = await getClient();

      const { collections } = await client.getCollections();
      const exists = collections.some(c => c.name === config.qdrantCollection);

      if (!exists) {
        await client.createCollection(config.qdrantCollection, {
          vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
        });
      }

      try {
        await client.createPayloadIndex(config.qdrantCollection, {
          field_name: 'label',
          field_schema: 'keyword',
          wait: true,
        });
      } catch {
        // The index already exists, or this Qdrant version filters without
        // one. Searching still works either way.
      }
    })().catch(error => {
      // Do not cache a failure: Qdrant may simply not be up yet.
      collectionReady = null;
      throw error;
    });
  }
  return collectionReady;
}

/**
 * Find the stored samples most similar to `vector`.
 *
 * Only samples labelled as known phishing are searched. The collection also
 * holds every piece of content the pipeline has analysed (safe content
 * included); matching against those would make any content look like
 * "known phishing" the second time it is submitted.
 */
export async function searchSimilar(
  vector: number[],
  topK: number
): Promise<QdrantSearchResult[]> {
  const config = getConfig();

  try {
    await ensureCollection();
    const client = await getClient();

    const results = await client.search(config.qdrantCollection, {
      vector,
      limit: topK,
      with_payload: true,
      filter: {
        must: [{ key: 'label', match: { value: KNOWN_PHISHING_LABEL } }],
      },
    });

    return results.map((r: { id: string | number; score: number; payload?: Record<string, unknown> | null }) => ({
      id: String(r.id),
      score: r.score,
      payload: (r.payload as Record<string, unknown>) ?? {},
    }));
  } catch (error) {
    throw new Error(`Qdrant search failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function upsertPoints(points: QdrantPoint[]): Promise<void> {
  const config = getConfig();
  if (points.length === 0) return;

  try {
    await ensureCollection();
    const client = await getClient();

    await client.upsert(config.qdrantCollection, {
      wait: true,
      points,
    });
  } catch (error) {
    throw new Error(`Qdrant upsert failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** For tests: forget the cached client and collection state. */
export function resetQdrantClient(): void {
  clientPromise = null;
  collectionReady = null;
}
