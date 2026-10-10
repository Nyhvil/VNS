import pino from 'pino';
import { getConfig } from '../config/config';

// Redact sensitive fields from logs
const REDACTED_PATHS = [
  'content',
  'req.body.content',
  'body.content',
  '*.content',
];

function createLogger() {
  let level = 'info';
  try {
    const config = getConfig();
    level = config.logLevel;
  } catch {
    // Config not yet loaded (e.g., during startup), use default
  }

  return pino({
    level,
    redact: {
      paths: REDACTED_PATHS,
      censor: '[REDACTED]',
    },
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

export const logger = createLogger();

export type Logger = typeof logger;

// Structured log helpers
export function logAnalysisReceived(params: {
  job_id: string;
  input_type: string;
  request_size_bytes: number;
}) {
  logger.info({ event: 'analysis.received', ...params });
}

export function logAnalysisCompleted(params: {
  job_id: string;
  risk_score: number;
  risk_level: string;
  category: string;
  duration_ms: number;
  layers_used: string[];
}) {
  logger.info({ event: 'analysis.completed', ...params });
}

export function logLayerError(params: {
  job_id: string;
  layer_name: string;
  error_message: string;
  stack_trace?: string;
}) {
  logger.error({ event: 'analysis.layer_error', ...params });
}
