export type PublicSectionItemsRow = {
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
  created_at: Date;
  updated_at: Date;
};
