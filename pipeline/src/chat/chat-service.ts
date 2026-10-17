import { z } from 'zod';
import { RagMatch } from '../types';
import { getConfig } from '../config/config';
import { getLlmEndpoint, getEmbeddingEndpoint } from '../config/ai-endpoints';
import { createEmbedding } from '../rag/embedding-client';
import { searchSimilar } from '../rag/qdrant-client';
import { rerankMatches } from '../rag/reranker';
import { matchScamPatterns } from '../knowledge';
import { sanitizePii } from '../llm/pii-sanitizer';
import { NO_CONTACT_RULE, removeContactDetails } from '../llm/contact-guard';
import { logLayerError } from '../logger/logger';

/**
 * RAG-based chatbot: answers a user's follow-up question about a piece of
 * content ("why is this a scam?", "what should I do now?").
 *
 * The answer is grounded in what the system knows: similar scam samples
 * retrieved from the vector DB and the matching entries of the scam-pattern
 * knowledge base. The model is told to rely on that context.
 */

export const ChatRequestSchema = z.object({
  question: z.string().trim().min(1, 'Missing required field: question').max(1000),
  /** The content the user had analysed, if any. */
  content: z.string().max(10000).optional(),
  /** Verdict of that analysis, so the answer stays consistent with it. */
  verdict: z
    .object({
      risk_level: z.string().max(20).optional(),
      scam_percent: z.number().min(0).max(100).optional(),
      explanation: z.string().max(4000).optional(),
    })
    .optional(),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) }))
    .max(10)
    .optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export interface ChatSource {
  snippet: string;
  similarity: number;
  label: string;
  /** "curated" (seeded by the team) or "pipeline_auto" (learned from analysed content). */
  source: string;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
}

export class ChatUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChatUnavailableError';
  }
}

/** Samples below this similarity are too loosely related to quote as context. */
const MIN_SOURCE_SIMILARITY = 0.5;
const MAX_SOURCES = 3;
const CURATED_SOURCE = 'curated';

const SYSTEM_PROMPT = `Bạn là trợ lý an toàn số của VNS – VIỆT NAM SAFE, giúp người dùng Việt Nam nhận biết và phòng tránh lừa đảo trực tuyến.

Quy tắc:
- Trả lời bằng tiếng Việt, ngắn gọn (dưới 150 từ), dễ hiểu với người không rành công nghệ.
- Viết văn bản thường: không dùng ký hiệu định dạng như **, #, hay bảng. Khi liệt kê các bước, mỗi bước một dòng, bắt đầu bằng "- ".
- Dựa vào phần "Ngữ cảnh" được cung cấp (kết quả phân tích, mẫu lừa đảo tương tự, kiến thức về các hình thức lừa đảo). Nếu ngữ cảnh không đủ để trả lời, hãy nói rõ là bạn không chắc.
- Chỉ trả lời về an toàn số và phòng chống lừa đảo. Với câu hỏi ngoài phạm vi, hãy từ chối lịch sự.
- Không bao giờ yêu cầu người dùng cung cấp mật khẩu, mã OTP, số thẻ hay giấy tờ tùy thân.
- Khi người dùng có thể đã bị lừa, hướng dẫn họ liên hệ ngân hàng và trình báo cơ quan công an.
- ${NO_CONTACT_RULE}`;

const CHAT_MAX_TOKENS = 4096;

/**
 * An answer cut off by the token limit: keep the complete sentences (or
 * lines) and mark that something was left out, rather than stopping mid-word.
 */
export function trimToLastSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const ends = [...trimmed.matchAll(/[.!?…](?=\s|$)|\n/g)].map(m => (m.index ?? 0) + 1);
  const cut = ends.filter(i => i >= trimmed.length * 0.3).pop();
  return `${(cut ? trimmed.slice(0, cut) : trimmed).trim()} …`;
}

