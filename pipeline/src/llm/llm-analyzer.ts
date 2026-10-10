import { ParsedContent, LlmResult, FeatureSet } from '../types';
import { isParsedEmail } from '../types';
import { sanitizePii } from './pii-sanitizer';
import { getConfig } from '../config/config';
import { logLayerError } from '../logger/logger';

const DISABLED_RESULT: LlmResult = {
  explanation: '',
  score: 0,
  enabled: false,
};

function buildPrompt(content: ParsedContent, features: FeatureSet): string {
  const body = isParsedEmail(content) ? content.body : content.body;
  const sanitizedBody = sanitizePii(body);

  const featureSummary = [
    features.spf_result ? `SPF: ${features.spf_result}` : null,
    features.dkim_result ? `DKIM: ${features.dkim_result}` : null,
    features.domain_mismatch ? 'Domain mismatch detected' : null,
    features.suspicious_keywords.length > 0
      ? `Suspicious keywords: ${features.suspicious_keywords.slice(0, 5).join(', ')}`
      : null,
    features.urls.some(u => u.is_ip_based) ? 'IP-based URLs detected' : null,
    features.urls.some(u => u.is_shortener) ? 'URL shorteners detected' : null,
  ]
    .filter(Boolean)
    .join('; ');

  return `Analyze the following email/text content for phishing indicators. Provide a brief explanation of any threats found and a risk score from 0-100.

Content:
${sanitizedBody.slice(0, 2000)}

Detected features: ${featureSummary || 'none'}

Respond in JSON format: {"explanation": "...", "score": 0-100}`;
}

export async function analyzeWithLlm(
  content: ParsedContent,
  features: FeatureSet,
  jobId: string
): Promise<LlmResult> {
  const config = getConfig();

  if (!config.llmEnabled) {
    return DISABLED_RESULT;
  }

  if (!config.openaiApiKey) {
    return DISABLED_RESULT;
  }

  try {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: config.openaiApiKey });

    const prompt = buildPrompt(content, features);

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('LLM timeout')), config.llmTimeoutMs)
    );

    const llmPromise = client.chat.completions.create({
      model: config.llmModel,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 500,
    });

    const response = await Promise.race([llmPromise, timeoutPromise]);
    const rawContent = response.choices[0]?.message?.content ?? '{}';

    let parsed: { explanation?: string; score?: number };
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      parsed = {};
    }

    const explanation = typeof parsed.explanation === 'string' ? parsed.explanation : '';
    const score = typeof parsed.score === 'number'
      ? Math.min(100, Math.max(0, Math.round(parsed.score)))
      : 0;

    return { explanation, score, enabled: true };
  } catch (error) {
    logLayerError({
      job_id: jobId,
      layer_name: 'llm',
      error_message: error instanceof Error ? error.message : String(error),
      stack_trace: error instanceof Error ? error.stack : undefined,
    });

    return { explanation: '', score: 0, enabled: true };
  }
}
