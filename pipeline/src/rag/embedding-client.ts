import { getConfig } from '../config/config';

export async function createEmbedding(text: string): Promise<number[]> {
  const config = getConfig();

  if (!config.openaiApiKey) {
    return new Array(1536).fill(0);
  }

  try {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: config.openaiApiKey });

    const response = await client.embeddings.create({
      model: config.openaiEmbeddingModel,
      input: text.slice(0, 8000),
    });

    return response.data[0]?.embedding ?? new Array(1536).fill(0);
  } catch (error) {
    throw new Error(`Embedding creation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  const config = getConfig();

  if (!config.openaiApiKey || texts.length === 0) {
    return texts.map(() => new Array(1536).fill(0));
  }

  try {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: config.openaiApiKey });

    const cleanedInputs = texts.map(t => t.slice(0, 8000));

    const response = await client.embeddings.create({
      model: config.openaiEmbeddingModel,
      input: cleanedInputs,
    });

    return response.data.map(d => d.embedding);
  } catch (error) {
    throw new Error(`Batch embedding creation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
