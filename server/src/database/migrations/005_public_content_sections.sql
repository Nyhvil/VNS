-- ============================================================
-- Migration: public pages/sections/items CMS tables
-- ============================================================

-- Enum for public page publish status
DO $$ BEGIN
  CREATE TYPE public_page_status AS ENUM (
    'draft',
    'published'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Enum for public section type
DO $$ BEGIN
  CREATE TYPE public_section_type AS ENUM (
    'hero',
    'cards',
    'cta',
    'custom'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Table: public_pages
-- ============================================================
CREATE TABLE IF NOT EXISTS public_pages (
  id          UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT               NOT NULL UNIQUE,
  name        TEXT               NOT NULL,
  status      public_page_status NOT NULL DEFAULT 'draft',
  created_at  TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Table: public_sections
-- ============================================================
CREATE TABLE IF NOT EXISTS public_sections (
  id           UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id      UUID                NOT NULL REFERENCES public_pages(id) ON DELETE CASCADE,
  key          TEXT                NOT NULL,
  type         public_section_type NOT NULL,
  title        TEXT,
  subtitle     TEXT,
  content      JSONB               NOT NULL DEFAULT '{}'::jsonb,
  order_index  INT                 NOT NULL DEFAULT 0,
  is_active    BOOLEAN             NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_public_sections_page_key UNIQUE (page_id, key)
);

-- ============================================================
-- Table: public_section_items
-- ============================================================
CREATE TABLE IF NOT EXISTS public_section_items (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id   UUID         NOT NULL REFERENCES public_sections(id) ON DELETE CASCADE,
  title        TEXT,
  description  TEXT,
  icon         TEXT,
  image_url    TEXT,
  link_url     TEXT,
  meta         JSONB        NOT NULL DEFAULT '{}'::jsonb,
  order_index  INT          NOT NULL DEFAULT 0,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_public_pages_status
  ON public_pages(status);

CREATE INDEX IF NOT EXISTS idx_public_sections_page
  ON public_sections(page_id);

CREATE INDEX IF NOT EXISTS idx_public_sections_page_order
  ON public_sections(page_id, order_index);

CREATE INDEX IF NOT EXISTS idx_public_sections_active
  ON public_sections(is_active);

CREATE INDEX IF NOT EXISTS idx_public_section_items_section
  ON public_section_items(section_id);

CREATE INDEX IF NOT EXISTS idx_public_section_items_section_order
  ON public_section_items(section_id, order_index);

CREATE INDEX IF NOT EXISTS idx_public_section_items_active
  ON public_section_items(is_active);

CREATE INDEX IF NOT EXISTS idx_public_sections_content_gin
  ON public_sections USING GIN (content);

CREATE INDEX IF NOT EXISTS idx_public_section_items_meta_gin
  ON public_section_items USING GIN (meta);
