import type { AnalyzeAction } from "@/types/analyzeResult";

type AnalyzeResultActionsPanelProps = {
  actions: AnalyzeAction[];
};

export default function AnalyzeResultActionsPanel({
  actions,
}: AnalyzeResultActionsPanelProps) {
  return (
    <section className="mg-panel-enter rounded-[30px] border border-white/[0.68] bg-white/[0.92] px-6 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur sm:px-7 sm:py-7">
      <span className="inline-flex rounded-full bg-[#fff4cc] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#8d6d00]">
        Next steps
      </span>
      <h2 className="mt-4 text-[1.55rem] font-semibold tracking-[-0.05em] text-[#101418]">
        Hành động khuyến nghị
      </h2>
      <p className="mt-3 text-[0.96rem] leading-7 text-[#536071]">
        Giữ nguyên quy trình xử lý hiện tại, chỉ cần làm lần lượt các bước dưới đây để tránh
        tương tác nhầm với nội dung độc hại.
      </p>

      <div className="mt-7 space-y-3.5">
        {actions.map((action, index) => (
          <article
            key={action.title}
            className="rounded-[22px] border border-[#e8edf3] bg-[linear-gradient(180deg,#ffffff_0%,#fafcff_100%)] px-4 py-4 shadow-[0_10px_22px_rgba(15,23,42,0.04)]"
          >
            <div className="flex gap-4">
              <div className="mt-1 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#f2f5f9] text-[0.78rem] font-semibold text-[#7b8690]">
                {index + 1}
              </div>
              <div
                className={`mt-1 flex h-10 w-10 flex-none items-center justify-center rounded-[12px] ${action.iconBg} ${action.iconText}`}
              >
                <ActionIcon icon={action.icon} />
              </div>
              <div className="min-w-0">
                <h3 className="text-[1rem] font-semibold text-[#181818]">{action.title}</h3>
                <p className="mt-1.5 text-[0.95rem] leading-7 text-[#5d6674]">{action.detail}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ActionIcon({ icon }: { icon: AnalyzeAction["icon"] }) {
  if (icon === "ban-link") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
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

  if (icon === "report") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path
          d="M12 3 20 8v8l-8 5-8-5V8l8-5Z"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
        <path d="M12 8v5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        <circle cx="12" cy="16.2" r="1.2" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path d="M7 4h10v16H7z" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M9 8h6M9 12h6M9 16h6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}
