import Link from "next/link";
import type { PublicSectionWithItems } from "./types";
import PublicItemIcon from "./PublicItemIcon";
import RichText from "./RichText";
import { normalizeQuillHtml } from "./utils";

export default function CardsSection({ section }: { section: PublicSectionWithItems }) {
  const columns = readPositiveInt(section.content?.columns, 3);
  const rows = readPositiveInt(section.content?.rows, 3);
  const showOrder = asBoolean(section.content?.showOrder, false);
  const visibleItems = section.items.slice(0, columns * rows);

  return (
    <div className="mt-6 grid gap-4 p-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {visibleItems.map((item, index) => (
        <article key={item.id} className={`rounded-2xl border p-5 ${severityBorder(item.meta)} ${itemBackgroundClass(item.meta)}`}>
          <div className="mb-2 flex items-center justify-between gap-2">
            {showOrder ? (
              <span className="inline-flex min-w-12 items-center justify-center rounded-full bg-[#f4bf2a] px-3 py-1 text-[0.95rem] font-semibold text-[#0f172a]">
                {String(index + 1).padStart(2, "0")}
              </span>
            ) : (
              <span />
            )}
            {shouldRenderMetaDots(item.meta) ? (
              <div className="flex items-center gap-2">
                {isHighlighted(item.meta) ? (
                  <span
                    title="Nổi bật"
                    className="inline-flex h-3 w-3 rounded-full bg-[#f4bf2a]"
                  />
                ) : null}
                {hasSeverityDot(item.meta) ? (
                  <span title="Mức độ" className={`inline-flex h-3 w-3 rounded-full ${severityDot(item.meta)}`} />
                ) : null}
              </div>
            ) : null}
          </div>

          {item.icon ? (
            <div className={`flex ${iconAlignClass(item.meta)}`}>
              <span className={`inline-flex h-10 w-10 items-center justify-center text-[#7a5b00] ${iconBackgroundClass(item.meta)}`}>
                <PublicItemIcon name={item.icon} className="h-5 w-5" />
              </span>
            </div>
          ) : null}

          {item.title ? (
            <RichText
              tag="div"
              className={`line-clamp-2 mt-2 text-base font-semibold leading-7 text-[#111827] ${titleAlignClass(item.meta)}`}
              html={normalizeQuillHtml(item.title)}
            />
          ) : null}

          {item.description ? (
            <RichText
              tag="div"
              className="mt-2 pr-5 text-justify text-sm leading-7 text-[#4b5563]"
              html={normalizeQuillHtml(item.description)}
            />
          ) : null}

          {item.link_url ? (
            <Link href={item.link_url} className="mt-3 inline-flex text-sm font-semibold text-[#7a5b00]">
              Xem thêm
            </Link>
          ) : null}
        </article>
      ))}
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

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}

function isHighlighted(meta: unknown): boolean {
  if (!meta || typeof meta !== "object") return false;
  return (meta as Record<string, unknown>).highlighted === true;
}

function severity(meta: unknown): string {
  if (!meta || typeof meta !== "object") return "medium";
  const value = (meta as Record<string, unknown>).severity;
  return typeof value === "string" ? value : "medium";
}

function hasSeverityDot(meta: unknown): boolean {
  return severity(meta) !== "none";
}

function shouldRenderMetaDots(meta: unknown): boolean {
  return isHighlighted(meta) || hasSeverityDot(meta);
}

function severityDot(meta: unknown): string {
  const value = severity(meta);
  if (value === "low") return "bg-[#22c55e]";
  if (value === "high") return "bg-[#f97316]";
  if (value === "critical") return "bg-[#ef4444]";
  return "bg-[#f4bf2a]";
}

function severityBorder(meta: unknown): string {
  const value = severity(meta);
  if (value === "low") return "border-[#bbf7d0]";
  if (value === "high") return "border-[#fed7aa]";
  if (value === "critical") return "border-[#fecaca]";
  return "border-[#fde68a]";
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

function iconAlignClass(meta: unknown): string {
  if (!meta || typeof meta !== "object") return "justify-start";
  const value = (meta as Record<string, unknown>).iconAlign;
  if (value === "center") return "justify-center";
  if (value === "right") return "justify-end";
  return "justify-start";
}

function titleAlignClass(meta: unknown): string {
  if (!meta || typeof meta !== "object") return "text-left";
  const value = (meta as Record<string, unknown>).titleAlign;
  if (value === "center") return "text-center";
  if (value === "right") return "text-right";
  return "text-left";
}

function iconBackgroundClass(meta: unknown): string {
  if (!meta || typeof meta !== "object") return "rounded-xl bg-[#fff8ea]";
  const value = (meta as Record<string, unknown>).iconBackground;
  if (value === false) return "";
  return "rounded-xl bg-[#fff8ea]";
}
