'use client';

import { useEffect, useState } from 'react';

import AnalyzeResultActionsPanel from '@/components/pages/analyze_result_detail/AnalyzeResultActionsPanel';
import AnalyzeResultEvidencePanel from '@/components/pages/analyze_result_detail/AnalyzeResultEvidencePanel';
import AnalyzeResultFindingCards from '@/components/pages/analyze_result_detail/AnalyzeResultFindingCards';
import AnalyzeResultHero from '@/components/pages/analyze_result_detail/AnalyzeResultHero';
import AnalyzeResultRiskCard from '@/components/pages/analyze_result_detail/AnalyzeResultRiskCard';
import AppLoadingScreen from '@/components/system/AppLoadingScreen';
import type { MockAnalyzeResultSuccess } from '@/types/analyzeResult';
import {
  getJob,
  getJobResult,
  getJobsByScanId,
  getResultsByScanId,
} from '@/services/api/scanRequestService';
import { mapAnalyzeResultToUI } from '@/services/mappers/resultMapper';

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 120_000;

type AnalyzeResultDetailPageProps = {
  analyzeResultId: string;
};

type ResolveResultState =
  | { status: 'resolved'; result: MockAnalyzeResultSuccess }
  | { status: 'poll'; jobId: string }
  | { status: 'error'; message: string };

export default function AnalyzeResultDetailPage({
  analyzeResultId,
}: AnalyzeResultDetailPageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<MockAnalyzeResultSuccess | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadAnalyzeResult() {
      setIsLoading(true);
      setErrorMessage(null);
      setResult(null);

      const resolvedState = await resolveResultState(analyzeResultId);

      if (!isMounted) {
        return;
      }

      if (resolvedState.status === 'resolved') {
        setResult(resolvedState.result);
        setIsLoading(false);
        return;
      }

      if (resolvedState.status === 'error') {
        setErrorMessage(resolvedState.message);
        setIsLoading(false);
        return;
      }

      const pollResult = await pollUntilResolved(
        resolvedState.jobId,
        () => isMounted,
      );

      if (!isMounted) {
        return;
      }

      if (pollResult.ok) {
        setResult(pollResult.result);
        setIsLoading(false);
        return;
      }

      setErrorMessage(pollResult.message);
      setIsLoading(false);
    }

    void loadAnalyzeResult();

    return () => {
      isMounted = false;
    };
  }, [analyzeResultId, retryNonce]);

  return (
    <>
      <section className="space-y-6">
        {errorMessage ? (
          <section className="mg-panel-enter overflow-hidden rounded-[30px] border border-[#ffd7d2] bg-[linear-gradient(180deg,#fff8f7_0%,#ffffff_100%)] px-7 py-7 shadow-[0_18px_42px_rgba(15,23,42,0.05)] sm:px-8 sm:py-8">
            <span className="inline-flex rounded-full bg-[#ffe4e0] px-3 py-1 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#b42318]">
              Result unavailable
            </span>
            <h1 className="mt-4 text-[2rem] font-semibold tracking-[-0.05em] text-[#171717] sm:text-[2.35rem]">
              Không thể tải chi tiết kết quả
            </h1>
            <p className="mt-4 max-w-2xl text-[1.02rem] leading-8 text-[#5f5f5f]">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => setRetryNonce((value) => value + 1)}
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full border border-[#e7c1bb] bg-white px-5 text-[0.95rem] font-semibold text-[#8f3d32] transition hover:bg-[#fff4f2]"
            >
              Thử lại
            </button>
          </section>
        ) : null}

        {result ? (
          <>
            <AnalyzeResultHero
              requestId={result.requestId}
              analyzedAt={result.analyzedAt}
              confidence={result.confidence}
              title={result.title}
              source={result.source}
              sourceIcon={result.sourceIcon}
            />

            <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
              <div className="space-y-6">
                <AnalyzeResultRiskCard
                  riskScore={result.riskScore}
                  riskTone={result.riskTone}
                  severityLabel={result.severityLabel}
                  summary={result.summary}
                />
                <AnalyzeResultActionsPanel actions={result.actions} />
              </div>

              <div className="space-y-6">
                <AnalyzeResultFindingCards findings={result.findings} />
                <AnalyzeResultEvidencePanel evidence={result.evidence} />
              </div>
            </div>
          </>
        ) : null}
      </section>

      {isLoading ? <AppLoadingScreen overlay /> : null}
    </>
  );
}

async function resolveResultState(id: string): Promise<ResolveResultState> {
  if (id.startsWith('job-')) {
    const resultResponse = await getJobResult(id);

    if (resultResponse.ok) {
      return {
        status: 'resolved',
        result: mapAnalyzeResultToUI(resultResponse.data, id),
      };
    }

    if (resultResponse.error.type !== 'not_found') {
      return { status: 'error', message: resultResponse.error.message };
    }

    return resolveJobState(id);
  }

  const resultsResponse = await getResultsByScanId(id);

  if (!resultsResponse.ok) {
    return { status: 'error', message: resultsResponse.error.message };
  }

  const latestResult = resultsResponse.data[0];

  if (latestResult) {
    return {
      status: 'resolved',
      result: mapAnalyzeResultToUI(latestResult, latestResult.job_id),
    };
  }

  const jobsResponse = await getJobsByScanId(id);

  if (!jobsResponse.ok) {
    return { status: 'error', message: jobsResponse.error.message };
  }

  const latestJob = jobsResponse.data[0];

  if (!latestJob) {
    return {
      status: 'error',
      message: 'Chưa tìm thấy job phân tích cho bản ghi này.',
    };
  }

  return resolveJobState(latestJob.id);
}

async function resolveJobState(jobId: string): Promise<ResolveResultState> {
  const jobResponse = await getJob(jobId);

  if (!jobResponse.ok) {
    return { status: 'error', message: jobResponse.error.message };
  }

  const job = jobResponse.data;

  if (job.status === 'failed') {
    return {
      status: 'error',
      message: job.error_message ?? 'Phân tích thất bại. Vui lòng thử lại.',
    };
  }

  if (job.status === 'pending' || job.status === 'processing') {
    return { status: 'poll', jobId };
  }

  const resultResponse = await getJobResult(jobId);

  if (!resultResponse.ok) {
    return { status: 'error', message: resultResponse.error.message };
  }

  return {
    status: 'resolved',
    result: mapAnalyzeResultToUI(resultResponse.data, jobId),
  };
}

async function pollUntilResolved(
  jobId: string,
  isMounted: () => boolean,
): Promise<
  | { ok: true; result: MockAnalyzeResultSuccess }
  | { ok: false; message: string }
> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    if (!isMounted()) {
      return { ok: false, message: 'Đã hủy tải kết quả.' };
    }

    const jobResponse = await getJob(jobId);

    if (!jobResponse.ok) {
      return { ok: false, message: jobResponse.error.message };
    }

    const job = jobResponse.data;

    if (job.status === 'failed') {
      return {
        ok: false,
        message: job.error_message ?? 'Phân tích thất bại. Vui lòng thử lại.',
      };
    }

    if (job.status === 'success') {
      const resultResponse = await getJobResult(jobId);

      if (resultResponse.ok) {
        return {
          ok: true,
          result: mapAnalyzeResultToUI(resultResponse.data, jobId),
        };
      }

      if (resultResponse.error.type !== 'not_found') {
        return { ok: false, message: resultResponse.error.message };
      }
    }

    await sleep(POLL_INTERVAL_MS);
  }

  return {
    ok: false,
    message: 'Phân tích mất quá nhiều thời gian. Vui lòng thử lại.',
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
