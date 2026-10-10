import { ParsedContent, RagResult, RagMatch, Finding, Category, isParsedEmail } from '../types';
import { createEmbedding, createEmbeddings } from './embedding-client';
import { rerankMatches } from './reranker';
import { sanitizePii } from '../llm/pii-sanitizer';
import { searchSimilar, upsertPoints } from './qdrant-client';
import { getConfig } from '../config/config';
import { getEmbeddingEndpoint } from '../config/ai-endpoints';
import { logLayerError } from '../logger/logger';
import { chunkContent } from './chunker';
import { v4 as uuidv4 } from 'uuid';

/**
 * Text sent to the embedding provider. Personal data is masked first: phone
 * numbers and email addresses do not help find similar scams, and they should
 * not leave the pipeline.
 */
function getTextForEmbedding(content: ParsedContent): string {
  const text = isParsedEmail(content)
    ? [content.subject ?? '', content.body].join(' ').trim()
    : content.body;
  return sanitizePii(text);
}

function buildRagFinding(topScore: number, topMatch: RagMatch): Finding {
  return {
    rule_id: 'similar_to_known_phishing',
    severity: topScore >= 0.9 ? 'critical' : 'high',
    description: `Content is similar to known phishing email (similarity: ${(topScore * 100).toFixed(1)}%)`,
    evidence: {
      top_similarity: topScore,
      matched_sample: topMatch.snippet,
      matched_label: topMatch.label,
    },
  };
}

const EMPTY_RAG_RESULT: RagResult = {
  matches: [],
  top_score: 0,
  score: 0,
};

export async function analyzeWithRag(
  content: ParsedContent,
  jobId: string
): Promise<{ result: RagResult; finding: Finding | null }> {
  const config = getConfig();
  const text = getTextForEmbedding(content);

  if (!text.trim()) {
    return { result: EMPTY_RAG_RESULT, finding: null };
  }

  // Without an embedding key every text becomes the same all-zero vector,
  // which cannot be compared with anything.
  if (!getEmbeddingEndpoint(config).apiKey) {
    return { result: EMPTY_RAG_RESULT, finding: null };
  }

  try {
    const embedding = await createEmbedding(text);

    // Stage 1: fetch more candidates than needed from the vector DB.
    const rerank = config.rerankEnabled !== false;
    const candidateK = rerank ? Math.max(config.ragCandidateK ?? config.ragTopK, config.ragTopK) : config.ragTopK;
    const searchResults = await searchSimilar(embedding, candidateK);

    const candidates: RagMatch[] = searchResults.map(r => ({
      id: r.id,
      similarity: r.score,
      label: String(r.payload['label'] ?? 'unknown'),
      snippet: String(r.payload['snippet'] ?? '').slice(0, 200),
      source: typeof r.payload['source'] === 'string' ? r.payload['source'] : undefined,
    }));

    // Stage 2: rerank and keep the best ragTopK.
    const matches: RagMatch[] = rerank
      ? rerankMatches(text, candidates, config.ragTopK)
      : candidates.slice(0, config.ragTopK);

    const topScore = matches.length > 0 ? Math.max(...matches.map(m => m.similarity)) : 0;
    const score = Math.round(topScore * 100);

    const result: RagResult = { matches, top_score: topScore, score };

    let finding: Finding | null = null;
    if (topScore > config.ragSimilarityThreshold && matches.length > 0) {
      const topMatch = matches.find(m => m.similarity === topScore)!;
      finding = buildRagFinding(topScore, topMatch);
    }

    return { result, finding };
  } catch (error) {
    logLayerError({
      job_id: jobId,
      layer_name: 'rag',
      error_message: error instanceof Error ? error.message : String(error),
      stack_trace: error instanceof Error ? error.stack : undefined,
    });

    return { result: EMPTY_RAG_RESULT, finding: null };
  }
}

/**
 * Label saved with a stored sample. Only `phishing` samples are searched:
 * `phishing_similar` (flagged only for resembling a sample) and `phishing_ml`
 * (flagged only by the classifier) are kept apart so the reference set grows
 * only from content a rule confirmed.
 */
export type StoredLabel = Category | 'phishing_similar' | 'phishing_ml';

/**
 * Keep the analysed content in the vector DB, labelled with the verdict it
 * received. Only points labelled `phishing` are matched by `analyzeWithRag`
 * (see `searchSimilar`), so storing safe content no longer makes that content
 * look like "known phishing" on its next submission.
 */
export async function storeContentToVectorDb(
  content: ParsedContent,
  jobId: string,
  score: number,
  label: StoredLabel
): Promise<void> {
  try {
    // No embedding key means all-zero vectors: nothing worth storing.
    if (!getEmbeddingEndpoint(getConfig()).apiKey) return;

    const chunks = chunkContent(content);
    if (chunks.length === 0) return;

    // What is stored may later be shown as "a similar known scam", so personal
    // data is masked before it is embedded and saved.
    const textsToEmbed = chunks.map(c => sanitizePii(c.text));
    const embeddings = await createEmbeddings(textsToEmbed);

    const points = chunks.map((chunk, index) => {
      const appSource = content.metadata?.app_source ?? (isParsedEmail(content) ? 'Email' : 'Plain Text');
      const participants = content.metadata?.participants ?? [];
      const timestamp = content.metadata?.timestamp ?? null;

      return {
        id: uuidv4(),
        vector: embeddings[index] ?? new Array(1536).fill(0),
        payload: {
          text: textsToEmbed[index],
          snippet: (textsToEmbed[index] ?? '').slice(0, 200),
          label,
          source: 'pipeline_auto',
          jobId,
          score,
          app_source: appSource,
          participants,
          timestamp,
          chunk_index: chunk.index,
          created_at: new Date().toISOString(),
        },
      };
    });

    await upsertPoints(points);
  } catch (error) {
    logLayerError({
      job_id: jobId,
      layer_name: 'rag_store',
      error_message: `Failed to store content to VectorDB: ${error instanceof Error ? error.message : String(error)}`,
      stack_trace: error instanceof Error ? error.stack : undefined,
    });
  }
}
