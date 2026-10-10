'use client';

import {
  createContext,
  use,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import AppLoadingScreen from '@/components/system/AppLoadingScreen';
import {
  buildDashboardFallbackData,
  fetchDashboardData,
  type DashboardData,
} from '@/services/api/dashboardService';
import { useAuthState } from '@/store/authStore';

const DashboardDataContext = createContext<DashboardData | null>(null);

export default function DashboardDataProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user, isLoading: isAuthLoading } = useAuthState();
  const [data, setData] = useState<DashboardData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      if (isAuthLoading) {
        return;
      }

      const effectiveUserId = user?.id ?? null;

      if (!effectiveUserId) {
        if (!isMounted) {
          return;
        }

        setData(buildDashboardFallbackData(user?.name));
        setErrorMessage('Không tìm thấy thông tin người dùng để tải dashboard.');
        return;
      }

      const response = await fetchDashboardData(effectiveUserId, user?.name);

      if (!isMounted) {
        return;
      }

      if (!response.ok) {
        setData(buildDashboardFallbackData(user?.name));
        setErrorMessage(response.error.message);
        return;
      }

      setData(response.data);
      setErrorMessage(null);
    }

    void loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, retryNonce, user?.id, user?.name]);

  if ((isAuthLoading || !data) && !errorMessage) {
    return <AppLoadingScreen overlay />;
  }

  const resolvedData = data ?? buildDashboardFallbackData(user?.name);

  return (
    <>
      {errorMessage ? (
        <section className="rounded-[24px] border border-[#f2d4cf] bg-[#fff7f6] px-5 py-4 text-[#8f3d32] shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[1rem] font-semibold">Không thể tải đầy đủ dashboard</p>
              <p className="mt-1 text-[0.95rem]">{errorMessage}</p>
            </div>

            <button
              type="button"
              onClick={() => setRetryNonce((value) => value + 1)}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#e7c0ba] bg-white px-4 text-[0.92rem] font-semibold text-[#8f3d32] transition hover:bg-[#fff2f0]"
            >
              Thử lại
            </button>
          </div>
        </section>
      ) : null}

      <DashboardDataContext value={resolvedData}>{children}</DashboardDataContext>
    </>
  );
}

export function useDashboardData() {
  const data = use(DashboardDataContext);

  if (!data) {
    throw new Error('Dashboard data is not available.');
  }

  return data;
}
