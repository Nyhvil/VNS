export enum PublicSectionType {
  HERO = 'hero',
  CARDS = 'cards',
  LIST = 'list',
  COMPARED = 'compared',
  CTA = 'cta',
  CUSTOM = 'custom',
}

export type PublicSectionsRow = {
  id: string;
  page_id: string;
  key: string;
  type: PublicSectionType;
  title: string | null;
  subtitle: string | null;
  content: Record<string, unknown>;
  order_index: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};
