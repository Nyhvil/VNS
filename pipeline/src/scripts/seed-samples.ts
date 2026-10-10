import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { v5 as uuidv5 } from 'uuid';
import { createEmbeddings, isEmbeddingConfigured } from '../rag/embedding-client';
import { upsertPoints, countPoints, KNOWN_PHISHING_LABEL } from '../rag/qdrant-client';
import { QdrantPoint } from '../types';

/**
 * Load the curated scam samples into the vector DB:
 *
 *   npm run seed            (after npm run build)
 *
 * A fresh install has an empty sample store, so the similarity layer has
 * nothing to compare against until this has run. Running it again is safe:
 * every sample has a fixed id derived from its text.
 */

const SAMPLES_FILE = path.join(__dirname, '../../data/scam_samples.vi.json');
/** Namespace for the deterministic sample ids. */
const ID_NAMESPACE = '8f2b6c1e-4f0a-4c3b-9d57-2a6e1f7b9c10';
const BATCH_SIZE = 16;

interface SampleFile {
  samples: Array<{ pattern: string; text: string }>;
}

async function main(): Promise<void> {
  if (!isEmbeddingConfigured()) {
    console.error('No embedding API key: set OPENAI_API_KEY (or EMBEDDING_API_KEY) in pipeline/.env first.');
    process.exit(1);
  }

  const file = JSON.parse(fs.readFileSync(SAMPLES_FILE, 'utf8')) as SampleFile;
  const samples = file.samples.filter(s => s.text && s.text.trim());

  for (let start = 0; start < samples.length; start += BATCH_SIZE) {
    const batch = samples.slice(start, start + BATCH_SIZE);
    const vectors = await createEmbeddings(batch.map(s => s.text));

    const points: QdrantPoint[] = batch.map((sample, index) => ({
      id: uuidv5(sample.text, ID_NAMESPACE),
      vector: vectors[index] ?? [],
      payload: {
        text: sample.text,
        snippet: sample.text.slice(0, 200),
        label: KNOWN_PHISHING_LABEL,
        source: 'curated',
        pattern: sample.pattern,
        created_at: new Date().toISOString(),
      },
    }));

    await upsertPoints(points);
    console.log(`- ${Math.min(start + BATCH_SIZE, samples.length)}/${samples.length} samples stored`);
  }

  const total = await countPoints(KNOWN_PHISHING_LABEL);
  console.log(`Done. The store now holds ${total} known scam samples.`);
}

main().catch(error => {
  console.error(`Seeding failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
