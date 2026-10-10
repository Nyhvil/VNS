import type { ApiResult } from "./types";

const BASE_URL = (process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:5000/api").replace(/\/+$/, "");

export type PublicPageDto = {
  id: string;
  slug: string;
  name: string;
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
};

export type PublicSectionDto = {
  id: string;
  page_id: string;
  key: string;
  type: "hero" | "cards" | "cta" | "list" | "compared" | "custom";
  title: string | null;
  subtitle: string | null;
  content: Record<string, unknown>;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PublicSectionItemDto = {
  id: string;
  section_id: string;
  title: string | null;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  link_url: string | null;
  meta: Record<string, unknown>;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PublicContentData = {
  page: PublicPageDto;
  sections: Array<PublicSectionDto & { items: PublicSectionItemDto[] }>;
};

export async function getPublicContentBySlug(
  slug: string,
): Promise<ApiResult<PublicContentData>> {
  try {
    const pageRes = await fetch(`${BASE_URL}/public_pages/slug/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (!pageRes.ok) {
      return { ok: false, error: { type: "not_found", message: "Không tìm thấy public page.", status: pageRes.status } };
    }
    const page = (await pageRes.json()) as PublicPageDto;

    const sectionRes = await fetch(`${BASE_URL}/public_sections/page/${page.id}`, {
      cache: "no-store",
    });
    if (!sectionRes.ok) {
      return { ok: false, error: { type: "server_error", message: "Không tải được sections.", status: sectionRes.status } };
    }
    const sections = (await sectionRes.json()) as PublicSectionDto[];

    const sectionsWithItems = await Promise.all(
      sections.map(async (section) => {
        const itemRes = await fetch(`${BASE_URL}/public_section_items/section/${section.id}`, {
          cache: "no-store",
        });
        if (!itemRes.ok) return { ...section, items: [] as PublicSectionItemDto[] };
        const items = (await itemRes.json()) as PublicSectionItemDto[];
        return { ...section, items };
      }),
    );

    sectionsWithItems.sort((a, b) => a.order_index - b.order_index);
    sectionsWithItems.forEach((s) => s.items.sort((a, b) => a.order_index - b.order_index));

    return { ok: true, data: { page, sections: sectionsWithItems } };
  } catch {
    return {
      ok: false,
      error: { type: "network_error", message: "Không thể kết nối đến server." },
    };
  }
}
