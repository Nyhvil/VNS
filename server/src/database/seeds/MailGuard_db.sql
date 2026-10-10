-- =========================================================
-- MailGuard Database Schema
-- PostgreSQL + pgcrypto + optional pgvector
-- ID format: xxx-uuidv4
-- Example: usr-550e8400-e29b-41d4-a716-446655440000
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- =========================================================
-- Helpers
-- =========================================================

CREATE OR REPLACE FUNCTION prefixed_uuid(prefix TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN prefix || '-' || gen_random_uuid()::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- ENUMS
-- =========================================================

CREATE TYPE user_role AS ENUM (
  'user',
  'admin'
);

CREATE TYPE auth_provider AS ENUM (
  'local',
  'google',
  'microsoft'
);

CREATE TYPE scan_input_type AS ENUM (
  'text',
  'url',
  'image',
  'eml'
);

CREATE TYPE scan_status AS ENUM (
  'pending',
  'processing',
  'success',
  'failed'
);

CREATE TYPE verdict_type AS ENUM (
  'safe',
  'suspicious',
  'phishing'
);

CREATE TYPE severity_type AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

CREATE TYPE dataset_label AS ENUM (
  'safe',
  'spam',
  'phishing',
  'malware'
);

-- =========================================================
-- USERS + AUTH
-- =========================================================

CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT prefixed_uuid('usr'),

  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,

  role user_role DEFAULT 'user',
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT users_id_format CHECK (id ~ '^usr-[0-9a-f-]{36}$')
);

CREATE TABLE user_auth_accounts (
  id TEXT PRIMARY KEY DEFAULT prefixed_uuid('aut'),

  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  provider auth_provider NOT NULL,
  provider_user_id VARCHAR(255),

  password_hash TEXT,
  access_token TEXT,
  refresh_token TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE (provider, provider_user_id),

  CONSTRAINT user_auth_accounts_id_format CHECK (id ~ '^aut-[0-9a-f-]{36}$')
);

-- =========================================================
-- SCAN REQUESTS
-- Server nhận request từ Client
-- =========================================================

CREATE TABLE scan_requests (
  id TEXT PRIMARY KEY DEFAULT prefixed_uuid('scn'),

  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,

  input_type scan_input_type NOT NULL,
  status scan_status DEFAULT 'pending',

  original_text TEXT,
  original_url TEXT,

  file_name VARCHAR(255),
  file_mime_type VARCHAR(100),
  file_size BIGINT,
  file_url TEXT,

  error_message TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT scan_requests_id_format CHECK (id ~ '^scn-[0-9a-f-]{36}$')
);

-- =========================================================
-- EMAIL PARSE
-- Dành cho .eml
-- =========================================================

CREATE TABLE email_parses (
  id TEXT PRIMARY KEY DEFAULT prefixed_uuid('eml'),

  scan_id TEXT NOT NULL UNIQUE REFERENCES scan_requests(id) ON DELETE CASCADE,

  subject TEXT,

  from_email VARCHAR(255),
  from_domain VARCHAR(255),
  to_email TEXT,
  reply_to VARCHAR(255),

  body_text TEXT,
  body_html TEXT,

  spf_status VARCHAR(50),
  dkim_status VARCHAR(50),
  dmarc_status VARCHAR(50),

  return_path VARCHAR(255),
  message_id TEXT,
  mailer TEXT,

  raw_headers JSONB,

  parsed_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT email_parses_id_format CHECK (id ~ '^eml-[0-9a-f-]{36}$')
);

CREATE TABLE email_received_chains (
  id TEXT PRIMARY KEY DEFAULT prefixed_uuid('rch'),

  email_parse_id TEXT NOT NULL REFERENCES email_parses(id) ON DELETE CASCADE,

  chain_order INT NOT NULL,
  ip_address VARCHAR(100),
  mail_server TEXT,
  received_from TEXT,
  received_by TEXT,
  received_at TIMESTAMP,

  raw_line TEXT,

  CONSTRAINT email_received_chains_id_format CHECK (id ~ '^rch-[0-9a-f-]{36}$')
);

