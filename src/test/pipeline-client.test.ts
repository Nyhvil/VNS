import { describe, it, expect, vi } from "vitest";
import {
  analyzeWithPipeline,
  buildPipelineRequest,
  getPipelineSettings,
  looksLikeRawEmail,
  mapPipelineResponse,
  PipelineError,
  type PipelineResponse,
} from "../../supabase/functions/analyze-content/pipeline-client";

const env = (values: Record<string, string>) => (name: string) => values[name];

const RAW_EMAIL = [
  "From: Security Team <support@vietcombank-secure.com>",
  "Reply-To: verify@gmail-helpdesk.net",
  "To: user@example.com",
  "Subject: Thong bao tai khoan",
  "Authentication-Results: mx.example.com; spf=fail",
  " smtp.mailfrom=vietcombank-secure.com; dkim=fail",
  "",
  "Tai khoan cua ban se bi khoa trong 24h.",
].join("\r\n");

const pipelineResponse = (overrides: Partial<PipelineResponse> = {}): PipelineResponse => ({
  job_id: "550e8400-e29b-41d4-a716-446655440000",
  risk_score: 88,
  risk_level: "critical",
  category: "phishing",
  findings: [{ rule_id: "scam_pattern", severity: "high", description: "Khớp mẫu lừa đảo" }],
  evidence: {
    rag_matches: [
      { similarity: 0.91, snippet: "Tài khoản bị khóa, nhập OTP", label: "phishing", source: "curated" },
      { similarity: 0.88, snippet: "Tin người khác đã gửi", label: "phishing", source: "pipeline_auto" },
      { similarity: 0.5, snippet: "Nội dung an toàn", label: "safe", source: "pipeline_auto" },
      { similarity: 0.2, snippet: "Mẫu chẳng giống mấy", label: "phishing", source: "curated" },
    ],
    url_checks: [
      { url: "http://vietcombank-xacminh.top", suspicious: true, reasons: ["Có thể giả mạo vietcombank"] },
      { url: "https://vietcombank.com.vn", suspicious: false, reasons: ["Domain chính thức đã xác minh"] },
    ],
    entities: [{ found: ["Vietcombank"], category: "banks", verified: true }],
    scam_patterns: [{ name: "Giả mạo ngân hàng yêu cầu OTP", risk_weight: 90, matched_keywords: ["OTP"] }],
  },
  analysis_path: "deep",
  layers: [
    { id: "rag", label: "So khớp mẫu lừa đảo (RAG)", weight: 0.35, score: 91, applied: true },
    { id: "rule", label: "Bộ luật", weight: 0.25, score: 85, applied: true },
    { id: "header", label: "Tiêu đề email", weight: 0.2, score: 0, applied: false },
    { id: "image", label: "Ảnh và mã QR", weight: 0.1, score: 0, applied: false },
    { id: "llm", label: "Mô hình ngôn ngữ (LLM)", weight: 0.1, score: 80, applied: true },
  ],
  formula_score: 88,
  llm_floor_applied: false,
  vns: {
    scam_percent: 88,
    risk_level: "SCAM",
    explanation: "Giả mạo ngân hàng.",
    dangerous_phrases: ["mã OTP"],
    advice: "Không nhập OTP.",
    verification_summary: "1 link đáng ngờ.",
  },
  ...overrides,
});

describe("getPipelineSettings", () => {
  it("is off unless both the URL and the key are set", () => {
    expect(getPipelineSettings(env({}))).toBeNull();
    expect(getPipelineSettings(env({ PIPELINE_URL: "https://p.example.com" }))).toBeNull();
    expect(getPipelineSettings(env({ PIPELINE_API_KEY: "k" }))).toBeNull();
    expect(getPipelineSettings(env({ PIPELINE_URL: "  ", PIPELINE_API_KEY: "k" }))).toBeNull();
  });

  it("trims the URL and applies the default timeout", () => {
    expect(getPipelineSettings(env({ PIPELINE_URL: "https://p.example.com/ ", PIPELINE_API_KEY: " k " }))).toEqual({
      url: "https://p.example.com",
      apiKey: "k",
      timeoutMs: 40000,
    });
  });

  it("accepts a custom timeout", () => {
    const settings = getPipelineSettings(
      env({ PIPELINE_URL: "https://p.example.com", PIPELINE_API_KEY: "k", PIPELINE_TIMEOUT_MS: "5000" }),
    );
    expect(settings?.timeoutMs).toBe(5000);
  });
});

describe("looksLikeRawEmail", () => {
  it("recognises pasted email source", () => {
    expect(looksLikeRawEmail(RAW_EMAIL)).toBe(true);
  });

  it("does not mistake ordinary messages for email source", () => {
    expect(looksLikeRawEmail("Chào bạn, chiều nay họp nhé")).toBe(false);
    expect(looksLikeRawEmail("From: anh Nam\nNội dung: mai gặp")).toBe(false);
    expect(looksLikeRawEmail("Subject: hello\nTo: a@b.com\nDate: today\n\nbody")).toBe(false); // no From
    expect(looksLikeRawEmail("From: a@b.com\nTo: c@d.com\nSubject: hi")).toBe(false); // no body
  });
});

