import { z } from 'zod';
import { DEFAULT_GEMINI_MODEL } from './ai-endpoints';

// z.coerce.boolean() turns any non-empty string into true, so LLM_ENABLED=false
// in a .env file would switch the LLM on. Parse the usual spellings instead.
const envBoolean = (defaultValue: boolean) =>
  z.preprocess(value => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'boolean') return value;
    const text = String(value).trim().toLowerCase();
    if (text === '') return undefined;
    if (['true', '1', 'yes', 'on'].includes(text)) return true;
    if (['false', '0', 'no', 'off'].includes(text)) return false;
    return value;
  }, z.boolean().default(defaultValue));

const configSchema = z.object({
  port: z.coerce.number().int().min(1).max(65535).default(3001),
  apiKey: z.string().min(1, 'PIPELINE_API_KEY is required'),
  allowedIps: z.string().default('127.0.0.1,::1,::ffff:127.0.0.1'),
  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // Qdrant
  qdrantUrl: z.string().url().default('http://localhost:6333'),
  qdrantCollection: z.string().default('phishing_emails'),
  qdrantApiKey: z.string().optional(),

  // OpenAI
  openaiApiKey: z.string().optional(),
  openaiEmbeddingModel: z.string().default('text-embedding-3-small'),

  // Embeddings (default: OpenAI, using OPENAI_API_KEY)
  embeddingApiKey: z.string().optional(),
  embeddingBaseUrl: z.string().url().optional(),
  embeddingDimensions: z.coerce.number().int().positive().default(1536),

  // LLM
  llmEnabled: envBoolean(false),
  // openai: OpenAI API. gemini: Google Gemini through its OpenAI-compatible
  // endpoint. custom: any OpenAI-compatible endpoint given in LLM_BASE_URL.
  llmProvider: z.enum(['openai', 'gemini', 'custom']).default('openai'),
  llmApiKey: z.string().optional(),
  llmBaseUrl: z.string().url().optional(),
  llmModel: z.string().default('gpt-4o-mini'),
  llmVisionModel: z.string().optional(),
  llmReasoningEffort: z.enum(['off', 'low', 'medium', 'high']).optional(),
  llmTimeoutMs: z.coerce.number().int().positive().default(15000),
  // gray_zone: ask the LLM only when the other layers are undecided (score in
  // [15, 75)). always: ask it for every content that takes the deep path.
  llmMode: z.enum(['gray_zone', 'always']).default('gray_zone'),

  // ML service (PhoBERT / DistilBERT classifier, PaddleOCR)
  mlServiceUrl: z.string().url().optional(),
  mlServiceApiKey: z.string().optional(),
  mlConfidenceThreshold: z.coerce.number().min(0.5).max(1).default(0.9),
  mlTimeoutMs: z.coerce.number().int().positive().default(5000),

  // Pipeline
  pipelineTimeoutMs: z.coerce.number().int().positive().default(30000),
  ragSimilarityThreshold: z.coerce.number().min(0).max(1).default(0.75),
  ragTopK: z.coerce.number().int().min(1).max(10).default(5),
  // How many candidates to fetch from the vector DB before reranking down to ragTopK.
  ragCandidateK: z.coerce.number().int().min(1).max(100).default(20),
  rerankEnabled: envBoolean(true),

  // OCR. The language files for Vietnamese and English ship with the
  // pipeline (vie.traineddata, eng.traineddata), so no download is needed.
  tesseractLangs: z.string().default('vie+eng'),

  // Redis (queue + shared cache). Without it everything runs in-process.
  redisUrl: z.string().optional(),
  queueConcurrency: z.coerce.number().int().min(1).max(64).default(4),
  // Key prefix of the queues in Redis. Give each environment its own prefix
  // when several of them share one Redis, or they will take each other's jobs.
  queuePrefix: z.string().regex(/^[A-Za-z0-9_-]+$/).default('bull'),

  // Cache
  cacheEnabled: envBoolean(true),
  cacheTtlMs: z.coerce.number().int().positive().default(300000),
  cacheMaxSize: z.coerce.number().int().positive().default(1000),

  // Standalone web server: this process also serves the web app and its
  // backend (/functions/v1/*), with no Supabase project. Off by default,
  // because those addresses answer without the API key.
  webEnabled: envBoolean(false),
  // Folder with the built web app (npm run build:standalone in the repo root).
  webDistDir: z.string().optional(),
  adminPassword: z.string().optional(),
  // PostgreSQL connection string. Without it the data goes to files in dataDir.
  databaseUrl: z.string().optional(),
  databaseSsl: z.enum(['auto', 'require', 'verify', 'disable']).default('auto'),
  dataDir: z.string().default('./var'),
  storeImages: envBoolean(true),
  // Number of proxies in front of this server; decides which address the
  // rate limit counts. 0 = reached directly.
  trustedProxyHops: z.coerce.number().int().min(0).max(10).default(0),
  rateLimitPerIp: z.coerce.number().int().min(1).default(20),
  rateLimitWindowMs: z.coerce.number().int().positive().default(300000),
  rateLimitGlobalPerMinute: z.coerce.number().int().min(0).default(60),

  // Accounts, daily limits and paid plans (web mode only).
  accountsEnabled: envBoolean(true),
  // Daily analyses of all visitors without an account behind one address.
  guestDailyLimitPerIp: z.coerce.number().int().min(1).default(20),
  // manual: an admin confirms each bank transfer. demo: buyers can mark
  // their own order paid (presentations only, never with real money).
  paymentMode: z.enum(['manual', 'demo']).default('manual'),
  paymentBankName: z.string().optional(),
  paymentAccountNumber: z.string().optional(),
  paymentAccountName: z.string().optional(),
});

