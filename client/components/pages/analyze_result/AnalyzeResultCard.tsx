import Link from "next/link";

import type { AnalyzeResultListItem } from "@/types/analyzeResult";

type AnalyzeResultCardProps = {
  item: AnalyzeResultListItem;
};

export default function AnalyzeResultCard({ item }: AnalyzeResultCardProps) {
  const toneClass =
    item.riskTone === "danger"
      ? {
          badge: "bg-[#ffe3df] text-[#b42318]",
          dot: "bg-[#dc2626]",
          ring: "border-rose-100",
          icon: "bg-[#fff0ef] text-[#b42318]",
          surface: "from-[#fffaf9] to-[#ffffff]",
          glow: "bg-[rgba(220,38,38,0.10)]",
          score: "text-[#b42318]",
        }
      : item.riskTone === "warning"
        ? {
            badge: "bg-[#fff4cc] text-[#8d6d00]",
            dot: "bg-[#d97706]",
            ring: "border-amber-100",
            icon: "bg-[#fff7e1] text-[#8d6d00]",
            surface: "from-[#fffdf7] to-[#ffffff]",
            glow: "bg-[rgba(245,158,11,0.10)]",
            score: "text-[#8d6d00]",
          }
        : {
            badge: "bg-[#e8f7ef] text-[#156b43]",
            dot: "bg-[#16a34a]",
            ring: "border-emerald-100",
            icon: "bg-[#eef8f1] text-[#156b43]",
            surface: "from-[#f8fdf9] to-[#ffffff]",
            glow: "bg-[rgba(22,163,74,0.10)]",
            score: "text-[#156b43]",
          };

  return (
    <Link
      href={item.href}
      className={`mg-analysis-card group rounded-[30px] border bg-gradient-to-b px-5 py-5 shadow-[0_14px_30px_rgba(15,23,42,0.06)] backdrop-blur ${toneClass.ring} ${toneClass.surface}`}
    >
      <div
        className={`mg-analysis-card-glow pointer-events-none absolute -right-10 top-8 h-28 w-28 rounded-full blur-3xl opacity-60 ${toneClass.glow}`}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <span
            className={`mg-analysis-card-icon mt-1 flex h-11 w-11 flex-none items-center justify-center rounded-[16px] shadow-[0_10px_18px_rgba(15,23,42,0.05)] ${toneClass.icon}`}
          >
            <SourceIcon icon={item.sourceIcon} />
          </span>
          <div className="min-w-0">
            <p className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#7b8690]">
              {item.requestId}
            </p>
            <h3 className="mt-2 text-[1.08rem] font-semibold leading-7 text-[#111827]">
              {item.title}
            </h3>
            <p className="mt-1 truncate text-[0.95rem] text-[#5f6b7a]">{item.source}</p>
          </div>
        </div>

        <div className="flex flex-none items-start gap-2">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.86rem] font-semibold ${toneClass.badge}`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${toneClass.dot}`} />
            {item.riskValue}
          </span>
          <span className="mg-analysis-card-arrow inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e5eaf1] bg-white/90 text-[#5d6b7c] opacity-80">
            <ArrowIcon />
          </span>
        </div>
      </div>

      <div className="relative mt-5 flex items-end justify-between gap-4 rounded-[22px] border border-[#edf1f5] bg-white/78 px-4 py-4">
        <div>
          <p className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#7b8690]">
            Risk score
          </p>
          <p
            className={`mt-2 text-[2.2rem] font-semibold leading-none tracking-[-0.08em] ${toneClass.score}`}
          >
            {item.riskValue}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#7b8690]">
            Status
          </p>
          <p className="mt-2 text-[0.96rem] font-semibold text-[#111827]">{item.statusLabel}</p>
        </div>
      </div>

      <p className="relative mt-5 text-[0.97rem] leading-7 text-[#536071]">{item.summary}</p>

      <div className="relative mt-5 flex flex-wrap gap-2.5">
        <MetaChip label="Phân tích lúc" value={item.analyzedAt} />
        <MetaChip label="Độ tin cậy" value={item.confidence} />
      </div>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
        <SummaryTile label="Findings" value={String(item.findingsCount)} />
        <SummaryTile label="Actions" value={String(item.actionsCount)} />
      </div>

      <div className="relative mt-5 flex items-center justify-between gap-4 border-t border-[#edf1f5] pt-4">
        <div className="text-[0.92rem] text-[#6b7787]">
          {item.time} • {item.period}
        </div>
        <span className="inline-flex items-center gap-2 text-[0.92rem] font-semibold text-[#1f3f72]">
          Xem chi tiết
          <ArrowIcon />
        </span>
      </div>
    </Link>
  );
}

function MetaChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex rounded-full bg-[#f4f7fb] px-3 py-1.5 text-[0.84rem] text-[#546170]">
      <span className="mr-1 font-semibold text-[#738091]">{label}:</span>
      {value}
    </span>
  );
}

function SummaryTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-[#e8edf3] bg-[#fbfcfe] px-4 py-3 transition-colors duration-200 group-hover:bg-white">
      <p className="text-[0.76rem] font-semibold uppercase tracking-[0.18em] text-[#8691a0]">
        {label}
      </p>
      <p className="mt-2 text-[1.25rem] font-semibold tracking-[-0.04em] text-[#111827]">
        {value}
      </p>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
      <path
        d="M5 12h14m-5-5 5 5-5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
