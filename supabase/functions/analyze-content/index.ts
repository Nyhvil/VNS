import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import verifiedEntities from "./verified_entities_2026.json" with { type: "json" };
import scamPatterns from "./vietnam_scam_patterns.json" with { type: "json" };
import { analyzeWithPipeline, getPipelineSettings } from "./pipeline-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Step 1: URL extraction & safety check ───
function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"')\]]+/gi;
  return [...new Set(text.match(urlRegex) || [])];
}

function analyzeDomainSafety(urls: string[], officialDomains: string[]): { url: string; suspicious: boolean; reasons: string[] }[] {
  return urls.map((url) => {
    const reasons: string[] = [];
    let hostname = "";
    try { hostname = new URL(url).hostname.toLowerCase(); } catch { reasons.push("URL không hợp lệ"); return { url, suspicious: true, reasons }; }

    // Check if domain is official
    const isOfficial = officialDomains.some((d) => hostname === d || hostname.endsWith("." + d));
    if (isOfficial) return { url, suspicious: false, reasons: ["Domain chính thức đã xác minh"] };

    // Suspicious TLD
    const suspiciousTLDs = [".xyz", ".top", ".buzz", ".tk", ".ml", ".ga", ".cf", ".gq", ".click", ".loan", ".work", ".racing", ".date", ".download", ".stream", ".bid", ".trade", ".win", ".party", ".science", ".review", ".accountant"];
    if (suspiciousTLDs.some((tld) => hostname.endsWith(tld))) reasons.push("Tên miền đuôi đáng ngờ: " + hostname.split(".").pop());

    // Typosquatting check — look-alike official domains
    const typoTargets = ["vietcombank", "techcombank", "bidv", "agribank", "vpbank", "mbbank", "momo", "zalopay", "shopee", "lazada", "tiki", "vnpay", "viettel"];
    for (const target of typoTargets) {
      if (hostname.includes(target) && !officialDomains.some((d) => hostname === d || hostname.endsWith("." + d))) {
        reasons.push(`Có thể giả mạo ${target}`);
      }
    }

    // URL shorteners
    const shorteners = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "v.gd", "s.id", "rb.gy", "cutt.ly", "shorturl.at"];
    if (shorteners.some((s) => hostname === s)) reasons.push("Link rút gọn — có thể ẩn URL thật");

    // IP address as domain
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) reasons.push("Domain là địa chỉ IP — rất đáng ngờ");

    // Very long subdomain
    if (hostname.split(".").length > 4) reasons.push("Quá nhiều subdomain — dấu hiệu phishing");

    return { url, suspicious: reasons.length > 0, reasons: reasons.length > 0 ? reasons : ["Không phát hiện dấu hiệu bất thường rõ ràng"] };
  });
}

// ─── Step 2: Entity verification ───
function checkEntities(text: string): { found: string[]; category: string; verified: boolean }[] {
  const results: { found: string[]; category: string; verified: boolean }[] = [];
  const textLower = text.toLowerCase();

  for (const [category, entities] of Object.entries(verifiedEntities)) {
    if (category === "official_domains") continue;
    const matched = (entities as string[]).filter((e) => textLower.includes(e.toLowerCase()));
    if (matched.length > 0) {
      results.push({ found: matched, category, verified: true });
    }
  }
  return results;
}

// ─── Step 3: Scam pattern matching ───
function matchScamPatterns(text: string): { id: string; name: string; matchedKeywords: string[]; risk_weight: number; description: string }[] {
  const textLower = text.toLowerCase();
  const matches: { id: string; name: string; matchedKeywords: string[]; risk_weight: number; description: string }[] = [];

  for (const pattern of scamPatterns.patterns) {
    const matchedKw = pattern.keywords.filter((kw) => textLower.includes(kw.toLowerCase()));
    if (matchedKw.length >= 1) {
      matches.push({
        id: pattern.id,
        name: pattern.name,
        matchedKeywords: matchedKw,
        risk_weight: pattern.risk_weight,
        description: pattern.description,
      });
    }
  }
  return matches.sort((a, b) => b.risk_weight - a.risk_weight);
}

