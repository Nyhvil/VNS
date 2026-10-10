"use client";

import { useDashboardData } from "@/components/layouts/dashboard/DashboardDataProvider";

export default function DashboardStatCards() {
  const { stats } = useDashboardData();

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {stats.map((card, index) => (
        <article
          key={card.label}
          className="mg-card-hover mg-panel-enter relative overflow-hidden rounded-[28px] border border-white/70 bg-white/[0.92] px-5 py-5 shadow-[0_14px_30px_rgba(15,23,42,0.06)] backdrop-blur"
          style={{ animationDelay: `${index * 70}ms` }}
        >
          <div
            className={`absolute inset-x-0 top-0 h-1.5 ${
              card.accent === "red"
                ? "bg-[linear-gradient(90deg,#ef4444,#fda4af)]"
                : card.accent === "olive"
                  ? "bg-[linear-gradient(90deg,#475569,#facc15)]"
                  : "bg-[linear-gradient(90deg,#f59e0b,#fcd34d)]"
            }`}
          />

          <div className="flex items-start justify-between gap-4">
            <p className="text-[0.76rem] font-semibold uppercase tracking-[0.18em] text-[#5b6574]">
              {card.label}
            </p>
            <MetricIcon tone={card.accent} type={card.type} />
          </div>

          {card.type === "score" ? (
            <div className="mt-6 flex items-center justify-between gap-5">
              <div className="max-w-48">
                <p className="text-[0.92rem] font-medium uppercase tracking-[0.14em] text-[#7a6500]">
                  {card.note}
                </p>
                <p className="mt-3 text-[1.02rem] leading-7 text-[#4b5563]">
                  Hệ thống đang duy trì trạng thái ổn định và sẵn sàng xử lý tín
                  hiệu đáng ngờ.
                </p>
              </div>
              <ScoreCircle value={card.value} />
            </div>
          ) : (
            <div className="mt-7">
              <div className="flex items-end gap-3">
                <p
                  className={`text-[2.8rem] font-semibold tracking-[-0.06em] ${
                    card.accent === "red" ? "text-[#a40000]" : "text-[#101418]"
                  }`}
                >
                  {card.value}
                </p>
                <span
                  className={`mb-1.5 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.95rem] font-semibold ${
                    card.accent === "amber"
                      ? "bg-[#fff4cc] text-[#8d6d00]"
                      : card.accent === "red"
                        ? "bg-[#ffe3df] text-[#a40000]"
                        : "bg-[#eef2ff] text-[#475569]"
                  }`}
                >
                  {card.note}
                </span>
              </div>

              <div className="mt-5 h-2 rounded-full bg-[#edf1f5]">
                <div
                  className={`h-full rounded-full ${
                    card.accent === "red"
                      ? "w-[68%] bg-[linear-gradient(90deg,#ef4444,#fda4af)]"
                      : "w-[82%] bg-[linear-gradient(90deg,#eab308,#facc15)]"
                  }`}
                />
              </div>
            </div>
          )}

          {card.type === "metric" ? (
            <div className="pointer-events-none absolute bottom-0 right-0 opacity-30">
              <svg aria-hidden="true" viewBox="0 0 120 120" className="h-28 w-28">
                <circle cx="60" cy="60" r="44" stroke="#d8dce2" strokeWidth="10" fill="none" />
                <circle cx="60" cy="60" r="26" stroke="#d8dce2" strokeWidth="10" fill="none" />
                <path d="M60 34v52l20 10" stroke="#d8dce2" strokeWidth="10" strokeLinecap="round" />
              </svg>
            </div>
          ) : null}

          {card.type === "shield" ? (
            <div className="pointer-events-none absolute bottom-0 right-0 h-26 w-24 bg-[linear-gradient(180deg,rgba(178,0,0,0.05),rgba(178,0,0,0.08))] [clip-path:polygon(50%_0%,100%_18%,100%_100%,0%_100%,0%_18%)]" />
          ) : null}
        </article>
      ))}
    </section>
  );
}

function MetricIcon({
  tone,
  type,
}: {
  tone: "amber" | "red" | "olive";
  type: "metric" | "shield" | "score";
}) {
  const toneClass =
    tone === "red"
      ? "bg-[#ffe5e2] text-[#a40000]"
      : tone === "olive"
        ? "bg-[#f6f4ea] text-[#7a6500]"
        : "bg-[#f5f5f5] text-[#8d6d00]";

  return (
    <span className={`flex h-11 w-11 items-center justify-center rounded-full ${toneClass}`}>
      {type === "metric" ? (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="2" />
        </svg>
      ) : type === "shield" ? (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path
            d="M12 3.5c2.2 1.75 4.75 2.63 7.5 2.63v5.06c0 5.3-3.34 8.38-7.5 9.73-4.16-1.35-7.5-4.43-7.5-9.73V6.13c2.75 0 5.3-.88 7.5-2.63Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="m9.5 11.8 1.7 1.7 3.3-3.6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path d="M4 12h16M12 4v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

function ScoreCircle({ value }: { value: string }) {
  return (
    <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-[9px] border-[#7a6500] bg-[#fffdf7] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)]">
      <div className="absolute inset-[9px] rounded-full border-[9px] border-[#ece7d3]" />
      <div className="relative text-center">
        <div className="text-[2.05rem] font-semibold tracking-[-0.05em] text-[#171717]">
          {value}
        </div>
        <div className="text-[0.98rem] font-semibold text-[#171717]">/100</div>
      </div>
    </div>
  );
}
