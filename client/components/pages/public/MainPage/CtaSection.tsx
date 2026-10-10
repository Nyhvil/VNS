import Link from "next/link";
import Image from "next/image";
import RichText from "./RichText";
import type { PublicSectionWithItems } from "./types";
import { asText, normalizeQuillHtml } from "./utils";

export default function CtaSection({ section }: { section: PublicSectionWithItems }) {
  const title =
    asText(section.title) ??
    "<strong>Hãy bắt đầu bảo vệ bản thân khỏi các email lừa đảo ngay hôm nay!</strong>";
  const subtitle =
    asText(section.subtitle) ??
    "Hãy tham gia cùng hàng nghìn người dùng Việt Nam khác đã tin tưởng MailGuard để bảo vệ hộp thư đến của họ.";
  const ctaLabel = asText(section.content?.ctaLabel) ?? "Hãy dùng thử MailGuard miễn phí!";
  const ctaHref = asText(section.content?.ctaHref) ?? "/register";
  const ctaSecondaryLabel = asText(section.content?.ctaSecondaryLabel) ?? "Tìm hiểu thêm";
  const ctaSecondaryHref = asText(section.content?.ctaSecondaryHref) ?? "#how";
  const ctaSmallNote =
    asText(section.content?.ctaSmallNote) ??
    "Không cần thẻ tín dụng · Miễn phí vĩnh viễn · Kết quả tức thì";
  const ctaBackgroundColor = asText(section.content?.ctaBackgroundColor) ?? "#f4c33f";

  return (
    <div
      className="mt-3 rounded-[34px] scale-[0.8] px-6 py-8 text-center shadow-[0_10px_26px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10"
      style={{ backgroundColor: ctaBackgroundColor }}
    >
      <div className="mx-auto flex scale-[1.2] h-20 w-20 items-center justify-center rounded-[22px] bg-white/26 text-[#0f172a]">
        <Image src="/img/Logo.png" alt="MailGuard logo" width={36} height={36} className="scale-[1.9] rounded-2xl h-9 w-9 object-contain" />
      </div>

      <RichText
        tag="h3"
        className="mx-auto mt-6 max-w-4xl text-[2.2rem] pl-9 pr-9 font-semibold leading-[1.1] tracking-[-0.04em] text-[#0f172a] sm:text-[3.2rem]"
        html={normalizeQuillHtml(title)}
      />
      <RichText
        tag="div"
        className="mx-auto mt-5 max-w-3xl text-[1.1rem] leading-10 text-[#1f2937] sm:text-[1.15rem]"
        html={normalizeQuillHtml(subtitle)}
      />

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          href={ctaHref}
          className="inline-flex min-h-15 items-center justify-center rounded-2xl bg-white px-8 text-[1.9rem] font-semibold text-[#f0ac00] shadow-[0_14px_30px_rgba(15,23,42,0.12)]"
        >
          <span dangerouslySetInnerHTML={{ __html: normalizeQuillHtml(ctaLabel) }} />
          <span className="ml-4 text-[2rem]">→</span>
        </Link>
        <Link
          href={ctaSecondaryHref}
          className="inline-flex min-h-15 items-center justify-center rounded-2xl border border-white/55 px-8 text-[1.9rem] font-semibold text-[#0f172a]"
        >
          <span dangerouslySetInnerHTML={{ __html: normalizeQuillHtml(ctaSecondaryLabel) }} />
        </Link>
      </div>

      <RichText
        tag="div"
        className="mx-auto mt-6 max-w-3xl text-[0.95rem] leading-7 text-[#4b5563] sm:text-[1rem]"
        html={normalizeQuillHtml(ctaSmallNote)}
      />
    </div>
  );
}