// ─── OCR normalization ───
function normalizeOCRText(raw: string): string {
  let text = raw;
  const wordFixes: Record<string, string> = {
    "acc0unt": "account", "passw0rd": "password", "verlfy": "verify",
    "ver1fy": "verify", "s1gn": "sign", "l0gin": "login", "log1n": "login",
    "c0nfirm": "confirm", "c0ntact": "contact", "susp1cious": "suspicious",
    "seclurity": "security", "secur1ty": "security", "lnformation": "information",
    "inf0rmation": "information", "transact1on": "transaction", "act1vity": "activity",
    "upd4te": "update", "cl1ck": "click", "llnk": "link", "l1nk": "link",
    "rec0very": "recovery", "exp1red": "expired", "susp3nded": "suspended",
    "bl0cked": "blocked", "b1ocked": "blocked", "wr0ng": "wrong",
  };
  for (const [bad, good] of Object.entries(wordFixes)) {
    text = text.replace(new RegExp(bad, "gi"), good);
  }
  text = text.replace(/\bhltp/gi, "http").replace(/\bhltps/gi, "https");
  text = text.replace(/\.corn\b/gi, ".com").replace(/\.c0m\b/gi, ".com");
  text = text.replace(/\.n3t\b/gi, ".net").replace(/\.0rg\b/gi, ".org");
  text = text.replace(/(?<=[a-zA-Z])0(?=[a-zA-Z])/g, "o");
  text = text.replace(/(?<=[a-zA-Z])1(?=[a-zA-Z])/g, "l");
  text = text.replace(/\brn(?=[a-zA-Z])/g, "m");
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

// ─── Built-in analysis: OCR + knowledge checks + Gemini ───
// Used when the multi-layer pipeline is not configured or cannot be reached.
// Returns the result object, or a Response when the AI gateway refuses the call.
async function analyzeBuiltIn(text: string | null, imageBase64: string | null): Promise<Record<string, unknown> | Response> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const aiHeaders = { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" };
  const aiUrl = Deno.env.get("LOVABLE_AI_GATEWAY_URL") ?? "https://ai.gateway.lovable.dev/v1/chat/completions";

  // ─── OCR if image ───
  let extractedText: string | null = null;
  if (imageBase64) {
    const ocrResponse = await fetch(aiUrl, {
      method: "POST",
      headers: aiHeaders,
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Bạn là công cụ OCR. Trích xuất TOÀN BỘ văn bản có trong hình ảnh, giữ nguyên bố cục. Chỉ trả về văn bản thuần, không giải thích gì thêm." },
          { role: "user", content: [
            { type: "text", text: "Trích xuất toàn bộ văn bản trong hình ảnh này." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
          ]},
        ],
      }),
    });
    if (ocrResponse.ok) {
      const ocrData = await ocrResponse.json();
      extractedText = normalizeOCRText(ocrData.choices?.[0]?.message?.content || "");
    }
  }

  const contentToAnalyze: string = extractedText
    ? text ? `${extractedText}\n\n--- Nội dung bổ sung từ người dùng ---\n${text}` : extractedText
    : (text ?? "");

  // ─── Step 1: URL safety ───
  const urls = extractUrls(contentToAnalyze);
  const urlResults = analyzeDomainSafety(urls, verifiedEntities.official_domains);
  const suspiciousUrls = urlResults.filter((u) => u.suspicious);

  // ─── Step 2: Entity verification ───
  const entityResults = checkEntities(contentToAnalyze);

  // ─── Step 3: Scam pattern matching ───
  const patternMatches = matchScamPatterns(contentToAnalyze);

  // ─── Step 4: Build enriched prompt with ground truth ───
  let groundTruth = "";

  if (urlResults.length > 0) {
    groundTruth += "\n\n=== KẾT QUẢ KIỂM TRA URL ===\n";
    for (const u of urlResults) {
      groundTruth += `URL: ${u.url}\n  Đáng ngờ: ${u.suspicious ? "CÓ" : "KHÔNG"}\n  Chi tiết: ${u.reasons.join("; ")}\n`;
    }
  }

  if (entityResults.length > 0) {
    groundTruth += "\n=== TỔ CHỨC/THƯƠNG HIỆU ĐƯỢC NHẮC ĐẾN ===\n";
    for (const e of entityResults) {
      groundTruth += `Danh mục: ${e.category} — Tìm thấy: ${e.found.join(", ")} (Đã xác minh là tổ chức thật tại VN 2026)\n`;
    }
  }

  if (patternMatches.length > 0) {
    groundTruth += "\n=== MẪU LỪA ĐẢO KHỚP TỪ CƠ SỞ DỮ LIỆU ===\n";
    for (const p of patternMatches) {
      groundTruth += `Mẫu: ${p.name} (Độ nguy hiểm: ${p.risk_weight}%)\n  Từ khóa khớp: ${p.matchedKeywords.join(", ")}\n  Mô tả: ${p.description}\n`;
    }
  }

  const systemPrompt = `Bạn là chuyên gia an ninh mạng tại Việt Nam, phân tích nội dung trong bối cảnh năm 2026, thị trường Việt Nam.

Bạn được cung cấp kết quả xác minh thực tế từ các nguồn dữ liệu bên ngoài:
- Kết quả kiểm tra an toàn URL (domain đáng ngờ, typosquatting, link rút gọn)
- Kết quả đối chiếu tổ chức/thương hiệu với CSDL tổ chức thật tại VN 2026
- Kết quả so khớp với CSDL mẫu lừa đảo thực tế từ người dùng VN

SỬ DỤNG DỮ LIỆU NÀY LÀM CƠ SỞ TRƯỚC KHI ĐƯA RA KẾT LUẬN. Nếu nội dung nhắc đến tổ chức thật nhưng URL không khớp domain chính thức → khả năng giả mạo cao.

BẮT BUỘC trả về:
- scamPercent: số nguyên từ 0 đến 100
- riskLevel: SAFE (0-30), SUSPICIOUS (31-70), SCAM (71-100)

LƯU Ý:
- Nội dung có thể trích xuất từ ảnh OCR nên có thể còn lỗi ký tự.
- Kết hợp phân tích ngữ cảnh + dữ liệu xác minh để đánh giá chính xác nhất.

Trả lời JSON (không markdown code block):
{
"scamPercent": <0-100>,
"riskLevel": "SAFE" | "SUSPICIOUS" | "SCAM",
"explanation": "giải thích chi tiết bằng tiếng Việt, nêu rõ lý do dựa trên dữ liệu xác minh",
"dangerousPhrases": ["cụm từ nguy hiểm 1", "cụm từ 2"],
"advice": "lời khuyên cụ thể cho người dùng bằng tiếng Việt",
"verificationSummary": "tóm tắt kết quả xác minh URL, tổ chức, mẫu lừa đảo"
}`;

  const userMessage = `Phân tích nội dung sau:

${contentToAnalyze}
${groundTruth}`;

  const aiResponse = await fetch(aiUrl, {
    method: "POST",
    headers: aiHeaders,
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!aiResponse.ok) {
    if (aiResponse.status === 429) {
      return new Response(JSON.stringify({ error: "Hệ thống đang bận, vui lòng thử lại sau." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (aiResponse.status === 402) {
      return new Response(JSON.stringify({ error: "Hệ thống tạm thời không khả dụng." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const errText = await aiResponse.text();
    console.error("AI gateway error:", aiResponse.status, errText);
    throw new Error("AI gateway error");
  }

  const aiData = await aiResponse.json();
  const rawContent = aiData.choices?.[0]?.message?.content || "";

  // ─── Step 5: Parse result ───
  let result;
  try {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch { result = null; }

  if (!result) {
    result = {
      scamPercent: 50, riskLevel: "SUSPICIOUS",
      explanation: rawContent, dangerousPhrases: [],
      advice: "Hãy cẩn thận với nội dung này.",
    };
  }

  if (typeof result.scamPercent !== "number") {
    result.scamPercent = result.riskLevel === "SCAM" ? 85 : result.riskLevel === "SUSPICIOUS" ? 55 : 15;
  }
  if (result.scamPercent <= 30) result.riskLevel = "SAFE";
  else if (result.scamPercent <= 70) result.riskLevel = "SUSPICIOUS";
  else result.riskLevel = "SCAM";

  if (extractedText) result.extractedText = extractedText;

  // Add verification metadata
  result.urlsChecked = urlResults.length;
  result.suspiciousUrls = suspiciousUrls.map((u) => ({ url: u.url, reasons: u.reasons }));
  result.entitiesMentioned = entityResults;
  result.scamPatternsMatched = patternMatches.map((p) => ({ name: p.name, risk: p.risk_weight, keywords: p.matchedKeywords }));

  result.engine = "builtin";
  return result;
}

// ─── Main handler ───
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, imageBase64, sessionId, userId } = await req.json();

    if (!text && !imageBase64) {
      return new Response(
        JSON.stringify({ error: "Cần có nội dung text hoặc hình ảnh" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Analysis ───
    // With PIPELINE_URL and PIPELINE_API_KEY set, the content goes through the
    // multi-layer pipeline (rules, PhoBERT/DistilBERT, RAG, LLM). Otherwise, or
    // when the pipeline cannot be reached, the built-in analysis runs.
    let result: Record<string, unknown> | null = null;

    const pipelineSettings = getPipelineSettings((name) => Deno.env.get(name));
    if (pipelineSettings) {
      try {
        const outcome = await analyzeWithPipeline(pipelineSettings, { text, imageBase64 });
        if (outcome.kind === "unreadable_image") {
          return new Response(
            JSON.stringify({ error: "Không đọc được chữ trong ảnh. Hãy thử ảnh rõ hơn hoặc dán nội dung dạng văn bản." }),
            { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = outcome.result as unknown as Record<string, unknown>;
      } catch (pipelineError) {
        console.error(
          "Pipeline unavailable, using built-in analysis:",
          pipelineError instanceof Error ? pipelineError.message : pipelineError
        );
      }
    }

    if (!result) {
      const builtIn = await analyzeBuiltIn(text ?? null, imageBase64 ?? null);
      if (builtIn instanceof Response) return builtIn;
      result = builtIn;
    }

    const extractedText = typeof result.extractedText === "string" ? result.extractedText : null;

    // ─── Step 6: Save to DB ───
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let imageUrl: string | null = null;
    if (imageBase64) {
      const fileName = `${crypto.randomUUID()}.jpg`;
      const imageBuffer = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));
      const { data: uploadData } = await supabaseAdmin.storage
        .from("scan-images")
        .upload(fileName, imageBuffer, { contentType: "image/jpeg" });
      if (uploadData) {
        const { data: urlData } = supabaseAdmin.storage.from("scan-images").getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
    }

    const contentText = extractedText || text || null;

    await supabaseAdmin.from("scans").insert({
      session_id: sessionId || crypto.randomUUID(),
      user_id: userId || null,
      type: imageBase64 ? "image" : "text",
      content_text: contentText,
      image_url: imageUrl,
      risk_level: result.riskLevel,
      ai_result: result.explanation,
      dangerous_phrases: result.dangerousPhrases || [],
    });

    await supabaseAdmin.from("mailguard_logs").insert({
      session_id: sessionId || crypto.randomUUID(),
      user_id: userId || null,
      text_length: (contentText || "").length,
      scam_percent: result.scamPercent,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-content error:", error);
    return new Response(
      JSON.stringify({ error: "Đã xảy ra lỗi khi phân tích." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
