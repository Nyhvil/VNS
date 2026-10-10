import { getConfig } from '../config/config';
import { getEmbeddingEndpoint } from '../config/ai-endpoints';

const DEFAULT_DIMENSIONS = 1536;

function getDimensions(): number {
  return getConfig().embeddingDimensions ?? DEFAULT_DIMENSIONS;
}

/** True when an embedding provider is configured. */
export function isEmbeddingConfigured(): boolean {
  return !!getEmbeddingEndpoint(getConfig()).apiKey;
}

async function createClient() {
  const endpoint = getEmbeddingEndpoint(getConfig());
  const { default: OpenAI } = await import('openai');
  return {
    client: new OpenAI({ apiKey: endpoint.apiKey, baseURL: endpoint.baseURL }),
    model: endpoint.model,
  };
}

/**
 * Models that can return a chosen vector size. The size must match the
 * Qdrant collection, so it is requested explicitly where the API allows it.
 */
function supportsDimensions(model: string): boolean {
  return /text-embedding-3|gemini-embedding/i.test(model);
}

function buildParams(model: string, input: string | string[]) {
  const params: { model: string; input: string | string[]; dimensions?: number } = { model, input };
  if (supportsDimensions(model)) {
    params.dimensions = getDimensions();
  }
  return params;
}

export async function createEmbedding(text: string): Promise<number[]> {
  if (!isEmbeddingConfigured()) {
    return new Array(getDimensions()).fill(0);
  }

  try {
    const { client, model } = await createClient();
    const response = await client.embeddings.create(buildParams(model, text.slice(0, 8000)));

    return response.data[0]?.embedding ?? new Array(getDimensions()).fill(0);
  } catch (error) {
    throw new Error(`Embedding creation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  if (!isEmbeddingConfigured() || texts.length === 0) {
    return texts.map(() => new Array(getDimensions()).fill(0));
  }

  try {
    const { client, model } = await createClient();
    const response = await client.embeddings.create(
      buildParams(model, texts.map(t => t.slice(0, 8000)))
    );

    return response.data.map(d => d.embedding);
  } catch (error) {
    throw new Error(`Batch embedding creation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
