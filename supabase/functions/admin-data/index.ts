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
    const { password } = await req.json();
    const adminPassword = Deno.env.get("ADMIN_PASSWORD");

    if (!adminPassword || password !== adminPassword) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all scans
    const { data: scans, error } = await supabaseAdmin
      .from("scans")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    // Compute stats
    const uniqueSessions = new Set((scans || []).map((s: any) => s.session_id)).size;
    const totalScans = scans?.length || 0;
    const textScans = scans?.filter((s: any) => s.type === "text").length || 0;
    const imageScans = scans?.filter((s: any) => s.type === "image").length || 0;

    return new Response(
      JSON.stringify({
        stats: { uniqueSessions, totalScans, textScans, imageScans },
        scans: scans || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("admin-data error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
