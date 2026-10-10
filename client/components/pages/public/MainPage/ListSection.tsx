import type { PublicSectionWithItems } from "./types";
import PublicItemIcon from "./PublicItemIcon";
import RichText from "./RichText";
import { asText, normalizeQuillHtml } from "./utils";

export default function ListSection({ section }: { section: PublicSectionWithItems }) {
  const score = asNumber(section.content?.score) ?? 87;
  const headerLabel = asText(section.content?.label) ?? "Kết quả phân tích MailGuard";
  const detailLabel = asText(section.content?.detailLabel) ?? "Chi tiết phân tích";
  const columns = readPositiveInt(section.content?.columns, 3);
  const rows = readPositiveInt(section.content?.rows, 3);

  const primaryItem = section.items[0];
  const topTitle = primaryItem?.title ?? null;
  const topDescription = primaryItem?.description ?? null;
  const primaryTextAlignClass = titleAlignClass(primaryItem?.meta);
  const listItems = section.items.slice(1, 1 + columns * rows);

  return (
    <div className="mt-6 space-y-4">
      <div className="overflow-hidden rounded-2xl border border-[#eadfcb] bg-white">
        <div className="flex items-center gap-2 border-b border-[#eadfcb] bg-[#fcf8ef] px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-[#f87171]" />
          <span className="h-3 w-3 rounded-full bg-[#fbbf24]" />
          <span className="h-3 w-3 rounded-full bg-[#4ade80]" />
          <p className="text-sm font-medium text-[#4b5563]">{headerLabel}</p>
        </div>

        <div className="space-y-4 p-4">
          <article className={`rounded-2xl border p-5 ${severityBlockClass(primaryItem?.meta)} ${itemBackgroundClass(primaryItem?.meta)}`}>
            <div className="flex gap-4">
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-[6px] border-current">
                <span className="text-center text-4xl font-extrabold leading-none">{score}%</span>
                <span className="absolute -bottom-6 text-xs font-semibold uppercase tracking-[0.08em]">Rủi ro</span>
              </div>
              <div className={`min-w-0 flex-1 ${primaryTextAlignClass}`}>
                {topTitle ? (
                  <RichText
                    tag="div"
                    className={`text-3xl font-bold leading-tight ${primaryTextAlignClass}`}
                    html={normalizeQuillHtml(topTitle)}
                  />
                ) : null}
                {topDescription ? (
                  <RichText
                    tag="div"
                    className={`mt-2 text-lg leading-8 text-[#374151] ${primaryTextAlignClass}`}
                    html={normalizeQuillHtml(topDescription)}
                  />
                ) : null}
              </div>
            </div>
          </article>

          <p className="text-3xl font-semibold text-[#111827]">{detailLabel}</p>

          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {listItems.map((item) => (
              <article key={item.id} className={`rounded-2xl border px-4 py-3 ${severityRowClass(item.meta)} ${itemBackgroundClass(item.meta)}`}>
                <div className="flex items-start gap-3">
                  {hasSeverityDot(item.meta) ? (
                    <span className={`mt-1 inline-flex h-2.5 w-2.5 rounded-full ${severityDotClass(item.meta)}`} />
                  ) : null}
                  {item.icon ? (
                    <span className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center text-[#7a5b00] ${iconBackgroundClass(item.meta)}`}>
                      <PublicItemIcon name={item.icon} className="h-4 w-4" />
                    </span>
                  ) : null}
                  <div className="min-w-0">
                    {item.title ? (
                      <RichText
                        tag="div"
                        className={`text-base font-semibold leading-7 text-[#111827] ${titleAlignClass(item.meta)}`}
                        html={normalizeQuillHtml(item.title)}
                      />
                    ) : null}
                    {item.description ? (
                      <RichText
                        tag="div"
                        className={`mt-1 text-sm leading-7 text-[#4b5563] ${titleAlignClass(item.meta)}`}
                        html={normalizeQuillHtml(item.description)}
                      />
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function readPositiveInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(1, Math.floor(value));
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(1, Math.floor(parsed));
  }
  return fallback;
}

function severity(meta: unknown): "none" | "low" | "medium" | "high" | "critical" {
  if (!meta || typeof meta !== "object") return "medium";
  const value = (meta as Record<string, unknown>).severity;
  if (value === "none" || value === "low" || value === "medium" || value === "high" || value === "critical") return value;
  return "medium";
}

function hasSeverityDot(meta: unknown): boolean {
  return severity(meta) !== "none";
}

function severityDotClass(meta: unknown): string {
  const value = severity(meta);
  if (value === "low") return "bg-[#22c55e]";
  if (value === "high") return "bg-[#f97316]";
  if (value === "critical") return "bg-[#ef4444]";
  return "bg-[#f4bf2a]";
}

function severityRowClass(meta: unknown): string {
  const value = severity(meta);
  if (value === "low") return "border-[#bbf7d0]";
  if (value === "high") return "border-[#fed7aa]";
  if (value === "critical") return "border-[#fecaca]";
  return "border-[#fde68a]";
}

function severityBlockClass(meta: unknown): string {
  const value = severity(meta);
  if (value === "low") return "border-[#86efac] text-[#166534]";
  if (value === "high") return "border-[#fdba74] text-[#9a3412]";
  if (value === "critical") return "border-[#fca5a5] text-[#b91c1c]";
  return "border-[#fde68a] text-[#92400e]";
}

function itemBackgroundClass(meta: unknown): string {
  if (!meta || typeof meta !== "object") return "bg-white";
  const value = (meta as Record<string, unknown>).background;
  if (value === "blue") return "bg-[#eff6ff]";
  if (value === "green") return "bg-[#ecfdf3]";
  if (value === "amber") return "bg-[#fffbeb]";
  if (value === "rose") return "bg-[#fff1f2]";
  return "bg-white";
}

function titleAlignClass(meta: unknown): string {
  if (!meta || typeof meta !== "object") return "text-left";
  const value = (meta as Record<string, unknown>).titleAlign;
  if (value === "center") return "text-center";
  if (value === "right") return "text-right";
  return "text-left";
}

function iconBackgroundClass(meta: unknown): string {
  if (!meta || typeof meta !== "object") return "rounded-lg bg-[#fff8ea]";
  const value = (meta as Record<string, unknown>).iconBackground;
  if (value === false) return "";
  return "rounded-lg bg-[#fff8ea]";
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
