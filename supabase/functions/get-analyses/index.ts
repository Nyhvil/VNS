import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the request has a valid admin key
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Query mailguard_logs to get feedback data and session info
    const { data: logs, error } = await supabaseAdmin
      .from("mailguard_logs")
      .select("*, analyses:session_id(session_id, email_content, risk_percentage, explanation, created_at)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Flatten the data for the frontend
    const flattenedData = (logs || []).map((log: any) => ({
      id: log.id,
      session_id: log.session_id,
      created_at: log.created_at,
      risk_percentage: log.scam_percent || 0,
      email_content: log.analyses?.[0]?.email_content || "",
      explanation: log.analyses?.[0]?.explanation || "",
      feedback: log.feedback,
    }));

    return new Response(JSON.stringify(flattenedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