CREATE TABLE email_links (
  id TEXT PRIMARY KEY DEFAULT prefixed_uuid('lnk'),

  scan_id TEXT NOT NULL REFERENCES scan_requests(id) ON DELETE CASCADE,
  email_parse_id TEXT REFERENCES email_parses(id) ON DELETE CASCADE,

  original_url TEXT NOT NULL,
  display_text TEXT,
  domain VARCHAR(255),

  is_shortened BOOLEAN DEFAULT FALSE,
  is_suspicious BOOLEAN DEFAULT FALSE,

  metadata JSONB,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT email_links_id_format CHECK (id ~ '^lnk-[0-9a-f-]{36}$')
);

CREATE TABLE email_attachments (
  id TEXT PRIMARY KEY DEFAULT prefixed_uuid('att'),

  email_parse_id TEXT NOT NULL REFERENCES email_parses(id) ON DELETE CASCADE,

  file_name VARCHAR(255),
  mime_type VARCHAR(100),
  file_size BIGINT,
  file_url TEXT,

  extracted_text TEXT,

  has_image BOOLEAN DEFAULT FALSE,
  has_macro BOOLEAN DEFAULT FALSE,

  metadata JSONB,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT email_attachments_id_format CHECK (id ~ '^att-[0-9a-f-]{36}$')
);

-- =========================================================
-- NORMALIZED INPUTS
-- Text chuẩn hóa cho pipeline chung
-- =========================================================

CREATE TABLE normalized_inputs (
  id TEXT PRIMARY KEY DEFAULT prefixed_uuid('nor'),

  scan_id TEXT NOT NULL UNIQUE REFERENCES scan_requests(id) ON DELETE CASCADE,

  normalized_text TEXT NOT NULL,
  language VARCHAR(20),

  extracted_urls JSONB,
  extracted_domains JSONB,
  extracted_keywords JSONB,

  ocr_text TEXT,

  metadata JSONB,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT normalized_inputs_id_format CHECK (id ~ '^nor-[0-9a-f-]{36}$')
);

-- =========================================================
-- IMAGE ANALYSIS
-- Dành cho image / screenshot / QR phishing
-- =========================================================

CREATE TABLE image_analyses (
  id TEXT PRIMARY KEY DEFAULT prefixed_uuid('img'),

  scan_id TEXT NOT NULL UNIQUE REFERENCES scan_requests(id) ON DELETE CASCADE,

  ocr_text TEXT,
  detected_text_blocks JSONB,
  detected_urls JSONB,

  has_qr_code BOOLEAN DEFAULT FALSE,
  qr_content TEXT,

  image_score NUMERIC(5,2) DEFAULT 0,
  metadata JSONB,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT image_analyses_id_format CHECK (id ~ '^img-[0-9a-f-]{36}$')
);

-- =========================================================
-- SCAN FEATURES
-- Đặc trưng nghiệp vụ cho rule + score
-- =========================================================

CREATE TABLE scan_features (
  id TEXT PRIMARY KEY DEFAULT prefixed_uuid('fea'),

  scan_id TEXT NOT NULL UNIQUE REFERENCES scan_requests(id) ON DELETE CASCADE,

  sender_domain VARCHAR(255),
  sender_ip VARCHAR(100),

  has_urgent_keyword BOOLEAN DEFAULT FALSE,
  has_verify_keyword BOOLEAN DEFAULT FALSE,
  has_login_keyword BOOLEAN DEFAULT FALSE,

  from_reply_to_mismatch BOOLEAN DEFAULT FALSE,
  domain_spoofing BOOLEAN DEFAULT FALSE,
  suspicious_link BOOLEAN DEFAULT FALSE,
  failed_authentication BOOLEAN DEFAULT FALSE,

  features JSONB,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT scan_features_id_format CHECK (id ~ '^fea-[0-9a-f-]{36}$')
);

-- =========================================================
-- RAG DATASET
-- Dữ liệu mẫu phishing/safe để embedding
-- =========================================================

