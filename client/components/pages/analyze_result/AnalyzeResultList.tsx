import AnalyzeResultCard from "@/components/pages/analyze_result/AnalyzeResultCard";
import type { AnalyzeResultListItem } from "@/types/analyzeResult";

type AnalyzeResultListProps = {
  items: AnalyzeResultListItem[];
};

export default function AnalyzeResultList({ items }: AnalyzeResultListProps) {
  return (
    <section className="mg-panel-enter rounded-[30px] border border-white/[0.7] bg-white/[0.76] px-5 py-5 shadow-[0_18px_36px_rgba(15,23,42,0.05)] backdrop-blur sm:px-6 sm:py-6">
      <div className="flex flex-col gap-3 border-b border-[#edf1f5] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex rounded-full bg-[#f4f7fb] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#738091]">
            Result list
          </span>
          <h2 className="mt-3 text-[1.6rem] font-semibold tracking-[-0.05em] text-[#111827]">
            Danh sách kết quả
          </h2>
        </div>
        <p className="text-[0.95rem] text-[#64748b]">{items.length} bản phân tích</p>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {items.map((item) => (
          <AnalyzeResultCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
