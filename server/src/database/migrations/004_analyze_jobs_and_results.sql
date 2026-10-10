-- ============================================================
-- Migration: analyze_jobs and analyze_results tables
-- ============================================================

-- Enum for job status
DO $$ BEGIN
  CREATE TYPE analyze_job_status AS ENUM (
    'pending',
    'processing',
    'success',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Table: analyze_jobs
-- Tracks each pipeline call made for a scan_request
-- ============================================================

CREATE TABLE IF NOT EXISTS analyze_jobs (
  id            TEXT        PRIMARY KEY DEFAULT 'job-' || gen_random_uuid(),
  scan_id       TEXT        NOT NULL REFERENCES scan_requests(id) ON DELETE CASCADE,
  job_id        UUID        NOT NULL UNIQUE,          -- UUID sent to pipeline
  status        analyze_job_status NOT NULL DEFAULT 'pending',
  input_type    TEXT        NOT NULL,
  pipeline_url  TEXT,
  error_message TEXT,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyze_jobs_scan_id   ON analyze_jobs(scan_id);
CREATE INDEX IF NOT EXISTS idx_analyze_jobs_job_id    ON analyze_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_analyze_jobs_status    ON analyze_jobs(status);
CREATE INDEX IF NOT EXISTS idx_analyze_jobs_created   ON analyze_jobs(created_at DESC);

-- ============================================================
-- Table: analyze_results
-- Stores the structured result returned by the pipeline
-- ============================================================

CREATE TABLE IF NOT EXISTS analyze_results (
  id              TEXT        PRIMARY KEY DEFAULT 'ares-' || gen_random_uuid(),
  job_id          TEXT        NOT NULL REFERENCES analyze_jobs(id) ON DELETE CASCADE,
  scan_id         TEXT        NOT NULL REFERENCES scan_requests(id) ON DELETE CASCADE,
  risk_score      SMALLINT    NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level      TEXT        NOT NULL,               -- 'low' | 'medium' | 'high' | 'critical'
  category        TEXT        NOT NULL,               -- 'phishing' | 'spam' | 'suspicious' | 'safe'
  findings        JSONB       NOT NULL DEFAULT '[]',
  evidence        JSONB       NOT NULL DEFAULT '{}',
  recommendation  TEXT,
  raw_response    JSONB       NOT NULL DEFAULT '{}',  -- full pipeline response for debugging
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyze_results_job_id   ON analyze_results(job_id);
CREATE INDEX IF NOT EXISTS idx_analyze_results_scan_id  ON analyze_results(scan_id);
CREATE INDEX IF NOT EXISTS idx_analyze_results_category ON analyze_results(category);
CREATE INDEX IF NOT EXISTS idx_analyze_results_created  ON analyze_results(created_at DESC);

-- GIN index for JSONB search on findings
CREATE INDEX IF NOT EXISTS idx_analyze_results_findings_gin ON analyze_results USING GIN (findings);
