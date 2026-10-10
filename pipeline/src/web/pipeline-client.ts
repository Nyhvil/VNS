/**
 * Client for the VNS analysis pipeline (see /pipeline in this repository).
 *
 * The pipeline is optional. When PIPELINE_URL and PIPELINE_API_KEY are set as
 * function secrets, analyze-content sends the content there and gets back the
 * multi-layer result (rules, PhoBERT/DistilBERT, RAG on Qdrant, LLM). Without
 * them, or when the pipeline cannot be reached, analyze-content runs its own
 * built-in analysis exactly as before.
 *
 * This file has no Deno-specific code so it can be unit-tested with Vitest.
 */

export interface PipelineSettings {
  url: string;
  apiKey: string;
  timeoutMs: number;
}

export interface AnalysisInput {
  text?: string | null;
  imageBase64?: string | null;
}

export type PipelineInputType = "plain_text" | "email_text" | "image";

export interface PipelineRequest {
  job_id: string;
  type: PipelineInputType;
  content: string;
  metadata: Record<string, unknown>;
}

export interface LayerScore {
  id: string;
  label: string;
  weight: number;
  score: number;
  applied: boolean;
}

/** The part of the pipeline's answer this function reads. */
export interface PipelineResponse {
  job_id: string;
  risk_score: number;
  risk_level: string;
  category: string;
  findings?: { rule_id: string; severity: string; description: string }[];
  evidence?: {
    rag_matches?: { similarity: number; snippet: string; label: string; source?: string }[];
    url_checks?: { url: string; suspicious: boolean; reasons: string[] }[];
    entities?: { found: string[]; category: string; verified: boolean }[];
    scam_patterns?: { name: string; risk_weight: number; matched_keywords: string[] }[];
    qr_codes?: string[];
  };
  analysis_path?: "fast_ml" | "deep";
  layers?: LayerScore[];
  formula_score?: number;
  llm_floor_applied?: boolean;
  ml?: {
    available: boolean;
    label: "scam" | "safe" | null;
    confidence: number;
    scam_probability: number;
    model: string | null;
  };
  vns?: {
    scam_percent: number;
    risk_level: "SAFE" | "SUSPICIOUS" | "SCAM";
    explanation: string;
    dangerous_phrases: string[];
    advice: string;
    verification_summary: string;
    extracted_text?: string;
  };
}

/** What analyze-content returns to the web app. */
export interface AnalysisResult {
  scamPercent: number;
  riskLevel: "SAFE" | "SUSPICIOUS" | "SCAM";
  explanation: string;
  dangerousPhrases: string[];
  advice: string;
  verificationSummary?: string;
  extractedText?: string;
  urlsChecked: number;
  suspiciousUrls: { url: string; reasons: string[] }[];
  entitiesMentioned: { found: string[]; category: string; verified: boolean }[];
  scamPatternsMatched: { name: string; risk: number; keywords: string[] }[];
  /** Which engine produced the result. */
  engine: "pipeline" | "builtin";
  pipeline?: {
    path: "fast_ml" | "deep";
    layers: LayerScore[];
    formulaScore: number | null;
    llmFloorApplied: boolean;
    ml: { label: "scam" | "safe"; confidence: number; scamProbability: number; model: string } | null;
    similarSamples: { snippet: string; similarity: number }[];
    qrCodes: string[];
    findings: { ruleId: string; severity: string; description: string }[];
  };
}

export type PipelineOutcome =
  | { kind: "ok"; result: AnalysisResult }
  | { kind: "unreadable_image" };

const DEFAULT_TIMEOUT_MS = 40_000;
/** Samples less similar than this are not worth showing as "a similar scam". */
const MIN_DISPLAYED_SIMILARITY = 0.5;

export function getPipelineSettings(
  env: (name: string) => string | undefined,
): PipelineSettings | null {
  const url = (env("PIPELINE_URL") ?? "").trim().replace(/\/+$/, "");
  const apiKey = (env("PIPELINE_API_KEY") ?? "").trim();
  if (!url || !apiKey) return null;

  const timeout = Number(env("PIPELINE_TIMEOUT_MS"));
  return {
    url,
    apiKey,
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS,
  };
}

const EMAIL_HEADER = /^(from|to|subject|date|reply-to|return-path|received|message-id|authentication-results|received-spf|dkim-signature|mime-version|content-type):/i;

/**
 * Did the user paste the full source of an email (headers, blank line, body)?
 * If so the pipeline can also check the technical headers (SPF, DKIM, sender
 * versus reply-to address).
 */
export function looksLikeRawEmail(text: string): boolean {
  const lines = text.replace(/\r\n/g, "\n").trimStart().split("\n");

  let headerCount = 0;
  let sawFrom = false;
  let index = 0;

  for (; index < lines.length && index < 80; index++) {
    const line = lines[index];
    if (line.trim() === "") break;
    if (/^\s/.test(line)) continue; // folded header line
    if (!EMAIL_HEADER.test(line)) return false;
    headerCount++;
    if (/^from:/i.test(line)) sawFrom = true;
  }

  const hasBlankLineThenBody = index < lines.length && lines.slice(index + 1).some((l) => l.trim() !== "");
  return sawFrom && headerCount >= 3 && hasBlankLineThenBody;
}