async function retrieveSources(queryText: string, jobId: string): Promise<ChatSource[]> {
  const config = getConfig();
  if (!getEmbeddingEndpoint(config).apiKey) return [];

  try {
    const embedding = await createEmbedding(sanitizePii(queryText));
    const candidateK = Math.max(config.ragCandidateK ?? config.ragTopK ?? 5, MAX_SOURCES);
    const results = await searchSimilar(embedding, candidateK);

    const candidates: RagMatch[] = results.map(r => ({
      id: r.id,
      similarity: r.score,
      label: String(r.payload['label'] ?? 'unknown'),
      snippet: String(r.payload['snippet'] ?? '').slice(0, 300),
      source: typeof r.payload['source'] === 'string' ? r.payload['source'] : 'unknown',
    }));

    return rerankMatches(queryText, candidates, MAX_SOURCES)
      .filter(match => match.similarity >= MIN_SOURCE_SIMILARITY && match.snippet)
      .map(match => ({
        snippet: match.snippet,
        similarity: match.similarity,
        label: match.label,
        source: match.source ?? 'unknown',
      }));
  } catch (error) {
    // The chatbot still answers from the knowledge base when retrieval fails.
    logLayerError({
      job_id: jobId,
      layer_name: 'chat_retrieval',
      error_message: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export function buildChatContext(request: ChatRequest, sources: ChatSource[]): string {
  const sections: string[] = [];

  if (request.content) {
    sections.push(`Nội dung người dùng đã kiểm tra:\n"""\n${sanitizePii(request.content).slice(0, 2000)}\n"""`);
  }

  if (request.verdict) {
    const { risk_level, scam_percent, explanation } = request.verdict;
    const parts = [
      risk_level ? `mức ${risk_level}` : null,
      typeof scam_percent === 'number' ? `điểm lừa đảo ${scam_percent}/100` : null,
    ].filter(Boolean);
    sections.push(
      `Kết quả phân tích của hệ thống: ${parts.join(', ') || 'không có'}.${explanation ? `\nGiải thích: ${sanitizePii(explanation).slice(0, 1500)}` : ''}`
    );
  }

  if (sources.length > 0) {
    sections.push(
      'Mẫu lừa đảo tương tự trong cơ sở dữ liệu:\n' +
        sources
          .map(s => `- (giống ${(s.similarity * 100).toFixed(0)}%) "${sanitizePii(s.snippet)}"`)
          .join('\n')
    );
  }

  const patterns = matchScamPatterns(`${request.question}\n${request.content ?? ''}`).slice(0, 4);
  if (patterns.length > 0) {
    sections.push(
      'Kiến thức về các hình thức lừa đảo liên quan:\n' +
        patterns.map(p => `- ${p.name}: ${p.description}`).join('\n')
    );
  }

  return sections.length > 0 ? sections.join('\n\n') : 'Không có ngữ cảnh bổ sung.';
}

export async function answerQuestion(request: ChatRequest, jobId: string): Promise<ChatResponse> {
  const config = getConfig();
  const endpoint = getLlmEndpoint(config);

  if (!config.llmEnabled || !endpoint.apiKey) {
    throw new ChatUnavailableError('The chatbot needs an LLM: set LLM_ENABLED=true and an API key');
  }

  const retrievalQuery = [request.question, request.content?.slice(0, 500)].filter(Boolean).join('\n');
  const sources = await retrieveSources(retrievalQuery, jobId);
  const context = buildChatContext(request, sources);

  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: endpoint.apiKey, baseURL: endpoint.baseURL });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('LLM timeout')), (config.llmTimeoutMs ?? 10000) * 2)
  );

  const completion = client.chat.completions.create({
    model: endpoint.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(request.history ?? []).map(turn => ({ role: turn.role, content: sanitizePii(turn.content) })),
      { role: 'user', content: `Ngữ cảnh:\n${context}\n\nCâu hỏi: ${sanitizePii(request.question)}` },
    ],
    // Generous: with "thinking" models (Gemini 2.5 and later) the model's
    // reasoning counts towards this limit too, and a tight limit cuts the
    // visible answer off mid-sentence.
    max_tokens: CHAT_MAX_TOKENS,
  });

  const response = await Promise.race([completion, timeoutPromise]);
  const choice = response.choices[0];
  let answer = choice?.message?.content?.trim() ?? '';
  if (choice?.finish_reason === 'length') answer = trimToLastSentence(answer);
  answer = removeContactDetails(answer);

  if (!answer) {
    throw new Error('The model returned an empty answer');
  }

  // The model may read every retrieved sample, but only the team's curated
  // samples are returned to the caller: samples learned from what other
  // people submitted are not shown to anyone else.
  return { answer, sources: sources.filter(source => source.source === CURATED_SOURCE) };
}
