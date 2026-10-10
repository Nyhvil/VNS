import { apiRequest } from './apiClient';
import type {
  AnalyzeFullResponseDto,
  AnalyzeResultResponseDto,
  ScanRequestsResponseDto,
} from './types';

export type AnalyzeInputType = 'text' | 'image' | 'both';

export type AnalyzeInput = {
  type: AnalyzeInputType;
  content: string;
  scanId: string;
};

export type AnalyzeServiceResult =
  | { ok: true; jobId: string; hasResult: boolean }
  | { ok: false; message: string };

function mapInputType(type: AnalyzeInputType): string {
  switch (type) {
    case 'image':
      return 'image';
    case 'both':
      return 'plain_text';
    case 'text':
    default:
      return 'plain_text';
  }
}

export async function createScanRequest(
  userId: string | null,
  inputType: string,
  content: string,
): Promise<string | null> {
  const body: Record<string, unknown> = {
    input_type:
      inputType === 'plain_text' ? 'text' : inputType === 'image' ? 'image' : 'eml',
    original_text: inputType !== 'image' ? content.slice(0, 500) : null,
  };

  if (userId) {
    body['user_id'] = userId;
  }

  const result = await apiRequest<ScanRequestsResponseDto>('/scan_requests', {
    method: 'POST',
    body,
  });

  if (!result.ok) return null;
  return result.data.id;
}

export async function submitAnalysis(
  input: AnalyzeInput,
): Promise<AnalyzeServiceResult> {
  const serverInputType = mapInputType(input.type);

  const result = await apiRequest<AnalyzeFullResponseDto>('/analyze', {
    method: 'POST',
    body: {
      scan_id: input.scanId,
      input_type: serverInputType,
      content: input.content,
    },
  });

  if (!result.ok) {
    return { ok: false, message: result.error.message };
  }

  return {
    ok: true,
    jobId: result.data.job.id,
    hasResult: result.data.result !== null,
  };
}

export async function pollJobResult(
  jobId: string,
  timeoutMs = 120_000,
): Promise<AnalyzeResultResponseDto | null> {
  const startTime = Date.now();
  const pollIntervalMs = 3_000;

  while (Date.now() - startTime < timeoutMs) {
    const result = await apiRequest<AnalyzeResultResponseDto>(
      `/analyze/jobs/${jobId}/result`,
    );

    if (result.ok) return result.data;

    if (result.error.type === 'not_found') {
      await sleep(pollIntervalMs);
      continue;
    }

    return null;
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