CREATE TABLE rag_datasets (
  id TEXT PRIMARY KEY DEFAULT prefixed_uuid('dat'),

  label dataset_label NOT NULL,

  source VARCHAR(100),
  title TEXT,
  content TEXT NOT NULL,
  language VARCHAR(20),

  metadata JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT rag_datasets_id_format CHECK (id ~ '^dat-[0-9a-f-]{36}$')
);

CREATE TABLE rag_embeddings (
  id TEXT PRIMARY KEY DEFAULT prefixed_uuid('emb'),

  dataset_id TEXT NOT NULL REFERENCES rag_datasets(id) ON DELETE CASCADE,

  embedding VECTOR(1536) NOT NULL,
  embedding_model VARCHAR(100) NOT NULL,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT rag_embeddings_id_format CHECK (id ~ '^emb-[0-9a-f-]{36}$')
);

CREATE TABLE rag_matches (
  id TEXT PRIMARY KEY DEFAULT prefixed_uuid('mat'),

  scan_id TEXT NOT NULL REFERENCES scan_requests(id) ON DELETE CASCADE,
  dataset_id TEXT REFERENCES rag_datasets(id) ON DELETE SET NULL,

  similarity_score NUMERIC(6,4) NOT NULL,
  matched_label dataset_label,
  matched_text TEXT,

  metadata JSONB,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT rag_matches_id_format CHECK (id ~ '^mat-[0-9a-f-]{36}$')
);

-- =========================================================
-- RULE DETECTION
-- Rule-based detection từ pipeline
-- =========================================================

CREATE TABLE rule_detections (
  id TEXT PRIMARY KEY DEFAULT prefixed_uuid('rul'),

  scan_id TEXT NOT NULL REFERENCES scan_requests(id) ON DELETE CASCADE,

  rule_code VARCHAR(100) NOT NULL,
  rule_name VARCHAR(255) NOT NULL,

  severity severity_type NOT NULL,
  score NUMERIC(5,2) DEFAULT 0,

  is_triggered BOOLEAN DEFAULT FALSE,
  evidence JSONB,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT rule_detections_id_format CHECK (id ~ '^rul-[0-9a-f-]{36}$')
);

-- =========================================================
-- LLM ANALYSIS
-- Optional LLM giải thích
-- =========================================================

CREATE TABLE llm_analyses (
  id TEXT PRIMARY KEY DEFAULT prefixed_uuid('llm'),

  scan_id TEXT NOT NULL UNIQUE REFERENCES scan_requests(id) ON DELETE CASCADE,

  provider VARCHAR(50),
  model VARCHAR(100),

  prompt TEXT,
  response TEXT,

  llm_score NUMERIC(5,2) DEFAULT 0,
  explanation TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT llm_analyses_id_format CHECK (id ~ '^llm-[0-9a-f-]{36}$')
);

-- =========================================================
-- FINAL RESULT
-- Server lưu kết quả để Client render
-- =========================================================

CREATE TABLE scan_results (
  id TEXT PRIMARY KEY DEFAULT prefixed_uuid('res'),

  scan_id TEXT NOT NULL UNIQUE REFERENCES scan_requests(id) ON DELETE CASCADE,

  verdict verdict_type NOT NULL,
  risk_percent NUMERIC(5,2) NOT NULL,

  rag_score NUMERIC(5,2) DEFAULT 0,
  rule_score NUMERIC(5,2) DEFAULT 0,
  header_score NUMERIC(5,2) DEFAULT 0,
  image_score NUMERIC(5,2) DEFAULT 0,
  llm_score NUMERIC(5,2) DEFAULT 0,

  formula JSONB DEFAULT '{
    "rag": 0.35,
    "rule": 0.25,
    "header": 0.20,
    "image": 0.10,
    "llm": 0.10
  }',

  summary TEXT,
  header_explanation TEXT,
  content_explanation TEXT,
  link_explanation TEXT,
  recommendation TEXT,

  evidence JSONB,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT scan_results_id_format CHECK (id ~ '^res-[0-9a-f-]{36}$')
);

