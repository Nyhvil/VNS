import { ParsedContent, FeatureSet, NormalizedUrl } from '../types';
import { isParsedEmail } from '../types';
import { normalizeAndAnalyzeUrl } from './url-normalizer';
import { detectSuspiciousKeywords } from './keyword-detector';
import { checkKnowledge } from '../knowledge';

function extractDomain(email: string | null): string | null {
  if (!email) return null;
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) return null;
  return email.slice(atIndex + 1).toLowerCase();
}

export function extractFeatures(content: ParsedContent): FeatureSet {
  if (isParsedEmail(content)) {
    // Email content
    const senderDomain = extractDomain(content.sender);
    const replyToDomain = extractDomain(content.reply_to);

    const normalizedUrls: NormalizedUrl[] = content.urls.map(normalizeAndAnalyzeUrl);

    const textForKeywords = [content.subject ?? '', content.body].join(' ');
    const suspiciousKeywords = detectSuspiciousKeywords(textForKeywords);

    const domainMismatch =
      senderDomain !== null &&
      replyToDomain !== null &&
      senderDomain !== replyToDomain;

    return {
      sender_domain: senderDomain,
      reply_to_domain: replyToDomain,
      urls: normalizedUrls,
      suspicious_keywords: suspiciousKeywords,
      domain_mismatch: domainMismatch,
      spf_result: content.spf_result,
      dkim_result: content.dkim_result,
      knowledge: checkKnowledge(textForKeywords, content.urls),
    };
  } else {
    // Plain text content
    const normalizedUrls: NormalizedUrl[] = content.urls.map(normalizeAndAnalyzeUrl);
    const suspiciousKeywords = detectSuspiciousKeywords(content.body);

    return {
      sender_domain: null,
      reply_to_domain: null,
      urls: normalizedUrls,
      suspicious_keywords: suspiciousKeywords,
      domain_mismatch: false,
      spf_result: null,
      dkim_result: null,
      knowledge: checkKnowledge(content.body, content.urls),
    };
  }
}
