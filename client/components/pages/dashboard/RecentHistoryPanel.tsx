"use client";

import Link from "next/link";

import { useDashboardData } from "@/components/layouts/dashboard/DashboardDataProvider";

export default function RecentHistoryPanel() {
  const { scanHistory } = useDashboardData();

  return (
    <section className="mg-panel-enter overflow-hidden rounded-[30px] border border-white/70 bg-white/[0.92] shadow-[0_18px_36px_rgba(15,23,42,0.06)] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-6 sm:px-7">
        <div>
          <span className="inline-flex rounded-full bg-[#eef4ff] px-3 py-1 text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#42618f]">
            Activity feed
          </span>
          <h2 className="mt-3 text-[1.85rem] font-semibold tracking-[-0.05em] text-[#111827]">
            Lịch sử quét gần đây
          </h2>
        </div>
        <Link
          href="/analyze_result"
          className="rounded-full bg-[#fff5cc] px-4 py-2 text-[0.92rem] font-semibold text-[#876800] transition hover:bg-[#ffeeb0]"
        >
          Xem tất cả
        </Link>
      </div>

      <div className="border-t border-[#edf1f5] px-6 py-5 sm:px-7">
        <div className="hidden grid-cols-[118px_minmax(0,1fr)_190px] gap-4 pb-4 text-[0.82rem] font-semibold uppercase tracking-[0.12em] text-[#64748b] lg:grid">
          <div>Thời gian</div>
          <div>Nội dung / Nguồn</div>
          <div>Mức độ rủi ro</div>
        </div>

        <div className="space-y-3">
          {scanHistory.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`mg-card-hover grid gap-4 rounded-[24px] border px-4 py-4 lg:grid-cols-[118px_minmax(0,1fr)_190px] lg:items-center ${
                item.tone === "danger"
                  ? "border-rose-100 bg-[linear-gradient(180deg,#fff8f7_0%,#fff1ef_100%)]"
                  : item.tone === "safe"
                    ? "border-slate-100 bg-[linear-gradient(180deg,#f8fbff_0%,#f3f7fd_100%)]"
                    : "border-amber-100 bg-[linear-gradient(180deg,#fffaf0_0%,#fff5dd_100%)]"
              }`}
            >
              <div className="flex items-center justify-between gap-3 lg:block">
                <p className="text-[0.98rem] font-semibold text-[#111827]">{item.time}</p>
                <p className="mt-1 text-[0.92rem] text-[#5f6b7a]">{item.period}</p>
              </div>

              <div className="flex items-start gap-4">
                <span className="mt-1 flex h-10 w-10 flex-none items-center justify-center rounded-[14px] bg-white text-[#5a5346] shadow-[0_8px_16px_rgba(15,23,42,0.06)]">
                  <SourceIcon icon={item.sourceIcon} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[1.02rem] font-semibold text-[#151515]">
                    {item.title}
                  </p>
                  <p className="mt-1 truncate text-[0.94rem] text-[#5f6b7a]">{item.source}</p>
                </div>
              </div>

              <div className="flex items-center">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.94rem] font-semibold ${
                    item.tone === "danger"
                      ? "bg-[#ffd8d3] text-[#b40000]"
                      : item.tone === "safe"
                        ? "bg-[#dfe4ff] text-[#55618b]"
                        : "bg-[#ffe075] text-[#4b3d00]"
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      item.tone === "danger"
                        ? "bg-[#b40000]"
                        : item.tone === "safe"
                          ? "bg-[#55618b]"
                          : "bg-[#282400]"
                    }`}
                  />
                  {item.riskLabel} ({item.riskValue})
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function SourceIcon({ icon }: { icon: "mail" | "sms" | "link" }) {
  if (icon === "mail") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="none">
        <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="m5 8 7 5 7-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "sms") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="none">
        <path
          d="M5 7h14v10H9l-4 3V7Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="12" r="1" fill="currentColor" />
        <circle cx="13" cy="12" r="1" fill="currentColor" />
        <circle cx="16" cy="12" r="1" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="none">
      <path
        d="M10 14 8.2 15.8a3 3 0 1 1-4.2-4.2L6.6 9M14 10l1.8-1.8a3 3 0 1 1 4.2 4.2L17.4 15M8.5 12h7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
