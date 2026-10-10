import type {
  AnalyzeEvidence,
  AnalyzeEvidenceTone,
} from "@/types/analyzeResult";

type AnalyzeResultEvidencePanelProps = {
  evidence: AnalyzeEvidence;
};

export default function AnalyzeResultEvidencePanel({
  evidence,
}: AnalyzeResultEvidencePanelProps) {
  return (
    <section className="mg-panel-enter overflow-hidden rounded-[30px] border border-white/[0.68] bg-white/[0.92] shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur">
      <div className="flex flex-col gap-3 border-b border-[#edf1f5] bg-[linear-gradient(180deg,#fbfcfe_0%,#f5f8fc_100%)] px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#edf3fb] text-[#42618f]">
            <EyeIcon />
          </div>
          <div>
            <span className="inline-flex rounded-full bg-[#eef4ff] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#42618f]">
              Evidence
            </span>
            <h2 className="mt-3 text-[1.5rem] font-semibold tracking-[-0.05em] text-[#101418]">
              Bằng chứng phân tích
            </h2>
          </div>
        </div>
        <div className="text-[0.92rem] text-[#6b7787]">Original email snippet</div>
      </div>

      <div className="px-6 py-6 sm:px-7 sm:py-7">
        <div className="rounded-[24px] border border-[#e8edf3] bg-[#fbfcfe] p-5 font-mono text-[0.95rem] leading-8 text-[#222] sm:p-6">
          <div className="flex flex-wrap items-start gap-3">
            <span className="text-[#7b8690]">From:</span>
            <span className="rounded-[10px] border border-[#ffc9c1] bg-[#fff5f4] px-3 py-1 text-[#be2b20]">
              {evidence.from}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-start gap-3">
            <span className="text-[#7b8690]">Subject:</span>
            <span className="font-semibold text-[#111827]">{evidence.subject}</span>
          </div>

          <div className="mt-6">{evidence.greeting}</div>

          <div className="mt-4">
            <span className="rounded-[8px] bg-[#f1f5f9] px-1.5 py-0.5">
              {evidence.highlightPrimary}
            </span>{" "}
            {evidence.primaryContinuation}
          </div>

          {evidence.highlightUrgency !== "—" ? (
            <div className="mt-3">
            <span className={`rounded-[8px] border px-1.5 py-0.5 ${toneSummaryClassName(evidence.highlightTone)}`}>
              {evidence.highlightUrgency}
            </span>
            </div>
          ) : null}

          <div className="mt-6">{evidence.linkIntro}</div>
          {evidence.links.length > 0 ? (
            <div className="mt-4 space-y-3">
              {evidence.links.map((link) => (
                <div
                  key={`${link.href}-${link.statusLabel}`}
                  className={`rounded-[14px] border px-3 py-3 ${toneCardClassName(link.tone)}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-w-0 max-w-full items-center gap-2 text-[#1848ff] break-all underline underline-offset-4"
                    >
                      {link.label}
                      <ExternalLinkIcon />
                    </a>
                    <span className={`rounded-full px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] ${toneBadgeClassName(link.tone)}`}>
                      {link.statusLabel}
                    </span>
                  </div>
                  <div className="mt-2 text-[0.86rem] leading-6 text-[#5f6b7a]">
                    {link.reason}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-6">{evidence.signoff}</div>
          <div className="mt-2">{evidence.signature}</div>
        </div>
      </div>
    </section>
  );
}

function toneSummaryClassName(tone: AnalyzeEvidenceTone): string {
  switch (tone) {
    case "danger":
      return "border-[#ffcdc6] bg-[#fff6f5] text-[#be2b20]";
    case "warning":
      return "border-[#f5d47a] bg-[#fff8dd] text-[#8a6b00]";
    case "safe":
    default:
      return "border-[#d8e5dc] bg-[#f3faf5] text-[#2f6b40]";
  }
}

function toneCardClassName(tone: AnalyzeEvidenceTone): string {
  switch (tone) {
    case "danger":
      return "border-[#ffd2cc] bg-[#fff8f7]";
    case "warning":
      return "border-[#f3d77f] bg-[#fffaf0]";
    case "safe":
    default:
      return "border-[#dce9e1] bg-white";
  }
}

function toneBadgeClassName(tone: AnalyzeEvidenceTone): string {
  switch (tone) {
    case "danger":
      return "bg-[#ffe5e1] text-[#b32117]";
    case "warning":
      return "bg-[#fff2c1] text-[#8a6b00]";
    case "safe":
    default:
      return "bg-[#eaf7ef] text-[#2f6b40]";
  }
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="M2.7 12S6 6.8 12 6.8 21.3 12 21.3 12 18 17.2 12 17.2 2.7 12 2.7 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 flex-none" fill="none">
      <path
        d="M14 5h5v5m-8 9H6V6h5m8-1-9 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
