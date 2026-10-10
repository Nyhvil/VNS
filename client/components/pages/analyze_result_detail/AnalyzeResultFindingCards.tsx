import type { AnalyzeFinding } from "@/types/analyzeResult";

type AnalyzeResultFindingCardsProps = {
  findings: AnalyzeFinding[];
};

export default function AnalyzeResultFindingCards({
  findings,
}: AnalyzeResultFindingCardsProps) {
  return (
    <section className="mg-panel-enter rounded-[30px] border border-white/[0.68] bg-white/[0.92] px-6 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur sm:px-7 sm:py-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex rounded-full bg-[#eef4ff] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#42618f]">
            Key findings
          </span>
          <h2 className="mt-4 text-[1.55rem] font-semibold tracking-[-0.05em] text-[#101418]">
            Các tín hiệu đáng ngờ
          </h2>
        </div>
        <p className="max-w-xl text-[0.96rem] leading-7 text-[#536071]">
          Hệ thống đã gom các dấu hiệu nổi bật nhất để bạn nắm nhanh đâu là điểm bất thường cần
          lưu ý trước.
        </p>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-3">
        {findings.map((finding, index) => (
          <article
            key={finding.title}
            className="mg-card-hover rounded-[24px] border border-[#e8edf3] bg-[linear-gradient(180deg,#ffffff_0%,#fafcff_100%)] px-5 py-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-center justify-between gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-[16px] ${finding.iconBg} ${finding.iconText}`}
              >
                <FindingIcon icon={finding.icon} />
              </div>
              <span className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#8792a0]">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <p
              className={`mt-4 text-[0.82rem] font-semibold uppercase tracking-[0.16em] ${finding.severityText}`}
            >
              {finding.severityLabel}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FindingIcon({ icon }: { icon: AnalyzeFinding["icon"] }) {
  if (icon === "link") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <path
          d="M14.5 7.5h2a3.5 3.5 0 1 1 0 7h-2m-5-5h-2a3.5 3.5 0 1 0 0 7h2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="m5 5 14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "language") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <path
          d="M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 0c2.3 2.5 3.5 4.8 3.5 7s-1.2 4.5-3.5 7m0-14c-2.3 2.5-3.5 4.8-3.5 7s1.2 4.5 3.5 7m-6.2-4h12.4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <path
        d="M12 4c3 2.4 5.9 3.4 8.4 3.4v4.8c0 4.8-3 7.8-8.4 9.8-5.4-2-8.4-5-8.4-9.8V7.4C6.1 7.4 9 6.4 12 4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2.1 2.1L15.5 10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
