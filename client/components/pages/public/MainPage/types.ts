import type { PublicSectionDto, PublicSectionItemDto } from "@/services/api/publicContentService";

export type PublicSectionWithItems = PublicSectionDto & { items: PublicSectionItemDto[] };
