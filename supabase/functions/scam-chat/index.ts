import { buildFallbackMessages, parseChatInput, toPipelineChatRequest } from "./chat-core.ts";

/**
 * scam-chat: lets the user ask a follow-up question about an analysed content.
 *
 * With PIPELINE_URL and PIPELINE_API_KEY set, the question goes to the
 * pipeline's RAG chatbot, which grounds the answer in similar scam samples
 * from the vector DB. Otherwise the built-in chatbot answers from the analysis
 * result alone, through the same AI gateway analyze-content uses.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const parsed = parseChatInput(await req.json().catch(() => null));
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const input = parsed.input;

    // ─── RAG chatbot of the pipeline ───
    const pipelineUrl = (Deno.env.get("PIPELINE_URL") ?? "").trim().replace(/\/+$/, "");
    const pipelineKey = (Deno.env.get("PIPELINE_API_KEY") ?? "").trim();

    if (pipelineUrl && pipelineKey) {
      try {
        const response = await fetchWithTimeout(`${pipelineUrl}/pipeline/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-API-Key": pipelineKey },
          body: JSON.stringify(toPipelineChatRequest(input)),
        }, 30_000);

        if (response.ok) {
          const data = await response.json();
          if (typeof data?.answer === "string" && data.answer.trim()) {
            return json({ answer: data.answer, sources: data.sources ?? [], engine: "pipeline" });
          }
        }
        console.error("Pipeline chat answered", response.status, "- using built-in chatbot");
      } catch (pipelineError) {
        console.error(
          "Pipeline chat unavailable, using built-in chatbot:",
          pipelineError instanceof Error ? pipelineError.message : pipelineError,
        );
      }
    }

    // ─── Built-in chatbot ───
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "Trợ lý chưa được cấu hình." }, 503);

    const aiUrl = Deno.env.get("LOVABLE_AI_GATEWAY_URL") ?? "https://ai.gateway.lovable.dev/v1/chat/completions";
    const aiResponse = await fetchWithTimeout(aiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: buildFallbackMessages(input),
      }),
    }, 30_000);

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) return json({ error: "Hệ thống đang bận, vui lòng thử lại sau." }, 429);
      if (aiResponse.status === 402) return json({ error: "Hệ thống tạm thời không khả dụng." }, 402);
      console.error("AI gateway error:", aiResponse.status, await aiResponse.text());
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const answer = (aiData.choices?.[0]?.message?.content ?? "").trim();
    if (!answer) throw new Error("Empty answer from AI gateway");

    return json({ answer, sources: [], engine: "builtin" });
  } catch (error) {
    console.error("scam-chat error:", error);
    return json({ error: "Đã xảy ra lỗi khi trả lời." }, 500);
  }
});
