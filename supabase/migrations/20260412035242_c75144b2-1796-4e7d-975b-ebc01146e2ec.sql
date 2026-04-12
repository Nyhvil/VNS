
CREATE TABLE public.mailguard_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_id TEXT NOT NULL,
  user_id TEXT,
  text_length INTEGER NOT NULL DEFAULT 0,
  scam_percent INTEGER NOT NULL DEFAULT 0,
  feedback TEXT
);

ALTER TABLE public.mailguard_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert logs"
ON public.mailguard_logs
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can update feedback"
ON public.mailguard_logs
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);
