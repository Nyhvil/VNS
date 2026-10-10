-- Add "list" section type for public content CMS
DO $$
BEGIN
  ALTER TYPE public_section_type ADD VALUE IF NOT EXISTS 'list';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
