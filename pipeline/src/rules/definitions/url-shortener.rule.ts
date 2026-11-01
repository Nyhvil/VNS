import { FeatureSet, Finding, Severity } from '../../types';

/**
 * Short links hide where they lead. Schools and shops use them all the time
 * (bit.ly in a tuition email), so a short link alone is a weak sign; with any
 * scam signal it becomes a warning.
 */
export const urlShortenerRule = {
  id: 'url_shortener',
  evaluate(features: FeatureSet): Finding | null {
    const shortenerUrls = features.urls.filter(u => u.is_shortener);
    if (shortenerUrls.length === 0) return null;

    const severity: Severity = (features.signals ?? []).length > 0 ? 'medium' : 'low';

    return {
      rule_id: 'url_shortener',
      severity,
      description: `URL shortener service(s) detected — may be used to hide malicious destinations`,
      evidence: { shortener_urls: shortenerUrls.map(u => u.original) },
    };
  },
};
