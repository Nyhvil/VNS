"use client";

import { useDashboardData } from "@/components/layouts/dashboard/DashboardDataProvider";

export default function DashboardOverviewHero() {
  const { stats, protectionModules, scanHistory, updateStatus } = useDashboardData();

  const securityScore = stats.find((card) => card.type === "score");
  const blockedThreats = stats.find((card) => card.type === "shield");
  const totalScans = stats.find((card) => card.type === "metric");
  const activeModules = protectionModules.filter((module) =>
    module.status.toLowerCase().includes("bật"),
  ).length;
  const topThreat = scanHistory.find((item) => item.tone === "danger") ?? scanHistory[0];

  return (
    <section className="mg-panel-enter relative overflow-hidden rounded-4xl bg-[#0f172a] px-6 py-6 text-white shadow-[0_26px_60px_rgba(15,23,42,0.24)] sm:px-7 sm:py-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_34%),radial-gradient(circle_at_85%_15%,rgba(250,204,21,0.2),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]" />
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[rgba(250,204,21,0.12)] blur-3xl mg-soft-glow" />
      <div className="pointer-events-none absolute -bottom-18 -left-7 h-56 w-56 rounded-full bg-[rgba(56,189,248,0.12)] blur-3xl mg-soft-glow" />

      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_300px] lg:items-end">
        <div>
          <span className="inline-flex items-center rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[0.76rem] font-semibold uppercase tracking-[0.22em] text-white/72">
            Security overview
          </span>
          <h2 className="mt-4 max-w-2xl text-[2rem] font-semibold leading-tight tracking-[-0.06em] text-white sm:text-[2.55rem]">
            Mọi tín hiệu quan trọng đã được gom lại để bạn nhìn ra rủi ro nhanh hơn.
          </h2>
          <p className="mt-3 max-w-2xl text-[1rem] leading-7 text-slate-300">
            Từ lượt quét, mối đe dọa bị chặn đến trạng thái đồng bộ, dashboard này
            giữ mọi thứ trong một nhịp quan sát ngắn gọn và dễ theo dõi.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <InsightCard
              label="Module đang bảo vệ"
              value={`${activeModules}/${protectionModules.length}`}
              helper="Tất cả lớp bảo vệ đang hoạt động"
            />
            <InsightCard
              label="Đồng bộ dữ liệu"
              value={updateStatus.lastSyncedLabel}
              helper={`Phiên bản ${updateStatus.version}`}
            />
            <InsightCard
              label="Rủi ro nổi bật"
              value={topThreat ? `${topThreat.riskValue}` : "--"}
              helper={topThreat ? topThreat.title : "Chưa có cảnh báo đáng chú ý"}
              tone="danger"
            />
          </div>
        </div>

        <aside className="rounded-[28px] border border-white/12 bg-white/8 p-5 backdrop-blur">
          <p className="text-[0.76rem] font-semibold uppercase tracking-[0.2em] text-white/60">
            Snapshot
          </p>

          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[0.95rem] text-slate-300">Điểm an toàn hiện tại</p>
              <div className="mt-2 text-[3.1rem] font-semibold leading-none tracking-[-0.08em] text-white">
                {securityScore?.value ?? "--"}
                <span className="text-[1.1rem] text-slate-400">/100</span>
              </div>
            </div>
            <div className="flex h-18 w-18 items-center justify-center rounded-full border border-amber-300/24 bg-amber-300/10">
              <ShieldSparkIcon />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <SummaryRow label="Lượt quét ghi nhận" value={totalScans?.value ?? "--"} />
            <SummaryRow label="Mối đe dọa đã chặn" value={blockedThreats?.value ?? "--"} />
            <SummaryRow label="Trạng thái bản dữ liệu" value={updateStatus.versionLabel} />
          </div>
        </aside>
      </div>
    </section>
  );
}

function InsightCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "danger";
}) {
  return (
    <article
      className={`rounded-[22px] border px-4 py-4 backdrop-blur ${
        tone === "danger"
          ? "border-rose-300/24 bg-rose-300/10"
          : "border-white/10 bg-white/[0.07]"
      }`}
    >
      <p className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-white/[0.58]">
        {label}
      </p>
      <p className="mt-3 text-[1.45rem] font-semibold tracking-[-0.05em] text-white">
        {value}
      </p>
      <p className="mt-2 line-clamp-2 text-[0.92rem] leading-6 text-slate-300">
        {helper}
      </p>
    </article>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-black/10 px-4 py-3">
      <span className="text-[0.92rem] text-slate-300">{label}</span>
      <span className="text-[0.98rem] font-semibold text-white">{value}</span>
    </div>
  );
}

function ShieldSparkIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8" fill="none">
      <path
        d="M12 3.5c2.2 1.75 4.75 2.63 7.5 2.63v5.06c0 5.3-3.34 8.38-7.5 9.73-4.16-1.35-7.5-4.43-7.5-9.73V6.13c2.75 0 5.3-.88 7.5-2.63Z"
        stroke="#fde68a"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m9.6 11.9 1.7 1.7 3.4-3.7M18.2 5.8l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5.5-1.4Z"
        stroke="#fef3c7"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
