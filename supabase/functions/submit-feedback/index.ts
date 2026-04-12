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
    const { sessionId, feedback } = await req.json();

    if (!sessionId || !feedback) {
      return new Response(
        JSON.stringify({ error: "Missing sessionId or feedback" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Update the most recent log for this session
    const { data: logs } = await supabaseAdmin
      .from("mailguard_logs")
      .select("id")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (logs && logs.length > 0) {
      await supabaseAdmin
        .from("mailguard_logs")
        .update({ feedback })
        .eq("id", logs[0].id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("submit-feedback error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
