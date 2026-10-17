import { ParsedContent, LlmResult, FeatureSet, RagMatch, MlResult } from '../types';
import { sanitizePii } from './pii-sanitizer';
import { NO_CONTACT_RULE, removeContactDetails } from './contact-guard';
import { getConfig } from '../config/config';
import { getLlmEndpoint, getReasoningOptions } from '../config/ai-endpoints';
import { logLayerError } from '../logger/logger';

const DISABLED_RESULT: LlmResult = {
  explanation: '',
  score: 0,
  enabled: false,
};

/** What the other layers found, handed to the model as ground truth. */
export interface LlmContext {
  ragMatches?: RagMatch[];
  ml?: MlResult;
}

const SYSTEM_PROMPT = `Bạn là chuyên gia an ninh mạng tại Việt Nam. Nhiệm vụ: đánh giá một nội dung (tin nhắn, email, văn bản trích từ ảnh) có phải lừa đảo hay không.

Bạn được cung cấp kết quả kiểm tra của các lớp khác: bộ luật, kiểm tra đường link, đối chiếu tổ chức thật tại Việt Nam, mẫu lừa đảo phổ biến, các mẫu lừa đảo tương tự tìm được trong cơ sở dữ liệu, và kết quả của mô hình phân loại. HÃY DÙNG CÁC DỮ LIỆU NÀY LÀM CĂN CỨ. Nếu nội dung nhắc tới một tổ chức thật nhưng đường link không thuộc tên miền chính thức thì khả năng giả mạo cao.

${NO_CONTACT_RULE}

Lưu ý: nội dung có thể được trích từ ảnh nên còn lỗi ký tự; thông tin cá nhân đã được thay bằng ký hiệu như [PHONE_REDACTED].

Trả lời bằng MỘT đối tượng JSON, không kèm văn bản nào khác:
{
  "score": <số nguyên 0-100, xác suất lừa đảo>,
  "explanation": "giải thích bằng tiếng Việt, nêu rõ lý do dựa trên các căn cứ",
  "dangerous_phrases": ["các cụm từ nguy hiểm trích từ nội dung"],
  "advice": "lời khuyên cụ thể cho người dùng, bằng tiếng Việt",
  "verification_summary": "tóm tắt ngắn kết quả kiểm tra link, tổ chức, mẫu lừa đảo"
}`;

function describeFeatures(features: FeatureSet): string[] {
  const lines: string[] = [];

  if (features.spf_result) lines.push(`SPF: ${features.spf_result}`);
  if (features.dkim_result) lines.push(`DKIM: ${features.dkim_result}`);
  if (features.domain_mismatch) lines.push('Tên miền người gửi và địa chỉ trả lời khác nhau');
  if (features.suspicious_keywords.length > 0) {
    lines.push(`Từ khóa đáng ngờ: ${features.suspicious_keywords.slice(0, 8).join(', ')}`);
  }
  if (features.urls.some(u => u.is_ip_based)) lines.push('Có link dùng địa chỉ IP');
  if (features.urls.some(u => u.is_shortener)) lines.push('Có link rút gọn');

  const knowledge = features.knowledge;
  if (knowledge) {
    for (const url of knowledge.urls.slice(0, 5)) {
      lines.push(`Link ${url.url}: ${url.suspicious ? 'ĐÁNG NGỜ' : 'không thấy bất thường'} (${url.reasons.join('; ')})`);
    }
    for (const entity of knowledge.entities.slice(0, 5)) {
      lines.push(`Tổ chức thật được nhắc tới (${entity.category}): ${entity.found.slice(0, 5).join(', ')}`);
    }
    for (const pattern of knowledge.patterns.slice(0, 5)) {
      lines.push(
        `Khớp mẫu lừa đảo "${pattern.name}" (độ nguy hiểm ${pattern.risk_weight}%), từ khóa: ${pattern.matched_keywords.join(', ')}`
      );
    }
  }

  return lines;
}

export function buildPrompt(content: ParsedContent, features: FeatureSet, context: LlmContext = {}): string {
  const sanitizedBody = sanitizePii(content.body);
  const lines = describeFeatures(features);

  for (const match of (context.ragMatches ?? []).slice(0, 3)) {
    lines.push(
      `Mẫu lừa đảo tương tự trong cơ sở dữ liệu (giống ${(match.similarity * 100).toFixed(0)}%): "${sanitizePii(match.snippet).slice(0, 160)}"`
    );
  }

  if (context.ml?.available && context.ml.label) {
    lines.push(
      `Mô hình phân loại (${context.ml.model ?? 'ML'}): ${context.ml.label === 'scam' ? 'lừa đảo' : 'an toàn'}, xác suất lừa đảo ${(context.ml.scam_probability * 100).toFixed(0)}%`
    );
  }

  return `Nội dung cần đánh giá:
"""
${sanitizedBody.slice(0, 3000)}
"""

Kết quả kiểm tra của các lớp khác:
${lines.length > 0 ? lines.map(line => `- ${line}`).join('\n') : '- Không phát hiện dấu hiệu nào'}`;
}

function parseJsonObject(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // Some models wrap the JSON in a code block or add a sentence around it.
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 12);
}

export async function analyzeWithLlm(
  content: ParsedContent,
  features: FeatureSet,
  jobId: string,
  context: LlmContext = {}
): Promise<LlmResult> {
  const config = getConfig();

  if (!config.llmEnabled) {
    return DISABLED_RESULT;
  }

  const endpoint = getLlmEndpoint(config);
  if (!endpoint.apiKey) {
    return DISABLED_RESULT;
  }

  try {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: endpoint.apiKey, baseURL: endpoint.baseURL });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('LLM timeout')), config.llmTimeoutMs)
    );

    const llmPromise = client.chat.completions.create({
      model: endpoint.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildPrompt(content, features, context) },
      ],
      response_format: { type: 'json_object' },
      // Room for the reasoning of "thinking" models as well as the JSON answer.
      max_tokens: 4096,
      ...getReasoningOptions(config),
    });

    const response = await Promise.race([llmPromise, timeoutPromise]);
    const rawContent = response.choices[0]?.message?.content ?? '{}';
    const parsed = parseJsonObject(rawContent);

    const rawScore = parsed['score'] ?? parsed['scamPercent'];
    const hasScore = typeof rawScore === 'number' && Number.isFinite(rawScore);
    const explanation = typeof parsed['explanation'] === 'string' ? parsed['explanation'] : '';

    return {
      explanation,
      score: hasScore ? Math.min(100, Math.max(0, Math.round(rawScore as number))) : 0,
      enabled: true,
      // A verdict counts only when the model actually gave a score.
      succeeded: hasScore,
      dangerous_phrases: asStringList(parsed['dangerous_phrases'] ?? parsed['dangerousPhrases']),
      advice: typeof parsed['advice'] === 'string' ? removeContactDetails(parsed['advice']) : '',
      verification_summary:
        typeof parsed['verification_summary'] === 'string'
          ? parsed['verification_summary']
          : typeof parsed['verificationSummary'] === 'string'
            ? parsed['verificationSummary']
            : '',
    };
  } catch (error) {
    logLayerError({
      job_id: jobId,
      layer_name: 'llm',
      error_message: error instanceof Error ? error.message : String(error),
      stack_trace: error instanceof Error ? error.stack : undefined,
    });

    return { explanation: '', score: 0, enabled: true, succeeded: false };
  }
}
