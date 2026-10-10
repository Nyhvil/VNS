"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { MockAnalyzeSubmissionSuccess } from "@/types/analyzeResult";

type AnalyzeSubmissionResultCardProps = {
  result: MockAnalyzeSubmissionSuccess;
  previewUrl?: string | null;
};

const toneStyles = {
  safe: {
    shell: "border-[#bfe6c9] bg-[linear-gradient(180deg,#f4fbf6_0%,#eef8f0_100%)]",
    badge: "bg-[#d7f5de] text-[#1b8f45]",
    accent: "text-[#14a44d]",
    ring: "#1db954",
    shield: "text-[#23b85a]",
    chip: "border-[#b9e8c7] bg-[#effbf2] text-[#20834a]",
    callout: "border-[#cbe8d2] bg-[#f7fdf8] text-[#3d5f49]",
  },
  warning: {
    shell: "border-[#f2d38f] bg-[linear-gradient(180deg,#fffaf0_0%,#fff6e4_100%)]",
    badge: "bg-[#fff0c9] text-[#9b6500]",
    accent: "text-[#c37a00]",
    ring: "#d89a15",
    shield: "text-[#c4890f]",
    chip: "border-[#f1daa4] bg-[#fff8e8] text-[#976600]",
    callout: "border-[#f3e2ba] bg-[#fffaf0] text-[#6f5422]",
  },
  danger: {
    shell: "border-[#efc1bc] bg-[linear-gradient(180deg,#fff7f6_0%,#fff0ef_100%)]",
    badge: "bg-[#ffe2de] text-[#c4372b]",
    accent: "text-[#d4392b]",
    ring: "#df4d3f",
    shield: "text-[#d83c2f]",
    chip: "border-[#efc7c2] bg-[#fff1ef] text-[#b83d31]",
    callout: "border-[#f0d0cb] bg-[#fff7f6] text-[#6c403a]",
  },
} as const;

