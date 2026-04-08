
-- Create scans table
CREATE TABLE public.scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  type text NOT NULL,
  content_text text,
  image_url text,
  risk_level text NOT NULL,
  ai_result text NOT NULL,
  dangerous_phrases text[] DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts
CREATE POLICY "Anyone can insert scans" ON public.scans
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Create storage bucket for uploaded images
INSERT INTO storage.buckets (id, name, public)
VALUES ('scan-images', 'scan-images', true);

-- Allow anyone to upload scan images
CREATE POLICY "Anyone can upload scan images"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'scan-images');

-- Allow anyone to read scan images
CREATE POLICY "Anyone can read scan images"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'scan-images');
