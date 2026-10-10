import { MlResult, OcrResult } from '../types';
import { getConfig } from '../config/config';
import { logLayerError } from '../logger/logger';

/**
 * Client for the ML service (ml-service/, Python FastAPI), which hosts the
 * PhoBERT / DistilBERT scam classifier and PaddleOCR.
 */

export const ML_UNAVAILABLE: MlResult = {
  available: false,
  label: null,
  confidence: 0,
  scam_probability: 0,
  model: null,
  language: null,
};

export function isMlServiceConfigured(): boolean {
  return !!getConfig().mlServiceUrl;
}

async function postJson(path: string, body: unknown, timeoutMs: number): Promise<unknown> {
  const config = getConfig();
  const baseUrl = String(config.mlServiceUrl).replace(/\/+$/, '');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.mlServiceApiKey ? { 'X-API-Key': config.mlServiceApiKey } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`ML service answered ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function clamp01(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(1, Math.max(0, numeric));
}

/**
 * Ask the classifier whether the text is a scam.
 * Never throws: when the service is missing or fails, the result says so and
 * the pipeline carries on with its other layers.
 */
export async function classifyWithMl(text: string, jobId: string): Promise<MlResult> {
  const config = getConfig();
  if (!config.mlServiceUrl || !text.trim()) return ML_UNAVAILABLE;

  try {
    const data = (await postJson(
      '/classify',
      { text: text.slice(0, 4000) },
      config.mlTimeoutMs ?? 5000
    )) as Record<string, unknown>;

    const label = data['label'] === 'scam' ? 'scam' : data['label'] === 'safe' ? 'safe' : null;
    if (!label) return ML_UNAVAILABLE;

    const scamProbability = clamp01(data['scam_probability']);
    const confidence =
      data['confidence'] !== undefined
        ? clamp01(data['confidence'])
        : label === 'scam'
          ? scamProbability
          : 1 - scamProbability;

    return {
      available: true,
      label,
      confidence,
      scam_probability: scamProbability,
      model: typeof data['model'] === 'string' ? data['model'] : null,
      language: typeof data['language'] === 'string' ? data['language'] : null,
    };
  } catch (error) {
    logLayerError({
      job_id: jobId,
      layer_name: 'ml',
      error_message: error instanceof Error ? error.message : String(error),
    });
    return ML_UNAVAILABLE;
  }
}

/** Read the text of an image with PaddleOCR. Throws when the service fails. */
export async function ocrWithMlService(imageBase64: string): Promise<OcrResult> {
  const config = getConfig();
  if (!config.mlServiceUrl) {
    throw new Error('ML_SERVICE_URL is not configured');
  }

  const cleanBase64 = imageBase64.replace(/^data:image\/[\w.+-]+;base64,/, '');
  const data = (await postJson(
    '/ocr',
    { image_base64: cleanBase64 },
    Math.max(config.mlTimeoutMs ?? 5000, 15000)
  )) as Record<string, unknown>;

  const text = typeof data['text'] === 'string' ? data['text'].trim() : '';
  const rawConfidence = Number(data['confidence']);
  // The service reports confidence as 0-1.
  const confidence = Number.isFinite(rawConfidence)
    ? Math.round(Math.min(1, Math.max(0, rawConfidence)) * 100)
    : 0;

  return {
    text,
    confidence: text ? confidence : 0,
    success: text.length > 0,
    metadata: { app_source: 'PaddleOCR', participants: [], timestamp: null },
  };
}