describe("buildPipelineRequest", () => {
  it("sends plain text as plain_text", () => {
    expect(buildPipelineRequest({ text: "  Xin chào  " }, "job-1")).toEqual({
      job_id: "job-1",
      type: "plain_text",
      content: "Xin chào",
      metadata: { source: "vns-web" },
    });
  });

  it("sends pasted email source as email_text", () => {
    expect(buildPipelineRequest({ text: RAW_EMAIL }, "job-2").type).toBe("email_text");
  });

  it("sends an image with the accompanying note", () => {
    expect(buildPipelineRequest({ imageBase64: "QUJD", text: "họ gửi cái này" }, "job-3")).toEqual({
      job_id: "job-3",
      type: "image",
      content: "QUJD",
      metadata: { source: "vns-web", additional_text: "họ gửi cái này" },
    });
    expect(buildPipelineRequest({ imageBase64: "QUJD", text: null }, "job-4").metadata).toEqual({ source: "vns-web" });
  });
});

describe("mapPipelineResponse", () => {
  it("maps the verdict to the shape the web app expects", () => {
    const outcome = mapPipelineResponse(pipelineResponse());
    expect(outcome.kind).toBe("ok");
    if (outcome.kind !== "ok") return;

    expect(outcome.result).toMatchObject({
      scamPercent: 88,
      riskLevel: "SCAM",
      explanation: "Giả mạo ngân hàng.",
      dangerousPhrases: ["mã OTP"],
      advice: "Không nhập OTP.",
      verificationSummary: "1 link đáng ngờ.",
      urlsChecked: 2,
      suspiciousUrls: [{ url: "http://vietcombank-xacminh.top", reasons: ["Có thể giả mạo vietcombank"] }],
      entitiesMentioned: [{ found: ["Vietcombank"], category: "banks", verified: true }],
      scamPatternsMatched: [{ name: "Giả mạo ngân hàng yêu cầu OTP", risk: 90, keywords: ["OTP"] }],
      engine: "pipeline",
    });
    expect(outcome.result.pipeline?.path).toBe("deep");
    expect(outcome.result.pipeline?.layers).toHaveLength(5);
    // Only the team's curated scam samples are shown as "similar samples".
    expect(outcome.result.pipeline?.similarSamples).toEqual([
      { snippet: "Tài khoản bị khóa, nhập OTP", similarity: 0.91 },
    ]);
    expect(outcome.result.pipeline?.ml).toBeNull();
  });

  it.each([
    [0, "SAFE"],
    [30, "SAFE"],
    [31, "SUSPICIOUS"],
    [70, "SUSPICIOUS"],
    [71, "SCAM"],
  ])("derives the level from the score (%i -> %s)", (score, level) => {
    const outcome = mapPipelineResponse(pipelineResponse({ vns: undefined, risk_score: score }));
    expect(outcome.kind === "ok" && outcome.result.riskLevel).toBe(level);
  });

  it("carries the classifier verdict on the fast path", () => {
    const outcome = mapPipelineResponse(
      pipelineResponse({
        analysis_path: "fast_ml",
        ml: { available: true, label: "scam", confidence: 0.97, scam_probability: 0.97, model: "phobert" },
      }),
    );
    expect(outcome.kind === "ok" && outcome.result.pipeline).toMatchObject({
      path: "fast_ml",
      ml: { label: "scam", confidence: 0.97, scamProbability: 0.97, model: "phobert" },
    });
  });

  it("reports an unreadable image separately", () => {
    expect(mapPipelineResponse(pipelineResponse({ category: "unreadable_image", risk_score: 0 }))).toEqual({
      kind: "unreadable_image",
    });
  });

  it("copes with a minimal answer", () => {
    const outcome = mapPipelineResponse({ job_id: "j", risk_score: 12, risk_level: "low", category: "safe" });
    expect(outcome.kind === "ok" && outcome.result).toMatchObject({
      scamPercent: 12,
      riskLevel: "SAFE",
      urlsChecked: 0,
      suspiciousUrls: [],
      dangerousPhrases: [],
    });
  });
});

describe("analyzeWithPipeline", () => {
  const settings = { url: "https://p.example.com", apiKey: "secret", timeoutMs: 1000 };

  it("posts the request with the API key and maps the answer", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(pipelineResponse()), { status: 200 }));

    const outcome = await analyzeWithPipeline(settings, { text: "Tài khoản bị khóa" }, fetchMock, "job-9");

    expect(outcome.kind).toBe("ok");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://p.example.com/pipeline/analyze");
    expect(init.method).toBe("POST");
    expect(init.headers["X-API-Key"]).toBe("secret");
    expect(JSON.parse(init.body)).toMatchObject({ job_id: "job-9", type: "plain_text", content: "Tài khoản bị khóa" });
  });

  it("throws PipelineError when the pipeline answers with an error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 500 }));
    await expect(analyzeWithPipeline(settings, { text: "x" }, fetchMock)).rejects.toThrow(PipelineError);
  });

  it("throws PipelineError when the pipeline cannot be reached", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    await expect(analyzeWithPipeline(settings, { text: "x" }, fetchMock)).rejects.toThrow("Pipeline unreachable: fetch failed");
  });

  it("throws PipelineError when the answer is not a pipeline result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ hello: "world" }), { status: 200 }));
    await expect(analyzeWithPipeline(settings, { text: "x" }, fetchMock)).rejects.toThrow("missing required fields");
  });

  it("gives up after the timeout", async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      })
    );

    await expect(
      analyzeWithPipeline({ ...settings, timeoutMs: 30 }, { text: "x" }, fetchMock as unknown as typeof fetch),
    ).rejects.toThrow("no answer within 30 ms");
  });
});
