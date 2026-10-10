export enum PublicPageStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export type PublicPagesRow = {
  id: string;
  slug: string;
  name: string;
  status: PublicPageStatus;
  created_at: Date;
  updated_at: Date;
};
