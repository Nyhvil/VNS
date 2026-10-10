"use client";

import { useEffect, useState } from "react";
import {
  getPublicContentBySlug,
} from "@/services/api/publicContentService";
import RichText from "./RichText";
import SectionContent from "./SectionContent";
import type { PublicSectionWithItems } from "./types";

export default function MainPageContainer() {
  const [sections, setSections] = useState<PublicSectionWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const preferredSlug = process.env["NEXT_PUBLIC_PUBLIC_PAGE_SLUG"]?.trim() || "";
      const slugCandidates = Array.from(new Set([preferredSlug, "landing_page", "home"].filter((v) => v.length > 0)));

      let loaded = false;
      let lastError = "Không tìm thấy public page.";

      for (const slug of slugCandidates) {
        const res = await getPublicContentBySlug(slug);
        if (!mounted) return;
        if (res.ok) {
          setSections(res.data.sections.filter((s) => s.is_active));
          loaded = true;
          break;
        }
        lastError = res.error.message;
      }

      if (!loaded) setError(lastError);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <main className="mx-auto w-full max-w-310 px-5 pb-12 pt-8 sm:px-8 lg:px-10">Đang tải nội dung...</main>;
  }

  if (error) {
    return <main className="mx-auto w-full max-w-310 px-5 pb-12 pt-8 sm:px-8 lg:px-10 text-[#b42318]">{error}</main>;
  }

  return (
    <main className="mx-auto w-full max-w-310 space-y-10 px-5 pb-12 pt-8 sm:px-8 lg:px-10">
      {sections.map((section) => (
        <section key={section.id} id={section.key} className="rounded-2xl text-center bg-white p-6 shadow-[0_8px_20px_rgba(20,20,20,0.05)]">
          {section.type !== "hero" && section.type !== "cta" && section.title ? (
            <RichText tag="h2" className="text-3xl font-semibold tracking-[-0.02em] text-[#101828]" html={section.title} />
          ) : null}
          {section.type !== "hero" && section.type !== "cta" && section.subtitle ? (
            <RichText tag="p" className="mt-2 scale-[1.1] text-sm leading-7 text-[#4b5563]" html={section.subtitle} />
          ) : null}
          <SectionContent section={section} />
        </section>
      ))}
      <style jsx global>{`
        .rich-text,
        .rich-text * {
          max-width: 100%;
          white-space: normal !important;
          word-break: normal !important;
          overflow-wrap: break-word !important;
          hyphens: manual !important;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </main>
  );
}
