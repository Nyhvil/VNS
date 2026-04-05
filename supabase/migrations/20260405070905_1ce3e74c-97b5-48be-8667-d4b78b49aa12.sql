CREATE TABLE public.analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_id TEXT NOT NULL,
  email_content TEXT NOT NULL,
  risk_percentage INTEGER NOT NULL,
  explanation TEXT NOT NULL,
  detected_keywords TEXT[] DEFAULT '{}'
);

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analyses"
  ON public.analyses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read analyses"
  ON public.analyses
  FOR SELECT
  TO anon, authenticated
  USING (true);