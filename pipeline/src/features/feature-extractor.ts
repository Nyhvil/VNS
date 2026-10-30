import { ParsedContent, FeatureSet, NormalizedUrl } from '../types';
import { isParsedEmail } from '../types';
import { normalizeAndAnalyzeUrl } from './url-normalizer';
import { detectSuspiciousKeywords } from './keyword-detector';
import { checkKnowledge } from '../knowledge';
import { detectSignals, isOfficialNotice, isOneTimeCodeNotice, isScamWarning } from '../knowledge/scam-signals';

// Checks that a genuine one-time-code message would trip.
const OTP_KEYWORDS = new Set(['mã otp', 'mã xác thực', 'cung cấp mã']);
const OTP_PATTERNS = new Set(['fake_bank_otp', 'sim_swap']);

/**
 * Signals, and the exceptions for content that only looks like a scam: a
 * genuine one-time-code message, a news article or warning about scams, and a
 * notice that only points to official channels.
 */
function withSignals(features: FeatureSet, text: string): FeatureSet {
  const links = features.knowledge?.urls ?? [];
  const flaggedLinks = links.filter(u => u.suspicious).length;

  if (isScamWarning(text, flaggedLinks)) {
    return { ...features, signals: [], scam_warning: true, one_time_code_notice: false, official_notice: false };
  }

  const notice = isOneTimeCodeNotice(text, flaggedLinks);
  let result: FeatureSet = { ...features, signals: detectSignals(text), one_time_code_notice: notice };
  if (notice) {
    result = {
      ...result,
      suspicious_keywords: features.suspicious_keywords.filter(k => !OTP_KEYWORDS.has(k)),
      knowledge: features.knowledge && {
        ...features.knowledge,
        patterns: features.knowledge.patterns.filter(p => !OTP_PATTERNS.has(p.id)),
      },
      signals: (result.signals ?? []).filter(s => s.id !== 'code_request'),
    };
  }
  return { ...result, official_notice: isOfficialNotice(text, links, result.signals ?? []) };
}

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

    return withSignals({
      sender_domain: senderDomain,
      reply_to_domain: replyToDomain,
      urls: normalizedUrls,
      suspicious_keywords: suspiciousKeywords,
      domain_mismatch: domainMismatch,
      spf_result: content.spf_result,
      dkim_result: content.dkim_result,
      knowledge: checkKnowledge(textForKeywords, content.urls),
    }, textForKeywords);
  } else {
    // Plain text content
    const normalizedUrls: NormalizedUrl[] = content.urls.map(normalizeAndAnalyzeUrl);
    const suspiciousKeywords = detectSuspiciousKeywords(content.body);

    return withSignals({
      sender_domain: null,
      reply_to_domain: null,
      urls: normalizedUrls,
      suspicious_keywords: suspiciousKeywords,
      domain_mismatch: false,
      spf_result: null,
      dkim_result: null,
      knowledge: checkKnowledge(content.body, content.urls),
    }, content.body);
  }
}
