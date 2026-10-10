"use client";

import { useDashboardData } from "@/components/layouts/dashboard/DashboardDataProvider";

export default function ProtectionStatusPanel() {
  const { protectionModules } = useDashboardData();

  return (
    <section className="mg-panel-enter rounded-[30px] border border-white/70 bg-white/[0.92] px-6 py-6 shadow-[0_16px_34px_rgba(15,23,42,0.06)] backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#dcf7ef]">
            <span className="h-3.5 w-3.5 rounded-full bg-[#1ec997]" />
          </span>
          <h2 className="text-[1.55rem] font-semibold tracking-[-0.05em] text-[#111827]">
            Trạng thái bảo vệ
          </h2>
        </div>
        <span className="rounded-full bg-[#eef6ff] px-3 py-1 text-[0.82rem] font-semibold uppercase tracking-[0.12em] text-[#4d6c96]">
          {protectionModules.length} modules
        </span>
      </div>

      <div className="mt-6 space-y-4">
        {protectionModules.map((module, index) => (
          <article
            key={module.title}
            className="mg-card-hover rounded-[22px] border border-[#edf1f5] bg-[#f8fafc] px-4 py-4"
          >
            <div className="flex items-start gap-4">
              <span className="mt-1 flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#e9eef5] text-[#111827]">
                <ProtectionIcon icon={module.icon} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[1.02rem] font-semibold leading-6 text-[#171717]">
                      {module.title}
                    </p>
                    <p className="mt-1 text-[0.94rem] leading-6 text-[#596577]">
                      {module.description}
                    </p>
                  </div>
                  <span className="rounded-[10px] bg-[#d7efe8] px-3 py-1.5 text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-[#10b98a]">
                    {module.status}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-[0.82rem] text-[#5f6b7a]">
                    <span>Độ sẵn sàng</span>
                    <span>{100 - index * 3}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#34d399,#86efac)]"
                      style={{ width: `${100 - index * 3}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProtectionIcon({ icon }: { icon: "link" | "language" | "image" }) {
  if (icon === "link") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <path
          d="M10 14 8.2 15.8a3 3 0 1 1-4.2-4.2L6.6 9M14 10l1.8-1.8a3 3 0 1 1 4.2 4.2L17.4 15M8.5 12h7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (icon === "language") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <path
          d="M5 5h9M9.5 5c0 6-1.8 10.3-4.5 14M5.7 14.3c1.7-1 3.6-1.5 5.7-1.5 2.3 0 4.2.5 5.8 1.5M14 5l5 14M15.4 15h5.2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <path d="M5 6h10v10H5z" stroke="currentColor" strokeWidth="2" />
      <path
        d="m15 15 4 4M8 13l2-2 2 2 1-1 2 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="9" cy="9" r="1" fill="currentColor" />
    </svg>
  );
}
