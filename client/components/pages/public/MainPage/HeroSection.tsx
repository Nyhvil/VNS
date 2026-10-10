"use client";

import Image from "next/image";
import Link from "next/link";
import type { PublicSectionWithItems } from "./types";
import RichText from "./RichText";
import { asText, normalizeQuillHtml } from "./utils";

export default function HeroSection({ section }: { section: PublicSectionWithItems }) {
  const badge = asText(section.content?.badge);
  const primaryCtaLabel = asText(section.content?.primaryCtaLabel) ?? "Try MailGuard Now";
  const primaryCtaHref = asText(section.content?.primaryCtaHref) ?? "/register";
  const secondaryCtaLabel = asText(section.content?.secondaryCtaLabel) ?? "See How It Works";
  const secondaryCtaHref = asText(section.content?.secondaryCtaHref) ?? "#how";
  const trustItems = ((section.content?.trustItems as string[] | undefined) ?? [
    "No installation",
    "100% Free",
    "Instant results",
  ]).filter(Boolean);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-center">
      <div className="min-w-0 space-y-5">
        {badge ? (
          <RichText
            tag="p"
            className="inline-flex rounded-full border border-[#e7d8b5] bg-[#fff8ea] px-4 py-2 text-[0.95rem] font-semibold text-[#7a5b00]"
            html={badge}
          />
        ) : null}

        {section.title ? (
          <RichText
            tag="div"
            className="max-w-full whitespace-normal break-normal text-left text-[56px] leading-[1.08] font-extrabold tracking-[-0.03em] text-[#111827] xl:text-[64px]"
            html={normalizeQuillHtml(section.title)}
          />
        ) : null}
        {section.subtitle ? (
          <RichText
            tag="div"
            className="max-w-full whitespace-normal break-normal text-left text-[1.1rem] leading-8 text-[#3f4b5a]"
            html={normalizeQuillHtml(section.subtitle)}
          />
        ) : null}

        <div className="flex flex-wrap gap-4">
          <Link
            href={primaryCtaHref}
            className="rounded-2xl bg-[#f4bf2a] px-8 py-4 text-lg font-semibold text-[#111827] shadow-[0_10px_24px_rgba(244,191,42,0.35)]"
          >
            <span dangerouslySetInnerHTML={{ __html: primaryCtaLabel }} />
          </Link>
          <Link
            href={secondaryCtaHref}
            className="rounded-2xl border border-[#d7d7d7] bg-white px-8 py-4 text-lg font-semibold text-[#111827]"
          >
            <span dangerouslySetInnerHTML={{ __html: secondaryCtaLabel }} />
          </Link>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-3 text-base text-[#3f4b5a]">
          {trustItems.map((item) => (
            <span key={item} className="inline-flex items-center gap-2.5">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#f0bf2f] text-[#f0bf2f]">✓</span>
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="hero-visual-container relative mt-8 h-105 w-full max-w-105 justify-self-end lg:mt-0 lg:w-115">
        <div className="hero-float-slow absolute right-0 top-8 h-80 w-80 rounded-[30px] bg-[linear-gradient(145deg,#f5c32d,#ffd95a)] shadow-[0_25px_60px_rgba(233,179,41,0.35)]">
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/img/Logo.png"
              alt="MailGuard Logo"
              width={112}
              height={112}
              className="h-28 w-28 rounded-3xl object-cover shadow-[0_10px_20px_rgba(20,20,20,0.18)]"
            />
          </div>
        </div>
        <div className="hero-float-fast absolute -right-2 top-0 rounded-[18px] border border-[#dfd8ca] bg-white p-5 shadow-[0_10px_25px_rgba(15,23,42,0.12)]">
          <span className="text-4xl text-[#f0bf2f]">✉</span>
        </div>
        <div className="hero-float-fast absolute -right-7 top-57.5 rounded-[18px] border border-[#f3c5c5] bg-[#fff2f2] p-4 shadow-[0_10px_22px_rgba(15,23,42,0.10)]">
          <span className="text-3xl text-[#eb6f6f]">⚠</span>
        </div>
        <div className="hero-float-mid absolute left-1.5 top-71.25 rounded-[18px] border border-[#d8d8d8] bg-white p-4 shadow-[0_10px_22px_rgba(15,23,42,0.12)]">
          <span className="text-3xl text-[#22c55e]">🔒</span>
        </div>
        <div className="hero-float-mid absolute left-23.75 top-73.75 rounded-[18px] border border-[#d8d8d8] bg-white px-5 py-3 shadow-[0_10px_22px_rgba(15,23,42,0.12)]">
          <p className="text-5xl font-bold text-[#f0bf2f]">98%</p>
          <p className="text-base text-[#6b7280]">Accuracy</p>
        </div>
        <div className="hero-float-mid absolute left-58 top-73.75 rounded-[18px] border border-[#d8d8d8] bg-white px-5 py-3 shadow-[0_10px_22px_rgba(15,23,42,0.12)]">
          <p className="text-5xl font-bold text-[#f0bf2f]">&lt;3s</p>
          <p className="text-base text-[#6b7280]">Analysis</p>
        </div>
      </div>

      <style jsx>{`
        .hero-visual-container {
          overflow: visible;
        }
        .hero-float-slow { animation: heroFloat 5.5s ease-in-out infinite; }
        .hero-float-mid { animation: heroFloat 4.3s ease-in-out infinite; }
        .hero-float-fast { animation: heroFloat 3.6s ease-in-out infinite; }
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-9px); }
        }
      `}</style>
    </div>
  );
}
