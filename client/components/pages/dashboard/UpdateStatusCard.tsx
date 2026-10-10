"use client";

import { useDashboardData } from "@/components/layouts/dashboard/DashboardDataProvider";

export default function UpdateStatusCard() {
  const { updateStatus } = useDashboardData();

  return (
    <section className="mg-panel-enter overflow-hidden rounded-[30px] border border-[#ffe7a6] bg-[linear-gradient(180deg,#fffaf0_0%,#fff5dd_100%)] px-6 py-6 shadow-[0_16px_32px_rgba(245,158,11,0.12)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="inline-flex rounded-full bg-white/75 px-3 py-1 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#8d6d00]">
            Data health
          </span>
          <h3 className="mt-3 text-[1.55rem] font-semibold tracking-[-0.04em] text-[#202020]">
            Cập nhật cơ sở dữ liệu
          </h3>
        </div>
        <span className="rounded-full bg-[#fff1bf] px-3 py-1.5 text-[0.84rem] font-semibold text-[#7a5d00]">
          {updateStatus.versionLabel}
        </span>
      </div>

      <div className="mt-5 rounded-[22px] bg-white/75 px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[0.86rem] uppercase tracking-[0.14em] text-[#8a6f1d]">
              Phiên bản hiện tại
            </p>
            <p className="mt-2 text-[2rem] font-semibold tracking-[-0.06em] text-[#181818]">
              {updateStatus.version}
            </p>
          </div>
          <SyncIcon />
        </div>

        <div className="mt-4 h-2 rounded-full bg-[#f8e9b5]">
          <div className="h-full w-[86%] rounded-full bg-[linear-gradient(90deg,#f59e0b,#facc15)]" />
        </div>

        <p className="mt-4 text-[0.95rem] leading-6 text-[#5b4d2f]">
          Đồng bộ lần cuối: <span className="font-semibold">{updateStatus.lastSyncedLabel}</span>
        </p>
      </div>
    </section>
  );
}

function SyncIcon() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff1bf] text-[#8d6d00]">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="none">
        <path
          d="M6 8.5A6.5 6.5 0 0 1 17.2 6L19 8m-1 7.5A6.5 6.5 0 0 1 6.8 18L5 16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19 4v4h-4M5 20v-4h4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
