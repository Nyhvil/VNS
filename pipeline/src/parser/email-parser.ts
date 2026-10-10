import { simpleParser, ParsedMail } from 'mailparser';
import { ParsedEmail } from '../types';

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

function extractUrlsFromText(text: string): string[] {
  const matches = text.match(URL_REGEX) ?? [];
  return [...new Set(matches)];
}

function extractSpfResult(headers: Map<string, string | string[]>): 'pass' | 'fail' | 'none' | null {
  const authResults = headers.get('authentication-results');
  if (!authResults) return null;
  const authStr = (Array.isArray(authResults) ? authResults.join(' ') : authResults).toLowerCase();
  if (!authStr) return null;
  if (authStr.includes('spf=pass')) return 'pass';
  if (authStr.includes('spf=fail') || authStr.includes('spf=softfail')) return 'fail';
  if (authStr.includes('spf=none') || authStr.includes('spf=neutral')) return 'none';
  return null;
}

function extractDkimResult(headers: Map<string, string | string[]>): 'pass' | 'fail' | 'none' | null {
  const authResults = headers.get('authentication-results');
  if (!authResults) return null;
  const authStr = (Array.isArray(authResults) ? authResults.join(' ') : authResults).toLowerCase();
  if (!authStr) return null;
  if (authStr.includes('dkim=pass')) return 'pass';
  if (authStr.includes('dkim=fail')) return 'fail';
  if (authStr.includes('dkim=none')) return 'none';
  return null;
}

function extractOriginatingIp(headers: Map<string, string | string[]>): string | null {
  const receivedRaw = headers.get('received');
  const receivedHeaders: string[] = !receivedRaw
    ? []
    : Array.isArray(receivedRaw)
    ? receivedRaw
    : [receivedRaw];
  for (const received of receivedHeaders) {
    const ipMatch = received.match(/\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]/);
    if (ipMatch?.[1]) return ipMatch[1];
  }
  return null;
}

function headersToRecord(parsed: ParsedMail): Record<string, string> {
  const result: Record<string, string> = {};
  if (parsed.headers) {
    parsed.headers.forEach((value, key) => {
      if (typeof value === 'string') {
        result[key] = value;
      } else if (Array.isArray(value)) {
        result[key] = value.join(', ');
      } else if (value && typeof value === 'object' && 'text' in value) {
        result[key] = (value as any).text ?? '';
      }
    });
  }
  return result;
}

export async function parseEmail(content: string): Promise<ParsedEmail> {
  const parsed = await simpleParser(content);

  const htmlText = typeof parsed.html === 'string' ? parsed.html.replace(/<[^>]+>/g, ' ') : '';
  const bodyText = parsed.text ?? htmlText ?? '';
  const urls = extractUrlsFromText(bodyText);

  // Also extract URLs from HTML if available
  if (typeof parsed.html === 'string') {
    const htmlUrls = extractUrlsFromText(parsed.html);
    for (const url of htmlUrls) {
      if (!urls.includes(url)) urls.push(url);
    }
  }

  const headersMap = parsed.headers as Map<string, string | string[]>;
  const spf_result = extractSpfResult(headersMap);
  const dkim_result = extractDkimResult(headersMap);
  const originating_ip = extractOriginatingIp(headersMap);

  const sender = parsed.from?.value?.[0]?.address ?? null;
  const reply_to = parsed.replyTo?.value?.[0]?.address ?? null;

  const attachments = (parsed.attachments ?? []).map(
    att => att.filename ?? att.contentType ?? 'unknown'
  );

  return {
    sender,
    reply_to,
    subject: parsed.subject ?? null,
    body: bodyText,
    urls,
    attachments,
    headers: headersToRecord(parsed),
    spf_result,
    dkim_result,
    originating_ip,
  };
}
