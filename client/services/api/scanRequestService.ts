import { apiRequest } from './apiClient';
import type {
  AnalyzeJobResponseDto,
  AnalyzeResultResponseDto,
  ApiResult,
  PaginatedResponse,
  ScanRequestsResponseDto,
} from './types';

export async function getJob(
  jobId: string,
): Promise<ApiResult<AnalyzeJobResponseDto>> {
  return apiRequest<AnalyzeJobResponseDto>(`/analyze/jobs/${jobId}`);
}

export async function getJobResult(
  jobId: string,
): Promise<ApiResult<AnalyzeResultResponseDto>> {
  return apiRequest<AnalyzeResultResponseDto>(`/analyze/jobs/${jobId}/result`);
}

export async function getJobsByScanId(
  scanId: string,
): Promise<ApiResult<AnalyzeJobResponseDto[]>> {
  return apiRequest<AnalyzeJobResponseDto[]>(`/analyze/scan/${scanId}/jobs`);
}

export async function getResultsByScanId(
  scanId: string,
): Promise<ApiResult<AnalyzeResultResponseDto[]>> {
  return apiRequest<AnalyzeResultResponseDto[]>(
    `/analyze/scan/${scanId}/results`,
  );
}

export async function getScanRequests(
  userId: string,
  limit = 50,
): Promise<ApiResult<ScanRequestsResponseDto[]>> {
  const result = await apiRequest<PaginatedResponse<ScanRequestsResponseDto>>(
    `/scan_requests?user_id=${encodeURIComponent(userId)}&limit=${limit}`,
  );

  if (!result.ok) {
    return result;
  }

  return { ok: true, data: result.data.data };
}

export async function getResultsForScanRequests(
  scanIds: string[],
): Promise<ApiResult<Record<string, AnalyzeResultResponseDto | null>>> {
  const entries = await Promise.all(
    scanIds.map(async (scanId) => {
      const result = await getResultsByScanId(scanId);

      if (!result.ok) {
        if (result.error.type === 'not_found') {
          return { ok: true as const, scanId, value: null };
        }

        return { ok: false as const, error: result.error };
      }

      return {
        ok: true as const,
        scanId,
        value: result.data[0] ?? null,
      };
    }),
  );

  const failedEntry = entries.find((entry) => !entry.ok);

  if (failedEntry && !failedEntry.ok) {
    return { ok: false, error: failedEntry.error };
  }

  return {
    ok: true,
    data: Object.fromEntries(
      entries
        .filter(
          (entry): entry is Extract<typeof entries[number], { ok: true }> =>
            entry.ok,
        )
        .map((entry) => [entry.scanId, entry.value]),
    ),
  };
}
