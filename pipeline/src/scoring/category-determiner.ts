import { Finding, RagResult, Category } from '../types';

export function determineCategory(
  violations: Finding[],
  ragResult: RagResult,
  riskScore: number
): Category {
  // Unreadable image is handled upstream
  if (violations.length === 0 && riskScore < 30) {
    return 'safe';
  }

  const hasHighSeverityViolation = violations.some(
    v => v.severity === 'critical' || v.severity === 'high'
  );

  const isSimilarToKnownPhishing = ragResult.top_score > 0.75;

  if (hasHighSeverityViolation && isSimilarToKnownPhishing) {
    return 'phishing';
  }

  if (hasHighSeverityViolation || isSimilarToKnownPhishing) {
    return 'phishing';
  }

  // Check for spam patterns (keyword-heavy but no auth failures)
  const hasKeywordViolation = violations.some(v => v.rule_id === 'suspicious_keyword');
  const hasAuthFailure = violations.some(
    v => v.rule_id === 'spf_fail' || v.rule_id === 'dkim_fail'
  );

  if (hasKeywordViolation && !hasAuthFailure && riskScore >= 30) {
    return 'spam';
  }

  if (violations.length > 0 || riskScore >= 30) {
    return 'suspicious';
  }

  return 'safe';
}
