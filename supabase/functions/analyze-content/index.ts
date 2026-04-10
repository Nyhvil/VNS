import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Common OCR misreads and scam obfuscation patterns */
function normalizeOCRText(raw: string): string {
  let text = raw;

  // Word-level replacements (case-insensitive)
  const wordFixes: Record<string, string> = {
    "acc0unt": "account",
    "passw0rd": "password",
    "verlfy": "verify",
    "ver1fy": "verify",
    "verlfy": "verify",
    "s1gn": "sign",
    "l0gin": "login",
    "log1n": "login",
    "c0nfirm": "confirm",
    "c0ntact": "contact",
    "susp1cious": "suspicious",
    "seclurity": "security",
    "secur1ty": "security",
    "lnformation": "information",
    "inf0rmation": "information",
    "transact1on": "transaction",
    "act1vity": "activity",
    "upd4te": "update",
    "cl1ck": "click",
    "llnk": "link",
    "l1nk": "link",
    "rec0very": "recovery",
    "exp1red": "expired",
    "susp3nded": "suspended",
    "bl0cked": "blocked",
    "b1ocked": "blocked",
    "wr0ng": "wrong",
  };

  for (const [bad, good] of Object.entries(wordFixes)) {
    text = text.replace(new RegExp(bad, "gi"), good);
  }

  // URL-related fixes
  text = text.replace(/\bhltp/gi, "http");
  text = text.replace(/\bhltps/gi, "https");
  text = text.replace(/\.corn\b/gi, ".com");
  text = text.replace(/\.c0m\b/gi, ".com");
  text = text.replace(/\.n3t\b/gi, ".net");
  text = text.replace(/\.0rg\b/gi, ".org");

  // Character-level fixes in likely-text contexts (not inside URLs)
  // Replace standalone 0 with o when surrounded by letters
  text = text.replace(/(?<=[a-zA-Z])0(?=[a-zA-Z])/g, "o");
  // Replace standalone 1 with l when surrounded by letters
  text = text.replace(/(?<=[a-zA-Z])1(?=[a-zA-Z])/g, "l");
  // Fix common rn → m misread
  text = text.replace(/\brn(?=[a-zA-Z])/g, "m");

  // Clean up whitespace
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    };
    const aiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";

    let extractedText: string | null = null;

    // ── STEP 1: If image, extract text via vision OCR first ──
    if (imageBase64) {
      const ocrResponse = await fetch(aiUrl, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "Bạn là công cụ OCR. Trích xuất TOÀN BỘ văn bản có trong hình ảnh, giữ nguyên bố cục. Chỉ trả về văn bản thuần, không giải thích gì thêm.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Trích xuất toàn bộ văn bản trong hình ảnh này.",
                },
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
                },
              ],
            },
          ],
        }),
      });

      if (ocrResponse.ok) {
        const ocrData = await ocrResponse.json();
        const rawOCR = ocrData.choices?.[0]?.message?.content || "";
        // ── STEP 2: Normalize OCR text ──
        extractedText = normalizeOCRText(rawOCR);
        console.log("OCR extracted & normalized:", extractedText.substring(0, 200));
      }
    }

    // ── STEP 3: Analyze with LLM ──
    const analysisInput = extractedText
      ? text
        ? `${extractedText}\n\n--- Nội dung bổ sung từ người dùng ---\n${text}`
        : extractedText
      : text;

    const systemPrompt = `Bạn là chuyên gia an ninh mạng tại Việt Nam.
Hãy phân tích nội dung sau và cho biết đây có phải lừa đảo/phishing không.
Giải thích rõ lý do bằng tiếng Việt.
Phân loại: SAFE, SUSPICIOUS, SCAM.

LƯU Ý QUAN TRỌNG:
- Nội dung này được trích xuất từ ảnh bằng OCR nên có thể còn lỗi ký tự. Hãy đọc theo ngữ cảnh.
- Các dấu hiệu lừa đảo phổ biến: yêu cầu mật khẩu, OTP, chuyển tiền, link lạ, tạo khẩn cấp giả.
- Nếu nội dung chứa link đáng ngờ, yêu cầu thông tin cá nhân, hoặc tạo áp lực → phân loại SUSPICIOUS hoặc SCAM.

Trả lời theo format JSON (không có markdown code block):
{
  "riskLevel": "SAFE" | "SUSPICIOUS" | "SCAM",
  "explanation": "giải thích chi tiết bằng tiếng Việt",
  "dangerousPhrases": ["cụm từ nguy hiểm 1", "cụm từ nguy hiểm 2"],
  "advice": "lời khuyên cho người dùng bằng tiếng Việt"
}`;

    const messages: any[] = [{ role: "system", content: systemPrompt }];
    messages.push({
      role: "user",
      content: `Phân tích nội dung sau:\n\n${analysisInput}`,
    });

    const aiResponse = await fetch(aiUrl, {
      method: "POST",
      headers: aiHeaders,
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Hệ thống đang bận, vui lòng thử lại sau." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Hệ thống tạm thời không khả dụng." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Parse AI response
    let result;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      result = null;
    }

    if (!result) {
      result = {
        riskLevel: "SUSPICIOUS",
        explanation: rawContent,
        dangerousPhrases: [],
        advice: "Hãy cẩn thận với nội dung này.",
      };
    }

    // Add extracted text to response for UI display
    if (extractedText) {
      result.extractedText = extractedText;
    }

    // Save to database
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let imageUrl: string | null = null;
    if (imageBase64) {
      const fileName = `${crypto.randomUUID()}.jpg`;
      const imageBuffer = Uint8Array.from(atob(imageBase64), (c) =>
        c.charCodeAt(0)
      );
      const { data: uploadData } = await supabaseAdmin.storage
        .from("scan-images")
        .upload(fileName, imageBuffer, { contentType: "image/jpeg" });
      if (uploadData) {
        const { data: urlData } = supabaseAdmin.storage
          .from("scan-images")
          .getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
    }

    await supabaseAdmin.from("scans").insert({
      session_id: sessionId || crypto.randomUUID(),
      user_id: userId || null,
      type: imageBase64 ? "image" : "text",
      content_text: extractedText || text || null,
      image_url: imageUrl,
      risk_level: result.riskLevel,
      ai_result: result.explanation,
      dangerous_phrases: result.dangerousPhrases || [],
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