-- =========================================================
-- PIPELINE LOGS
-- Debug từng bước xử lý
-- =========================================================

CREATE TABLE pipeline_logs (
  id TEXT PRIMARY KEY DEFAULT prefixed_uuid('log'),

  scan_id TEXT NOT NULL REFERENCES scan_requests(id) ON DELETE CASCADE,

  step VARCHAR(100) NOT NULL,
  status scan_status NOT NULL,

  message TEXT,
  error_detail TEXT,
  metadata JSONB,

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT pipeline_logs_id_format CHECK (id ~ '^log-[0-9a-f-]{36}$')
);

-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX idx_users_email
ON users(email);

CREATE INDEX idx_auth_user_id
ON user_auth_accounts(user_id);

CREATE INDEX idx_auth_provider
ON user_auth_accounts(provider, provider_user_id);

CREATE INDEX idx_scan_user_id
ON scan_requests(user_id);

CREATE INDEX idx_scan_status
ON scan_requests(status);

CREATE INDEX idx_scan_input_type
ON scan_requests(input_type);

CREATE INDEX idx_scan_created_at
ON scan_requests(created_at DESC);

CREATE INDEX idx_email_scan_id
ON email_parses(scan_id);

CREATE INDEX idx_email_from_domain
ON email_parses(from_domain);

CREATE INDEX idx_received_email_parse_id
ON email_received_chains(email_parse_id);

CREATE INDEX idx_links_scan_id
ON email_links(scan_id);

CREATE INDEX idx_links_email_parse_id
ON email_links(email_parse_id);

CREATE INDEX idx_links_domain
ON email_links(domain);

CREATE INDEX idx_attachments_email_parse_id
ON email_attachments(email_parse_id);

CREATE INDEX idx_normalized_inputs_scan_id
ON normalized_inputs(scan_id);

CREATE INDEX idx_image_analyses_scan_id
ON image_analyses(scan_id);

CREATE INDEX idx_image_analyses_qr
ON image_analyses(has_qr_code);

CREATE INDEX idx_features_scan_id
ON scan_features(scan_id);

CREATE INDEX idx_rag_dataset_label
ON rag_datasets(label);

CREATE INDEX idx_rag_embeddings_dataset_id
ON rag_embeddings(dataset_id);

CREATE INDEX idx_rag_matches_scan_id
ON rag_matches(scan_id);

CREATE INDEX idx_rag_matches_dataset_id
ON rag_matches(dataset_id);

CREATE INDEX idx_rag_matches_score
ON rag_matches(similarity_score DESC);

CREATE INDEX idx_rules_scan_id
ON rule_detections(scan_id);

CREATE INDEX idx_rules_triggered
ON rule_detections(is_triggered);

CREATE INDEX idx_llm_scan_id
ON llm_analyses(scan_id);

CREATE INDEX idx_results_scan_id
ON scan_results(scan_id);

CREATE INDEX idx_results_verdict
ON scan_results(verdict);

CREATE INDEX idx_results_risk
ON scan_results(risk_percent DESC);

CREATE INDEX idx_logs_scan_id
ON pipeline_logs(scan_id);

CREATE INDEX idx_logs_step
ON pipeline_logs(step);

CREATE INDEX idx_logs_status
ON pipeline_logs(status);

-- Optional pgvector index
CREATE INDEX idx_rag_embeddings_vector
ON rag_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- =========================================================
-- ERD SUMMARY
-- =========================================================
--
-- users
--  ├─ user_auth_accounts
--  └─ scan_requests
--       ├─ email_parses
--       │    ├─ email_received_chains
--       │    └─ email_attachments
--       ├─ email_links
--       ├─ normalized_inputs
--       ├─ image_analyses
--       ├─ scan_features
--       ├─ rag_matches ── rag_datasets ── rag_embeddings
--       ├─ rule_detections
--       ├─ llm_analyses
--       ├─ scan_results
--       └─ pipeline_logs
--
-- =========================================================