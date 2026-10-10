/**
 * supabase.functions.invoke() reports any non-2xx answer with a generic
 * message. The functions of this app put a message meant for the user in the
 * response body ({ "error": "..." }); this digs it out.
 */
export async function getFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context;

  if (context && typeof (context as Response).json === "function") {
    try {
      const body = await (context as Response).clone().json();
      if (body && typeof body.error === "string" && body.error.trim()) {
        return body.error;
      }
    } catch {
      // The body was not JSON; use the fallback below.
    }
  }

  return fallback;
}