export function buildPipelineRequest(input: AnalysisInput, jobId: string): PipelineRequest {
  const text = (input.text ?? "").trim();
  const metadata: Record<string, unknown> = { source: "vns-web" };

  if (input.imageBase64) {
    if (text) metadata.additional_text = text;
    return { job_id: jobId, type: "image", content: input.imageBase64, metadata };
  }

  return {
    job_id: jobId,
    type: looksLikeRawEmail(text) ? "email_text" : "plain_text",
    content: text,
    metadata,
  };
}

function toRiskLevel(score: number): "SAFE" | "SUSPICIOUS" | "SCAM" {
  if (score <= 30) return "SAFE";
  if (score <= 70) return "SUSPICIOUS";
  return "SCAM";
}

export function mapPipelineResponse(response: PipelineResponse): PipelineOutcome {
  if (response.category === "unreadable_image") {
    return { kind: "unreadable_image" };
  }

  const evidence = response.evidence ?? {};
  const urlChecks = evidence.url_checks ?? [];
  const vns = response.vns;

  const scamPercent = Math.round(
    Math.min(100, Math.max(0, Number(vns?.scam_percent ?? response.risk_score) || 0)),
  );

  const ml = response.ml && response.ml.available && response.ml.label
    ? {
      label: response.ml.label,
      confidence: response.ml.confidence,
      scamProbability: response.ml.scam_probability,
      model: response.ml.model ?? "ML",
    }
    : null;

  const result: AnalysisResult = {
    scamPercent,
    // The level always follows the score, as in the built-in analysis.
    riskLevel: toRiskLevel(scamPercent),
    explanation: vns?.explanation ?? "",
    dangerousPhrases: vns?.dangerous_phrases ?? [],
    advice: vns?.advice ?? "",
    urlsChecked: urlChecks.length,
    suspiciousUrls: urlChecks
      .filter((u) => u.suspicious)
      .map((u) => ({ url: u.url, reasons: u.reasons })),
    entitiesMentioned: evidence.entities ?? [],
    scamPatternsMatched: (evidence.scam_patterns ?? []).map((p) => ({
      name: p.name,
      risk: p.risk_weight,
      keywords: p.matched_keywords,
    })),
    engine: "pipeline",
    pipeline: {
      path: response.analysis_path ?? "deep",
      layers: response.layers ?? [],
      formulaScore: typeof response.formula_score === "number" ? response.formula_score : null,
      llmFloorApplied: response.llm_floor_applied === true,
      ml,
      // Only the team's curated samples are shown. Samples the pipeline learned
      // from what other people submitted count towards the score but are never
      // displayed to anyone else.
      similarSamples: (evidence.rag_matches ?? [])
        .filter((m) =>
          m.label === "phishing" && m.source === "curated" && m.snippet &&
          m.similarity >= MIN_DISPLAYED_SIMILARITY
        )
        .slice(0, 3)
        .map((m) => ({ snippet: m.snippet, similarity: m.similarity })),
      qrCodes: evidence.qr_codes ?? [],
      findings: (response.findings ?? []).map((f) => ({
        ruleId: f.rule_id,
        severity: f.severity,
        description: f.description,
      })),
    },
  };

  if (vns?.verification_summary) result.verificationSummary = vns.verification_summary;
  if (vns?.extracted_text) result.extractedText = vns.extracted_text;

  return { kind: "ok", result };
}

export class PipelineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PipelineError";
  }
}

/**
 * Send the content to the pipeline. Throws PipelineError when the pipeline
 * cannot be reached or answers with an error, so the caller can fall back to
 * the built-in analysis.
 */
export async function analyzeWithPipeline(
  settings: PipelineSettings,
  input: AnalysisInput,
  fetchImpl: typeof fetch = fetch,
  jobId: string = crypto.randomUUID(),
): Promise<PipelineOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), settings.timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(`${settings.url}/pipeline/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": settings.apiKey },
      body: JSON.stringify(buildPipelineRequest(input, jobId)),
      signal: controller.signal,
    });
  } catch (error) {
    const reason = error instanceof Error && error.name === "AbortError"
      ? `no answer within ${settings.timeoutMs} ms`
      : error instanceof Error
      ? error.message
      : String(error);
    throw new PipelineError(`Pipeline unreachable: ${reason}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new PipelineError(`Pipeline answered ${response.status}`);
  }

  let body: PipelineResponse;
  try {
    body = await response.json() as PipelineResponse;
  } catch {
    throw new PipelineError("Pipeline answered with invalid JSON");
  }

  if (!body || typeof body.risk_score !== "number" || typeof body.category !== "string") {
    throw new PipelineError("Pipeline answer is missing required fields");
  }

  return mapPipelineResponse(body);
}
