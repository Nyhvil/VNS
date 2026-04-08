import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, imageBase64, sessionId } = await req.json();

    if (!text && !imageBase64) {
      return new Response(
        JSON.stringify({ error: "Cần có nội dung text hoặc hình ảnh" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Bạn là chuyên gia an ninh mạng tại Việt Nam.
Hãy phân tích nội dung sau và cho biết đây có phải lừa đảo/phishing không.
Giải thích rõ lý do bằng tiếng Việt.
Phân loại: SAFE, SUSPICIOUS, SCAM.

Trả lời theo format JSON (không có markdown code block):
{
  "riskLevel": "SAFE" | "SUSPICIOUS" | "SCAM",
  "explanation": "giải thích chi tiết bằng tiếng Việt",
  "dangerousPhrases": ["cụm từ nguy hiểm 1", "cụm từ nguy hiểm 2"],
  "advice": "lời khuyên cho người dùng bằng tiếng Việt"
}`;

    // Build messages based on input type
    const messages: any[] = [{ role: "system", content: systemPrompt }];

    if (imageBase64) {
      // Use Gemini vision with image
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: text
              ? `Phân tích hình ảnh này cùng với nội dung sau để phát hiện lừa đảo:\n\n${text}`
              : "Đọc và phân tích nội dung trong hình ảnh này để phát hiện lừa đảo/phishing. Trích xuất toàn bộ văn bản trong ảnh và phân tích.",
          },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
          },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: `Phân tích nội dung email/tin nhắn sau:\n\n${text}`,
      });
    }

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: imageBase64
            ? "google/gemini-2.5-flash"
            : "google/gemini-3-flash-preview",
          messages,
        }),
      }
    );

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
      // Try to extract JSON from the response
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

    // Save to database
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // If image, upload to storage
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
      type: imageBase64 ? "image" : "text",
      content_text: text || null,
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
