import Link from "next/link";

import { analyzeResultDetailContent } from "@/components/pages/analyze_result_detail/content";
import type { AnalyzeSourceIcon } from "@/types/analyzeResult";

type AnalyzeResultHeroProps = {
  requestId: string;
  analyzedAt: string;
  confidence: string;
  title: string;
  source: string;
  sourceIcon: AnalyzeSourceIcon;
};

export default function AnalyzeResultHero({
  requestId,
  analyzedAt,
  confidence,
  title,
  source,
  sourceIcon,
}: AnalyzeResultHeroProps) {
  return (
    <section className="mg-panel-enter relative overflow-hidden rounded-[30px] border border-white/[0.68] bg-white/[0.9] px-6 py-6 shadow-[0_18px_42px_rgba(15,23,42,0.07)] backdrop-blur sm:px-7 sm:py-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,203,17,0.16),transparent_20%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.08),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.44))]" />

      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-full bg-[#eef4ff] px-3 py-1 text-[0.74rem] font-semibold uppercase tracking-[0.2em] text-[#36507b]">
              {analyzeResultDetailContent.eyebrow}
            </span>
            <span className="inline-flex rounded-full bg-[#f4f6fa] px-3 py-1 text-[0.82rem] font-medium text-[#556274]">
              {confidence}
            </span>
          </div>

          <h1 className="mt-4 text-[2rem] font-semibold leading-[1.04] tracking-[-0.06em] text-[#101418] sm:text-[2.6rem]">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-[1rem] leading-7 text-[#536071] sm:text-[1.04rem]">
            {analyzeResultDetailContent.description}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <MetaChip label="Scan ID" value={requestId} />
            <MetaChip label="Analyzed at" value={analyzedAt} />
            <SourceChip source={source} sourceIcon={sourceIcon} />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 xl:justify-end">
          <Link
            href="/analyze_result"
            className="mg-card-hover inline-flex min-h-12 items-center justify-center gap-3 rounded-[18px] border border-[#e5eaf1] bg-white px-5 text-[0.98rem] font-semibold text-[#1f2937] shadow-[0_12px_24px_rgba(15,23,42,0.05)]"
          >
            Danh sách kết quả
          </Link>
          <Link
            href="/dashboard"
            className="mg-card-hover inline-flex min-h-12 items-center justify-center gap-3 rounded-[18px] bg-[#ffcb11] px-5 text-[0.98rem] font-semibold text-[#6a5200] shadow-[0_18px_34px_rgba(255,203,17,0.28)] hover:brightness-105"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </section>
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
    <div className="rounded-[18px] border border-[#e8edf3] bg-[#fbfcfe] px-4 py-3">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#7b8690]">
        {label}
      </p>
      <p className="mt-1 text-[0.96rem] font-medium text-[#18212f]">{value}</p>
    </div>
  );
}

function SourceChip({
  source,
  sourceIcon,
}: {
  source: string;
  sourceIcon: AnalyzeSourceIcon;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-[#e8edf3] bg-[#fbfcfe] px-4 py-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef4ff] text-[#36507b]">
        <SourceIcon icon={sourceIcon} />
      </span>
      <div className="min-w-0">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#7b8690]">
          Source
        </p>
        <p className="truncate text-[0.96rem] font-medium text-[#18212f]">{source}</p>
      </div>
    </div>
  );
}

function SourceIcon({ icon }: { icon: AnalyzeSourceIcon }) {
  if (icon === "mail") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
        <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="m5 8 7 5 7-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "sms") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
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
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none">
      <path
        d="M10 14 8.2 15.8a3 3 0 1 1-4.2-4.2L6.6 9M14 10l1.8-1.8a3 3 0 1 1 4.2 4.2L17.4 15M8.5 12h7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
