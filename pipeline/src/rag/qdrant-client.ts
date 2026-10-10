import { getConfig } from '../config/config';
import { QdrantPoint } from '../types';

export interface QdrantSearchResult {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}

export async function searchSimilar(
  vector: number[],
  topK: number
): Promise<QdrantSearchResult[]> {
  const config = getConfig();

  try {
    const { QdrantClient } = await import('@qdrant/js-client-rest');
    const client = new QdrantClient({
      url: config.qdrantUrl,
      apiKey: config.qdrantApiKey,
    });

    const results = await client.search(config.qdrantCollection, {
      vector,
      limit: topK,
      with_payload: true,
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
    const { QdrantClient } = await import('@qdrant/js-client-rest');
    const client = new QdrantClient({
      url: config.qdrantUrl,
      apiKey: config.qdrantApiKey,
    });

    await client.upsert(config.qdrantCollection, {
      wait: true,
      points,
    });
  } catch (error) {
    throw new Error(`Qdrant upsert failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
