type AnalyzeResultRiskCardProps = {
  riskScore: number;
  riskTone: "safe" | "warning" | "danger";
  severityLabel: string;
  summary: string;
};

export default function AnalyzeResultRiskCard({
  riskScore,
  riskTone,
  severityLabel,
  summary,
}: AnalyzeResultRiskCardProps) {
  const toneStyles =
    riskTone === "safe"
      ? {
          ring: "#16a34a",
          glow: "rgba(22, 163, 74, 0.12)",
          badge: "bg-[#e8f7ef] text-[#156b43]",
          dot: "bg-[#16a34a]",
        }
      : riskTone === "warning"
        ? {
            ring: "#d97706",
            glow: "rgba(217, 119, 6, 0.12)",
            badge: "bg-[#fff4cc] text-[#8d6d00]",
            dot: "bg-[#d97706]",
          }
        : {
            ring: "#dc2626",
            glow: "rgba(220, 38, 38, 0.12)",
            badge: "bg-[#ffe3df] text-[#b42318]",
            dot: "bg-[#dc2626]",
          };

  return (
    <section className="mg-panel-enter overflow-hidden rounded-[30px] border border-white/[0.68] bg-white/[0.92] px-6 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur sm:px-7 sm:py-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="inline-flex rounded-full bg-[#f4f6fa] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#6a7482]">
            Risk overview
          </span>
          <h2 className="mt-4 text-[1.55rem] font-semibold tracking-[-0.05em] text-[#101418]">
            Chỉ số rủi ro tổng thể
          </h2>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[0.92rem] font-semibold ${toneStyles.badge}`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${toneStyles.dot}`} />
          {severityLabel}
        </span>
      </div>

      <div className="mt-8 flex justify-center">
        <div
          className="relative flex h-52 w-52 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(${toneStyles.ring} 0 ${riskScore}%, #e8edf3 ${riskScore}% 100%)`,
            boxShadow: `0 24px 40px ${toneStyles.glow}`,
          }}
        >
          <div className="absolute inset-[14px] rounded-full bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]" />
          <div className="relative text-center">
            <div
              className="text-[4rem] font-semibold leading-none tracking-[-0.08em]"
              style={{ color: toneStyles.ring }}
            >
              {riskScore}
              <span className="text-[2.1rem]">%</span>
            </div>
            <p className="mt-2 text-[0.84rem] font-semibold uppercase tracking-[0.2em] text-[#7b8690]">
              Threat score
            </p>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-7 max-w-[19rem] text-center text-[0.98rem] leading-7 text-[#536071]">
        {summary}
      </p>

      <div className="mt-6 rounded-[22px] bg-[#f6f8fb] px-4 py-4">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 flex-none items-center justify-center rounded-full"
            style={{ backgroundColor: toneStyles.glow, color: toneStyles.ring }}
          >
            <WarningTriangle />
          </div>
          <div>
            <p className="text-[0.88rem] font-semibold uppercase tracking-[0.16em] text-[#6a7482]">
              Recommendation
            </p>
            <p className="mt-1 text-[0.95rem] leading-6 text-[#445061]">
              Ưu tiên kiểm tra các dấu hiệu ở cột phải trước khi mở link hoặc tương tác với nội
              dung email này.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function WarningTriangle() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="M12 4 21 20H3L12 4Z"
        fill="currentColor"
        fillOpacity="0.16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 9v4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="17.2" r="1.2" fill="currentColor" />
    </svg>
  );
}
