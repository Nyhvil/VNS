import { z } from 'zod';

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

  // LLM
  llmEnabled: z.coerce.boolean().default(false),
  llmModel: z.string().default('gpt-4o-mini'),
  llmTimeoutMs: z.coerce.number().int().positive().default(10000),

  // Pipeline
  pipelineTimeoutMs: z.coerce.number().int().positive().default(30000),
  ragSimilarityThreshold: z.coerce.number().min(0).max(1).default(0.75),
  ragTopK: z.coerce.number().int().min(1).max(10).default(5),

  // Cache
  cacheEnabled: z.coerce.boolean().default(true),
  cacheTtlMs: z.coerce.number().int().positive().default(300000),
  cacheMaxSize: z.coerce.number().int().positive().default(1000),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const raw = {
    port: process.env['PIPELINE_PORT'],
    apiKey: process.env['PIPELINE_API_KEY'] ?? '',
    allowedIps: process.env['PIPELINE_ALLOWED_IPS'],
    logLevel: process.env['LOG_LEVEL'],
    qdrantUrl: process.env['QDRANT_URL'],
    qdrantCollection: process.env['QDRANT_COLLECTION'],
    qdrantApiKey: process.env['QDRANT_API_KEY'],
    openaiApiKey: process.env['OPENAI_API_KEY'],
    openaiEmbeddingModel: process.env['OPENAI_EMBEDDING_MODEL'],
    llmEnabled: process.env['LLM_ENABLED'],
    llmModel: process.env['LLM_MODEL'],
    llmTimeoutMs: process.env['LLM_TIMEOUT_MS'],
    pipelineTimeoutMs: process.env['PIPELINE_TIMEOUT_MS'],
    ragSimilarityThreshold: process.env['RAG_SIMILARITY_THRESHOLD'],
    ragTopK: process.env['RAG_TOP_K'],
    cacheEnabled: process.env['CACHE_ENABLED'],
    cacheTtlMs: process.env['CACHE_TTL_MS'],
    cacheMaxSize: process.env['CACHE_MAX_SIZE'],
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
  return config.allowedIps
    .split(',')
    .map(ip => ip.trim())
    .filter(ip => ip.length > 0);
}
