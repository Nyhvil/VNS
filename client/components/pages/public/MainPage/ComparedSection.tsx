import PublicItemIcon from "./PublicItemIcon";
import RichText from "./RichText";
import type { PublicSectionWithItems } from "./types";
import { asText, normalizeQuillHtml } from "./utils";

export default function ComparedSection({ section }: { section: PublicSectionWithItems }) {
  const content = (section.content ?? {}) as Record<string, unknown>;
  const leftTitle = asText(content.leftTitle) ?? "<strong>Không có MailGuard</strong>";
  const rightTitle = asText(content.rightTitle) ?? "<strong>Với MailGuard</strong>";
  const rightBadge = asText(content.rightBadge) ?? "<strong>Khuyến khích</strong>";

  const configuredLeft = section.items.filter((item) => readSide(item.meta) === "left");
  const configuredRight = section.items.filter((item) => readSide(item.meta) === "right");
  const hasAnySideConfigured = section.items.some((item) => readSide(item.meta) !== null);
  const fallbackSplitIndex = Math.ceil(section.items.length / 2);
  const leftItems = hasAnySideConfigured
    ? configuredLeft
    : section.items.slice(0, fallbackSplitIndex);
  const rightItems = hasAnySideConfigured
    ? configuredRight
    : section.items.slice(fallbackSplitIndex);

  return (
    <div className="mt-6 space-y-5 text-left">
      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-3xl border border-[#e6d7d3] bg-[#f8f4f4] p-6">
          <div className="flex items-center gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3dfe2] text-[#e11d48]">
              <CompareIcon tone="left" />
            </span>
            <RichText
              tag="h3"
              className="text-[2rem] font-semibold tracking-[-0.03em] text-[#0f172a]"
              html={normalizeQuillHtml(leftTitle)}
            />
          </div>
          <div className="mt-6 space-y-4">
            {leftItems.map((item) => (
              <ComparedBullet key={item.id} item={item} tone="left" />
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-[#efd389] bg-[#fffaf0] p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f7e7bf] text-[#eab308]">
                <CompareIcon tone="right" />
              </span>
              <RichText
                tag="h3"
                className="text-[2rem] font-semibold tracking-[-0.03em] text-[#0f172a]"
                html={normalizeQuillHtml(rightTitle)}
              />
            </div>
            <div className="inline-flex rounded-full bg-[#f4bf2a] px-5 py-2 text-[1rem] font-semibold uppercase text-[#0f172a]">
              <RichText
                tag="div"
                className="leading-none text-[1rem] font-semibold uppercase text-[#0f172a]"
                html={normalizeQuillHtml(rightBadge)}
              />
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {rightItems.map((item) => (
              <ComparedBullet key={item.id} item={item} tone="right" />
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}

function ComparedBullet({
  item,
  tone,
}: {
  item: PublicSectionWithItems["items"][number];
  tone: "left" | "right";
}) {
  const textAlignClass = titleAlignClass(item.meta);
  const iconColor = tone === "right" ? "text-[#eab308]" : "text-[#e11d48]";
  const markerBg = tone === "right" ? "bg-[#f7e7bf]" : "bg-[#f3dfe2]";

  return (
    <div className="flex items-start gap-3">
      <span className={`mt-1 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full ${markerBg} ${iconColor}`}>
        {item.icon ? <PublicItemIcon name={item.icon} className="h-3.5 w-3.5" /> : <CompareDot tone={tone} />}
      </span>
      <div className={`min-w-0 ${textAlignClass}`}>
        {item.title ? (
          <RichText
            tag="div"
            className={`text-[1.02rem] font-semibold leading-8 text-[#0f172a] ${textAlignClass}`}
            html={normalizeQuillHtml(item.title)}
          />
        ) : null}
        {item.description ? (
          <RichText
            tag="div"
            className={`mt-1 text-[1rem] leading-8 text-[#475467] ${textAlignClass}`}
            html={normalizeQuillHtml(item.description)}
          />
        ) : null}
      </div>
    </div>
  );
}

function readSide(meta: unknown): "left" | "right" | null {
  if (!meta || typeof meta !== "object") return null;
  const value = String((meta as Record<string, unknown>).side ?? "")
    .trim()
    .toLowerCase();

  if (value === "left" || value === "trái" || value === "cot trai" || value === "cột trái") {
    return "left";
  }
  if (value === "right" || value === "phải" || value === "cot phai" || value === "cột phải") {
    return "right";
  }
  return null;
}

function titleAlignClass(meta: unknown): string {
  if (!meta || typeof meta !== "object") return "text-left";
  const value = (meta as Record<string, unknown>).titleAlign;
  if (value === "center") return "text-center";
  if (value === "right") return "text-right";
  return "text-left";
}

function CompareIcon({ tone }: { tone: "left" | "right" }) {
  if (tone === "right") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <path d="m5 12 4 4 10-10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function CompareDot({ tone }: { tone: "left" | "right" }) {
  return <span className={`inline-flex h-2.5 w-2.5 rounded-full ${tone === "right" ? "bg-[#eab308]" : "bg-[#e11d48]"}`} />;
}