export default function AnalyzeSubmissionResultCard({
  result,
  previewUrl,
}: AnalyzeSubmissionResultCardProps) {
  const [feedback, setFeedback] = useState<"like" | "dislike" | null>(null);
  const style = toneStyles[result.riskTone];

  return (
    <article
      className={`overflow-hidden rounded-[30px] border shadow-[0_24px_56px_rgba(15,23,42,0.1)] ${style.shell}`}
    >
      <div className="border-b border-white/50 px-5 py-5 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_280px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-[0.82rem] font-semibold ${style.badge}`}>
                {result.statusLabel}
              </span>
              <span className="rounded-full border border-white/60 bg-white/65 px-3 py-1 text-[0.78rem] font-semibold text-[#516071]">
                {result.sourceLabel}
              </span>
            </div>

            <h3 className="mt-4 text-[1.55rem] font-semibold tracking-[-0.05em] text-[#102018] sm:text-[1.8rem]">
              {result.title}
            </h3>
            <p className="mt-3 max-w-3xl text-[0.98rem] leading-7 text-[#49596c]">{result.summary}</p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-3 rounded-[18px] border border-white/65 bg-white/72 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                <ShieldMark className={style.shield} />
                <div>
                  <p className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#738296]">
                    Verdict
                  </p>
                  <p className={`mt-1 text-[1rem] font-semibold ${style.accent}`}>{result.statusLabel}</p>
                </div>
              </div>
              <div className="inline-flex items-center rounded-[18px] border border-white/65 bg-white/72 px-4 py-3 text-[0.92rem] font-medium text-[#516071] shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                {result.confidence}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <ResultMetric
              label="Risk score"
              value={`${result.riskScore}%`}
              helper="Điểm rủi ro tổng hợp"
              accent={style.accent}
            />
            <ResultMetric
              label="Nguồn phân tích"
              value={result.attachmentName ? "Visual + OCR" : "Text only"}
              helper={result.attachmentName ? "Có ảnh tải lên" : "Không có ảnh đính kèm"}
            />
            <ResultMetric label="Result ID" value={result.resultId} helper="Dùng để mở bản chi tiết" />
          </div>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <section className="rounded-3xl border border-white/65 bg-white/72 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.82rem] font-semibold uppercase tracking-[0.18em] text-[#738296]">
                Snapshot
              </p>
              <RiskMeter riskScore={result.riskScore} accent={style.accent} ring={style.ring} />
            </div>

            <div className="mt-4 space-y-3">
              <SummaryRow label="Attachment" value={result.attachmentName ?? "Không có"} />
              <SummaryRow label="Source label" value={result.sourceLabel} />
              <SummaryRow label="Phrases flagged" value={`${result.dangerousPhrases.length}`} />
              <SummaryRow label="Organizations" value={`${result.mentionedOrganizations.length}`} />
            </div>

            {previewUrl ? (
              <div className="mt-4 rounded-[20px] border border-[#e7edf4] bg-[#f8fbff] p-3">
                <p className="text-[0.76rem] font-semibold uppercase tracking-[0.18em] text-[#758396]">
                  Ảnh tải lên
                </p>
                <Image
                  src={previewUrl}
                  alt={result.attachmentName ?? "Uploaded preview"}
                  unoptimized
                  width={288}
                  height={210}
                  className="mt-3 h-52 w-full rounded-2xl object-cover"
                />
                <p className="mt-3 truncate text-[0.94rem] font-medium text-[#142334]">
                  {result.attachmentName}
                </p>
                <p className="mt-1 text-[0.9rem] leading-6 text-[#607082]">
                  OCR server lấy nội dung từ ảnh này trước khi ghép với phần text bạn cung cấp.
                </p>
              </div>
            ) : null}
          </section>

          <div className="space-y-5">
            <section className="rounded-3xl border border-white/65 bg-white/72 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
              <p className="text-[0.82rem] font-semibold uppercase tracking-[0.18em] text-[#738296]">
                OCR transcript
              </p>
              <div className="mt-3 rounded-[18px] border border-[#edf2f7] bg-[#fcfdff] px-4 py-4 text-[0.97rem] leading-7 text-[#59697a]">
                {result.extractedText}
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-3xl border border-white/65 bg-white/72 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                <p className="flex items-center gap-2 text-[1rem] font-semibold text-[#172536]">
                  <WarningIcon />
                  Cụm từ nguy hiểm
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.dangerousPhrases.length ? (
                    result.dangerousPhrases.map((phrase) => (
                      <span
                        key={phrase}
                        className={`rounded-full border px-3 py-1.5 text-[0.9rem] ${style.chip}`}
                      >
                        {phrase}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-[#d7e6dc] bg-white/70 px-3 py-1.5 text-[0.9rem] text-[#5d6d62]">
                      Không phát hiện cụm từ đáng ngờ rõ rệt
                    </span>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-white/65 bg-white/72 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                <p className="flex items-center gap-2 text-[1rem] font-semibold text-[#172536]">
                  <BuildingIcon />
                  Tổ chức được nhắc đến
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.mentionedOrganizations.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-[#bfd4ea] bg-[#edf6ff] px-3 py-1.5 text-[0.9rem] text-[#3d6f9f]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </section>
            </div>

            <section className={`rounded-3xl border px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] ${style.callout}`}>
              <p className="flex items-center gap-2 text-[1.02rem] font-semibold">
                <SummaryIcon />
                Tóm tắt xác minh
              </p>
              <p className="mt-2 text-[0.97rem] leading-7">{result.verificationSummary}</p>
            </section>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/65 bg-white/72 px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
          <div>
            <p className="text-[1rem] font-semibold text-[#13212f]">Bạn có thấy kết quả hữu ích?</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <FeedbackButton active={feedback === "like"} label="Thích" onClick={() => setFeedback("like")} />
              <FeedbackButton
                active={feedback === "dislike"}
                label="Không thích"
                onClick={() => setFeedback("dislike")}
              />
            </div>
          </div>

          {result.detailHref ? (
            <Link
              href={result.detailHref}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#111827] px-5 text-[0.95rem] font-semibold text-white! transition hover:bg-[#1f2937]"
            >
              Xem phân tích chi tiết
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function RiskMeter({
  riskScore,
  accent,
  ring,
}: {
  riskScore: number;
  accent: string;
  ring: string;
}) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (Math.min(riskScore, 100) / 100) * circumference;

  return (
    <div className="relative flex h-20 w-20 items-center justify-center">
      <svg viewBox="0 0 72 72" className="h-20 w-20 -rotate-90">
        <circle cx="36" cy="36" r={radius} stroke="rgba(148,163,184,0.2)" strokeWidth="6" fill="none" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          stroke={ring}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute text-center">
        <div className={`text-[1.25rem] font-semibold tracking-[-0.06em] ${accent}`}>{riskScore}%</div>
      </div>
    </div>
  );
}

function ResultMetric({
  label,
  value,
  helper,
  accent,
}: {
  label: string;
  value: string;
  helper: string;
  accent?: string;
}) {
  return (
    <article className="rounded-[22px] border border-white/60 bg-white/72 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <p className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[#738296]">
        {label}
      </p>
      <p className={`mt-3 text-[1.15rem] font-semibold tracking-[-0.04em] text-[#13212f] ${accent ?? ""}`}>
        {value}
      </p>
      <p className="mt-2 text-[0.88rem] leading-6 text-[#627284]">{helper}</p>
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
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#e5ebf3] bg-white/80 px-3 py-3">
      <span className="text-[0.86rem] text-[#607082]">{label}</span>
      <span className="max-w-[55%] truncate text-right text-[0.9rem] font-semibold text-[#122132]">
        {value}
      </span>
    </div>
  );
}

function FeedbackButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 items-center justify-center rounded-[14px] border px-4 text-[0.95rem] font-semibold transition ${
        active
          ? "border-[#111827] bg-[#111827] text-white"
          : "border-[#d7dfe8] bg-white/80 text-[#1f2937] hover:bg-white"
      }`}
    >
      {label}
    </button>
  );
}

function ShieldMark({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className={`h-14 w-14 ${className}`} fill="none">
      <path
        d="M24 5c4.9 3.8 10.6 5.7 16.7 5.7v11.1c0 11.7-7 18.7-16.7 21.9C14.3 40.5 7.3 33.5 7.3 21.8V10.7C13.4 10.7 19.1 8.8 24 5Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="m18.7 24.4 4 4.1 7.4-8"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 text-[#d89a15]" fill="none">
      <path
        d="M12 4.5 20 19H4l8-14.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path d="M12 9v4.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="12" cy="16.9" r="1" fill="currentColor" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 text-[#4f89c5]" fill="none">
      <path
        d="M5 20V7.5L12 4l7 3.5V20M9 20v-4h6v4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M9 10h.01M15 10h.01M9 13.5h.01M15 13.5h.01"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SummaryIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 text-[#3e83bb]" fill="none">
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="m9.5 11.5 1.3 1.3 2.8-3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
