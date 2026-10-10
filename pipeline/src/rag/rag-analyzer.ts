import { ParsedContent, RagResult, RagMatch, Finding, Category, isParsedEmail } from '../types';
import { createEmbedding, createEmbeddings } from './embedding-client';
import { searchSimilar, upsertPoints } from './qdrant-client';
import { getConfig } from '../config/config';
import { logLayerError } from '../logger/logger';
import { chunkContent } from './chunker';
import { v4 as uuidv4 } from 'uuid';

function getTextForEmbedding(content: ParsedContent): string {
  if (isParsedEmail(content)) {
    return [content.subject ?? '', content.body].join(' ').trim();
  }
  return content.body;
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
  if (!config.openaiApiKey) {
    return { result: EMPTY_RAG_RESULT, finding: null };
  }

  try {
    const embedding = await createEmbedding(text);
    const searchResults = await searchSimilar(embedding, config.ragTopK);

    const matches: RagMatch[] = searchResults.slice(0, config.ragTopK).map(r => ({
      id: r.id,
      similarity: r.score,
      label: String(r.payload['label'] ?? 'unknown'),
      snippet: String(r.payload['snippet'] ?? '').slice(0, 200),
    }));

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
 * Keep the analysed content in the vector DB, labelled with the verdict it
 * received. Only points labelled `phishing` are matched by `analyzeWithRag`
 * (see `searchSimilar`), so storing safe content no longer makes that content
 * look like "known phishing" on its next submission.
 */
export async function storeContentToVectorDb(
  content: ParsedContent,
  jobId: string,
  score: number,
  label: Category | 'phishing_similar'
): Promise<void> {
  try {
    // No embedding key means all-zero vectors: nothing worth storing.
    if (!getConfig().openaiApiKey) return;

    const chunks = chunkContent(content);
    if (chunks.length === 0) return;

    const textsToEmbed = chunks.map(c => c.text);
    const embeddings = await createEmbeddings(textsToEmbed);

    const points = chunks.map((chunk, index) => {
      const appSource = content.metadata?.app_source ?? (isParsedEmail(content) ? 'Email' : 'Plain Text');
      const participants = content.metadata?.participants ?? [];
      const timestamp = content.metadata?.timestamp ?? null;

      return {
        id: uuidv4(),
        vector: embeddings[index] ?? new Array(1536).fill(0),
        payload: {
          text: chunk.text,
          snippet: chunk.text.slice(0, 200),
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
