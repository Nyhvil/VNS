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

    // Get scans
    const { data: scans, error } = await supabaseAdmin
      .from("scans")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;

    // Get mailguard_logs
    const { data: logs } = await supabaseAdmin
      .from("mailguard_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    const allLogs = logs || [];

    // Stats from scans
    const uniqueSessions = new Set((scans || []).map((s: any) => s.session_id)).size;
    const totalScans = scans?.length || 0;
    const textScans = scans?.filter((s: any) => s.type === "text").length || 0;
    const imageScans = scans?.filter((s: any) => s.type === "image").length || 0;

    const userIds = (scans || []).map((s: any) => s.user_id).filter(Boolean);
    const uniqueUsers = new Set(userIds).size;
    const userScanCounts: Record<string, number> = {};
    for (const uid of userIds) {
      userScanCounts[uid] = (userScanCounts[uid] || 0) + 1;
    }
    const returnUsers = Object.values(userScanCounts).filter((c) => c > 1).length;

    // Stats from mailguard_logs
    const totalAnalyses = allLogs.length;
    const avgScamPercent = totalAnalyses > 0
      ? Math.round(allLogs.reduce((sum: number, l: any) => sum + (l.scam_percent || 0), 0) / totalAnalyses)
      : 0;
    const totalCharsAnalyzed = allLogs.reduce((sum: number, l: any) => sum + (l.text_length || 0), 0);

    // Returning sessions from logs
    const sessionCounts: Record<string, number> = {};
    for (const l of allLogs) {
      sessionCounts[l.session_id] = (sessionCounts[l.session_id] || 0) + 1;
    }
    const returningSessions = Object.values(sessionCounts).filter((c) => c > 1).length;

    // Feedback stats
    const correctFeedback = allLogs.filter((l: any) => l.feedback === "correct").length;
    const incorrectFeedback = allLogs.filter((l: any) => l.feedback === "incorrect").length;

    return new Response(
      JSON.stringify({
        stats: {
          uniqueSessions, totalScans, textScans, imageScans,
          uniqueUsers, returnUsers,
          totalAnalyses, avgScamPercent, totalCharsAnalyzed,
          returningSessions, correctFeedback, incorrectFeedback,
        },
        scans: scans || [],
        logs: allLogs,
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