export type Config = z.infer<typeof configSchema>;

/** A variable left blank in .env arrives as an empty string; treat it as unset. */
function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return value.trim() === '' ? undefined : value;
}

function loadConfig(): Config {
  const llmProvider = emptyToUndefined(process.env['LLM_PROVIDER']);

  const raw = {
    // PORT is what hosting platforms set.
    port: emptyToUndefined(process.env['PIPELINE_PORT']) ?? emptyToUndefined(process.env['PORT']),
    apiKey: process.env['PIPELINE_API_KEY'] ?? '',
    allowedIps: process.env['PIPELINE_ALLOWED_IPS'],
    logLevel: process.env['LOG_LEVEL'],
    qdrantUrl: emptyToUndefined(process.env['QDRANT_URL']),
    qdrantCollection: emptyToUndefined(process.env['QDRANT_COLLECTION']),
    qdrantApiKey: emptyToUndefined(process.env['QDRANT_API_KEY']),
    openaiApiKey: emptyToUndefined(process.env['OPENAI_API_KEY']),
    openaiEmbeddingModel:
      emptyToUndefined(process.env['EMBEDDING_MODEL']) ??
      emptyToUndefined(process.env['OPENAI_EMBEDDING_MODEL']),
    embeddingApiKey: emptyToUndefined(process.env['EMBEDDING_API_KEY']),
    embeddingBaseUrl: emptyToUndefined(process.env['EMBEDDING_BASE_URL']),
    embeddingDimensions: emptyToUndefined(process.env['EMBEDDING_DIMENSIONS']),
    llmEnabled: process.env['LLM_ENABLED'],
    llmProvider: llmProvider,
    llmApiKey:
      emptyToUndefined(process.env['LLM_API_KEY']) ??
      (llmProvider === 'gemini' ? emptyToUndefined(process.env['GEMINI_API_KEY']) : undefined),
    llmBaseUrl: emptyToUndefined(process.env['LLM_BASE_URL']),
    llmModel:
      emptyToUndefined(process.env['LLM_MODEL']) ??
      (llmProvider === 'gemini' ? DEFAULT_GEMINI_MODEL : undefined),
    llmVisionModel: emptyToUndefined(process.env['LLM_VISION_MODEL']),
    llmReasoningEffort: emptyToUndefined(process.env['LLM_REASONING_EFFORT']),
    llmTimeoutMs: process.env['LLM_TIMEOUT_MS'],
    llmMode: emptyToUndefined(process.env['LLM_MODE']),
    mlServiceUrl: emptyToUndefined(process.env['ML_SERVICE_URL']),
    mlServiceApiKey: emptyToUndefined(process.env['ML_SERVICE_API_KEY']),
    mlConfidenceThreshold: emptyToUndefined(process.env['ML_CONFIDENCE_THRESHOLD']),
    mlTimeoutMs: emptyToUndefined(process.env['ML_TIMEOUT_MS']),
    pipelineTimeoutMs: process.env['PIPELINE_TIMEOUT_MS'],
    ragSimilarityThreshold: process.env['RAG_SIMILARITY_THRESHOLD'],
    ragTopK: process.env['RAG_TOP_K'],
    ragCandidateK: emptyToUndefined(process.env['RAG_CANDIDATE_K']),
    rerankEnabled: process.env['RERANK_ENABLED'],
    tesseractLangs: emptyToUndefined(process.env['TESSERACT_LANGS']),
    redisUrl: emptyToUndefined(process.env['REDIS_URL']),
    queueConcurrency: emptyToUndefined(process.env['QUEUE_CONCURRENCY']),
    queuePrefix: emptyToUndefined(process.env['QUEUE_PREFIX']),
    cacheEnabled: process.env['CACHE_ENABLED'],
    cacheTtlMs: process.env['CACHE_TTL_MS'],
    cacheMaxSize: process.env['CACHE_MAX_SIZE'],
    webEnabled: process.env['WEB_ENABLED'],
    webDistDir: emptyToUndefined(process.env['WEB_DIST_DIR']),
    adminPassword: emptyToUndefined(process.env['ADMIN_PASSWORD']),
    databaseUrl: emptyToUndefined(process.env['DATABASE_URL']),
    databaseSsl: emptyToUndefined(process.env['DATABASE_SSL']),
    dataDir: emptyToUndefined(process.env['DATA_DIR']),
    storeImages: process.env['STORE_IMAGES'],
    trustedProxyHops: emptyToUndefined(process.env['TRUSTED_PROXY_HOPS']),
    rateLimitPerIp: emptyToUndefined(process.env['RATE_LIMIT_PER_IP']),
    rateLimitWindowMs: emptyToUndefined(process.env['RATE_LIMIT_WINDOW_MS']),
    rateLimitGlobalPerMinute: emptyToUndefined(process.env['RATE_LIMIT_GLOBAL_PER_MINUTE']),
    accountsEnabled: process.env['ACCOUNTS_ENABLED'],
    guestDailyLimitPerIp: emptyToUndefined(process.env['GUEST_DAILY_LIMIT_PER_IP']),
    paymentMode: emptyToUndefined(process.env['PAYMENT_MODE']),
    paymentBankName: emptyToUndefined(process.env['PAYMENT_BANK_NAME']),
    paymentAccountNumber: emptyToUndefined(process.env['PAYMENT_ACCOUNT_NUMBER']),
    paymentAccountName: emptyToUndefined(process.env['PAYMENT_ACCOUNT_NAME']),
  };

  const result = configSchema.safeParse(raw);

  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Configuration validation failed: ${errors}`);
  }

  return result.data;
}

// Singleton config instance
let _config: Config | null = null;

export function getConfig(): Config {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}

// For testing — reset config singleton
export function resetConfig(): void {
  _config = null;
}

export function getAllowedIpList(config: Config): string[] {
  const ips = config.allowedIps
    .split(',')
    .map(ip => ip.trim())
    .filter(ip => ip.length > 0);

  // "*" means any address may call (the API key is still required).
  return ips.includes('*') ? [] : ips;
}
