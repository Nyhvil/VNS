/**
 * Where requests to the AI providers go.
 *
 * Kept apart from config.ts so it has no dependencies: these helpers only read
 * the config object they are given.
 */

/** Gemini Flash model used when LLM_PROVIDER=gemini and LLM_MODEL is not set. */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
export const GEMINI_OPENAI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';

// ============================================================
// Resolved settings for the AI providers
// ============================================================

export interface AiEndpoint {
  apiKey: string | undefined;
  baseURL: string | undefined;
  model: string;
}

export interface LlmConfig {
  openaiApiKey?: string;
  llmProvider?: 'openai' | 'gemini' | 'custom';
  llmApiKey?: string;
  llmBaseUrl?: string;
  llmModel?: string;
  llmVisionModel?: string;
}

/** Where chat-completion requests go: OpenAI, Gemini, or a custom endpoint. */
export function getLlmEndpoint(config: LlmConfig): AiEndpoint {
  const provider = config.llmProvider ?? 'openai';
  const baseURL =
    config.llmBaseUrl ?? (provider === 'gemini' ? GEMINI_OPENAI_BASE_URL : undefined);
  const apiKey = config.llmApiKey ?? (provider === 'openai' ? config.openaiApiKey : undefined);

  return { apiKey, baseURL, model: config.llmModel ?? 'gpt-4o-mini' };
}

/** Same endpoint as the LLM, with the model used for reading images. */
export function getVisionEndpoint(config: LlmConfig): AiEndpoint {
  const endpoint = getLlmEndpoint(config);
  return { ...endpoint, model: config.llmVisionModel ?? endpoint.model };
}

export interface EmbeddingConfig {
  openaiApiKey?: string;
  embeddingApiKey?: string;
  embeddingBaseUrl?: string;
  openaiEmbeddingModel?: string;
}

/** Where embedding requests go. Defaults to OpenAI with OPENAI_API_KEY. */
export function getEmbeddingEndpoint(config: EmbeddingConfig): AiEndpoint {
  return {
    apiKey: config.embeddingApiKey ?? config.openaiApiKey,
    baseURL: config.embeddingBaseUrl,
    model: config.openaiEmbeddingModel ?? 'text-embedding-3-small',
  };
}
