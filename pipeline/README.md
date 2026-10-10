# Phishing Analysis Pipeline

A standalone Node.js + TypeScript microservice for phishing and spam detection. Analyzes email, plain text, and images using multi-layer detection (rule-based, RAG, optional LLM).

## Architecture

```
client → server → pipeline → server → client
```

The pipeline is an **internal service** — it must not be exposed to the internet. Only the main server should call it.

## Quick Start

```bash
# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your values

# Development (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

## Environment Variables

| Variable                   | Required | Default                          | Description                                                   |
| -------------------------- | -------- | -------------------------------- | ------------------------------------------------------------- |
| `PIPELINE_API_KEY`         | ✅       | —                                | Secret key for authenticating requests from the server        |
| `PIPELINE_PORT`            |          | `3001`                           | Port to listen on                                             |
| `PIPELINE_ALLOWED_IPS`     |          | `127.0.0.1,::1,::ffff:127.0.0.1` | Comma-separated list of allowed source IPs                    |
| `LOG_LEVEL`                |          | `info`                           | Log level: `trace`, `debug`, `info`, `warn`, `error`, `fatal` |
| `QDRANT_URL`               |          | `http://localhost:6333`          | Qdrant vector database URL                                    |
| `QDRANT_COLLECTION`        |          | `phishing_emails`                | Qdrant collection name                                        |
| `QDRANT_API_KEY`           |          | —                                | Qdrant API key (if required)                                  |
| `OPENAI_API_KEY`           |          | —                                | OpenAI API key (required for RAG embeddings and LLM)          |
| `OPENAI_EMBEDDING_MODEL`   |          | `text-embedding-3-small`         | Embedding model name                                          |
| `LLM_ENABLED`              |          | `false`                          | Enable LLM-based analysis                                     |
| `LLM_MODEL`                |          | `gpt-4o-mini`                    | LLM model name                                                |
| `LLM_TIMEOUT_MS`           |          | `10000`                          | LLM API timeout in milliseconds                               |
| `PIPELINE_TIMEOUT_MS`      |          | `30000`                          | Total analysis timeout in milliseconds                        |
| `RAG_SIMILARITY_THRESHOLD` |          | `0.75`                           | Similarity threshold for RAG phishing detection               |
| `RAG_TOP_K`                |          | `5`                              | Number of similar samples to retrieve from vector DB          |

## API

### POST /pipeline/analyze

Analyze content for phishing/spam.

**Headers:**

- `X-API-Key: <PIPELINE_API_KEY>` (required)
- `Content-Type: application/json`

**Request Body:**

```json
{
	"job_id": "550e8400-e29b-41d4-a716-446655440000",
	"type": "email_text",
	"content": "raw email content here",
	"metadata": {
		"source": "upload"
	}
}
```

**Input Types:**

- `email_text` — Raw email text (RFC 5322 format)
- `eml_file` — EML file content
- `plain_text` — Plain text content
- `image` — Base64-encoded image (OCR will be applied)

**Response (200 OK):**

```json
{
	"job_id": "550e8400-e29b-41d4-a716-446655440000",
	"status": "completed",
	"risk_score": 82,
	"risk_level": "high",
	"category": "phishing",
	"findings": [
		{
			"rule_id": "spf_fail",
			"severity": "high",
			"description": "SPF authentication failed",
			"evidence": { "spf_result": "fail" }
		}
	],
	"evidence": {
		"headers": {},
		"urls": [],
		"keywords": ["urgent", "verify"],
		"rag_matches": []
	},
	"recommendation": "High-severity indicators detected. Do not click links or provide personal information."
}
```

**Risk Levels:**
| Score | Level |
|---|---|
| 0–29 | `low` |
| 30–59 | `medium` |
| 60–84 | `high` |
| 85–100 | `critical` |

**Error Responses:**
| Status | Condition |
|---|---|
| 400 | Missing required field or invalid UUID |
| 401 | Missing or invalid API key |
| 403 | Source IP not in allowlist |
| 422 | Invalid input type |
| 504 | Analysis timeout (>30s) |
| 500 | Internal server error |

### GET /pipeline/health

Check service health.

**Response (200 OK — ready):**

```json
{ "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" }
```

**Response (503 — starting):**

```json
{ "status": "starting", "timestamp": "2024-01-01T00:00:00.000Z" }
```

## Risk Score Formula

```
risk_score = round(
  0.35 * RAG_score +
  0.25 * Rule_score +
  0.20 * Header_score +
  0.10 * Image_score +
  0.10 * LLM_score
)
```

All component scores are in the range [0.0, 100.0]. The final score is clamped to [0, 100].

## Detection Layers

1. **Rule Engine** — Deterministic rules: SPF fail, DKIM fail, domain mismatch, suspicious keywords, IP-based URLs, URL shorteners
2. **RAG Analyzer** — Vector similarity search against known phishing samples in Qdrant
3. **LLM Analyzer** (optional) — Natural language explanation via OpenAI API

## Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Property-based tests only
npm run test:property

# E2E tests only
npm run test:e2e

# With coverage
npx jest --coverage
```

## Project Structure

```
pipeline/
  src/
    config/         # Environment variable loading and validation
    features/       # URL normalization, keyword detection, feature extraction
    http/           # Express router, middleware (auth, IP allowlist, validation)
    llm/            # LLM analyzer and PII sanitizer
    logger/         # Structured JSON logging (pino)
    orchestrator/   # Main pipeline coordinator
    parser/         # Email, plain text, and image (OCR) parsers
    rag/            # RAG analyzer, embedding client, Qdrant client
    rules/          # Rule engine and individual rule definitions
    scoring/        # Score aggregation, risk level mapping, category determination
    types/          # TypeScript type definitions
    main.ts         # Express server entry point
```
