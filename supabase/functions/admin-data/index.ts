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

    // Get scans (limited for table display only)
    const { data: scans, error } = await supabaseAdmin
      .from("scans")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;

    // Get mailguard_logs (limited for display only)
    const { data: logs } = await supabaseAdmin
      .from("mailguard_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    const allLogs = logs || [];

    // ----- ACCURATE STATS: query full tables, not limited arrays -----
    // Fetch ALL session_id / user_id (lightweight columns) for accurate counts
    const fetchAll = async (table: string, columns: string) => {
      const rows: any[] = [];
      const pageSize = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select(columns)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return rows;
    };

    const allScanIds = await fetchAll("scans", "session_id,user_id,type");
    const allLogIds = await fetchAll("mailguard_logs", "session_id,user_id,text_length,scam_percent,feedback");

    // Stats from scans (full table)
    const uniqueSessions = new Set(allScanIds.map((s: any) => s.session_id).filter(Boolean)).size;
    const totalScans = allScanIds.length;
    const textScans = allScanIds.filter((s: any) => s.type === "text").length;
    const imageScans = allScanIds.filter((s: any) => s.type === "image").length;

    const userIds = allScanIds.map((s: any) => s.user_id).filter(Boolean);
    const uniqueUsers = new Set(userIds).size;
    const userScanCounts: Record<string, number> = {};
    for (const uid of userIds) {
      userScanCounts[uid] = (userScanCounts[uid] || 0) + 1;
    }
    const returnUsers = Object.values(userScanCounts).filter((c) => c > 1).length;

    // Stats from mailguard_logs (full table)
    const totalAnalyses = allLogIds.length;
    const avgScamPercent = totalAnalyses > 0
      ? Math.round(allLogIds.reduce((sum: number, l: any) => sum + (l.scam_percent || 0), 0) / totalAnalyses)
      : 0;
    const totalCharsAnalyzed = allLogIds.reduce((sum: number, l: any) => sum + (l.text_length || 0), 0);

    const sessionCounts: Record<string, number> = {};
    for (const l of allLogIds) {
      sessionCounts[l.session_id] = (sessionCounts[l.session_id] || 0) + 1;
    }
    const returningSessions = Object.values(sessionCounts).filter((c) => c > 1).length;

    const correctFeedback = allLogIds.filter((l: any) => l.feedback === "correct").length;
    const incorrectFeedback = allLogIds.filter((l: any) => l.feedback === "incorrect").length;


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
