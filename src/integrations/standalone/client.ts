/**
 * Stand-in for "@/integrations/supabase/client" in the standalone build
 * (`npm run build:standalone`, see vite.config.ts).
 *
 * In that build the web app is served by the VNS server itself (see
 * /pipeline), which answers the same /functions/v1/* addresses the Supabase
 * Edge Functions do. So the client simply points at the page's own address
 * and needs no Supabase project or key.
 */
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(window.location.origin, "vns-standalone", {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
