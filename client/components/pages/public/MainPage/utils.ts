export function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function normalizeQuillHtml(html: string): string {
  const trimmed = html
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00A0/g, " ")
    .trim();
  const singleP = trimmed.match(/^<p>([\s\S]*)<\/p>$/i);
  if (!singleP) return trimmed;
  return singleP[1].replace(/<br\s*\/?>/gi, " ").trim();
}
