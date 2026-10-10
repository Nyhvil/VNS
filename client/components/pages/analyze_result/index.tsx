'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import AnalyzeResultList from '@/components/pages/analyze_result/AnalyzeResultList';
import { analyzeResultListContent } from '@/components/pages/analyze_result/content';
import AppLoadingScreen from '@/components/system/AppLoadingScreen';
import type { MockAnalyzeResultListSuccess } from '@/types/analyzeResult';
import {
  getResultsForScanRequests,
  getScanRequests,
} from '@/services/api/scanRequestService';
import {
  computeListTotals,
  mapScanRequestToListItem,
} from '@/services/mappers/resultMapper';
import { useAuthState } from '@/store/authStore';

export default function AnalyzeResultListPage() {
  const { user, isLoading: isAuthLoading } = useAuthState();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<MockAnalyzeResultListSuccess | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function fetchResults() {
      if (isAuthLoading) {
        return;
      }

      if (!user?.id) {
        if (isMounted) {
          setData(buildListData([]));
          setErrorMessage('Không tìm thấy người dùng để tải lịch sử phân tích.');
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      const scanRequestsResult = await getScanRequests(user.id, 50);

      if (!isMounted) {
        return;
      }

      if (!scanRequestsResult.ok) {
        setErrorMessage(scanRequestsResult.error.message);
        setIsLoading(false);
        return;
      }

      const scanRequests = scanRequestsResult.data;

      if (scanRequests.length === 0) {
        setData(buildListData([]));
        setIsLoading(false);
        return;
      }

      const resultsResult = await getResultsForScanRequests(
        scanRequests.map((scanRequest) => scanRequest.id),
      );

      if (!isMounted) {
        return;
      }

      if (!resultsResult.ok) {
        setErrorMessage(resultsResult.error.message);
        setIsLoading(false);
        return;
      }

      const items = scanRequests.map((scanRequest) =>
        mapScanRequestToListItem(
          scanRequest,
          resultsResult.data[scanRequest.id] ?? null,
        ),
      );

      setData(buildListData(items));
      setIsLoading(false);
    }

    void fetchResults();

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, retryNonce, user?.id]);

  const shouldShowLoading = isAuthLoading || isLoading;

  return (
    <>
      <section className="space-y-6">
        {errorMessage ? (
          <section className="mg-panel-enter overflow-hidden rounded-[30px] border border-[#ffd7d2] bg-[linear-gradient(180deg,#fff8f7_0%,#ffffff_100%)] px-7 py-7 shadow-[0_18px_42px_rgba(15,23,42,0.05)] sm:px-8 sm:py-8">
            <span className="inline-flex rounded-full bg-[#ffe4e0] px-3 py-1 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#b42318]">
              Unable to load
            </span>
            <h1 className="mt-4 text-[2rem] font-semibold tracking-[-0.05em] text-[#171717] sm:text-[2.35rem]">
              Không thể tải danh sách kết quả
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

        {data ? (
          <>
            <section className="mg-panel-enter relative overflow-hidden rounded-[34px] border border-white/[0.75] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(250,252,255,0.92)_100%)] px-6 py-6 shadow-[0_20px_46px_rgba(15,23,42,0.08)] backdrop-blur sm:px-7 sm:py-7">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,203,17,0.18),transparent_18%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.08),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.38))]" />
              <div className="pointer-events-none absolute -right-10 top-4 h-30 w-30 rounded-full bg-[rgba(255,203,17,0.12)] blur-3xl" />

              <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_340px] xl:items-end">
                <div className="max-w-3xl">
                  <span className="inline-flex rounded-full bg-[#eef4ff] px-3 py-1 text-[0.74rem] font-semibold uppercase tracking-[0.2em] text-[#36507b]">
                    {analyzeResultListContent.eyebrow}
                  </span>
                  <h1 className="mt-4 text-[2.15rem] font-semibold leading-[1.02] tracking-[-0.06em] text-[#101418] sm:text-[3rem]">
                    {analyzeResultListContent.title}
                  </h1>
                  <p className="mt-3 max-w-2xl text-[1rem] leading-7 text-[#536071] sm:text-[1.04rem]">
                    {analyzeResultListContent.description}
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {analyzeResultListContent.stats.map((stat) => (
                      <article
                        key={stat.key}
                        className="rounded-[22px] border border-[#e8edf3] bg-white/80 px-4 py-4 shadow-[0_10px_22px_rgba(15,23,42,0.04)]"
                      >
                        <p className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#7b8690]">
                          {stat.label}
                        </p>
                        <p className="mt-3 text-[1.8rem] font-semibold tracking-[-0.05em] text-[#111827]">
                          {data.totals[stat.key]}
                        </p>
                        <p className="mt-2 text-[0.92rem] leading-6 text-[#64748b]">
                          {stat.helper}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>

                <aside className="rounded-[28px] border border-[#e7edf5] bg-white/84 p-5 shadow-[0_14px_32px_rgba(15,23,42,0.05)] backdrop-blur">
                  <p className="text-[0.76rem] font-semibold uppercase tracking-[0.2em] text-[#6f7b8c]">
                    Snapshot
                  </p>
                  <div className="mt-4">
                    <p className="text-[0.98rem] text-[#5b6776]">Bản ghi cần xem trước</p>
                    <div className="mt-2 flex items-end gap-2">
                      <span className="text-[3rem] font-semibold leading-none tracking-[-0.08em] text-[#101418]">
                        {data.totals.danger}
                      </span>
                      <span className="pb-1 text-[0.96rem] text-[#6f7b8c]">nguy hiểm cao</span>
                    </div>
                    <p className="mt-3 text-[0.94rem] leading-6 text-[#5b6776]">
                      Tập trung mở các bản ghi có cảnh báo đỏ trước để xử lý các email có rủi ro cao.
                    </p>
                  </div>

                  <div className="mt-5 space-y-3">
                    <SummaryRow label="Tổng số phân tích" value={String(data.totals.total)} />
                    <SummaryRow label="Cần xác minh thêm" value={String(data.totals.warning)} />
                    <SummaryRow label="Đã xác định an toàn" value={String(data.totals.safe)} />
                  </div>

                  <Link
                    href="/dashboard"
                    className="mg-card-hover mt-5 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-[18px] border border-[#e5eaf1] bg-white px-5 text-[0.98rem] font-semibold text-[#1f2937] shadow-[0_12px_24px_rgba(15,23,42,0.05)]"
                  >
                    Dashboard
                  </Link>
                </aside>
              </div>
            </section>

            {data.items.length > 0 ? (
              <AnalyzeResultList items={data.items} />
            ) : (
              <section className="mg-panel-enter overflow-hidden rounded-[30px] border border-[#e4ebf3] bg-white/[0.92] px-7 py-7 shadow-[0_18px_42px_rgba(15,23,42,0.05)] sm:px-8 sm:py-8">
                <span className="inline-flex rounded-full bg-[#eef4ff] px-3 py-1 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#36507b]">
                  Empty archive
                </span>
                <h2 className="mt-4 text-[1.9rem] font-semibold tracking-[-0.05em] text-[#171717]">
                  Chưa có kết quả phân tích nào
                </h2>
                <p className="mt-4 max-w-2xl text-[1rem] leading-8 text-[#5f5f5f]">
                  Khi bạn thực hiện lần quét đầu tiên, lịch sử phân tích sẽ xuất hiện ở đây để bạn theo dõi lại.
                </p>
                <Link
                  href="/dashboard"
                  className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[#ffcb11] px-5 text-[0.95rem] font-semibold text-[#6b5300] shadow-[0_16px_26px_rgba(255,203,17,0.24)]"
                >
                  Đi tới dashboard
                </Link>
              </section>
            )}
          </>
        ) : null}
      </section>

      {shouldShowLoading ? <AppLoadingScreen overlay /> : null}
    </>
  );
}

function buildListData(
  items: MockAnalyzeResultListSuccess['items'],
): MockAnalyzeResultListSuccess {
  return {
    ok: true,
    message: 'Analyze result list loaded successfully.',
    items,
    totals: computeListTotals(items),
  };
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[18px] border border-[#edf1f5] bg-[#fbfcfe] px-4 py-3">
      <span className="text-[0.92rem] text-[#607082]">{label}</span>
      <span className="text-[0.98rem] font-semibold text-[#111827]">{value}</span>
    </div>
  );
}
