import { FeatureSet, Finding } from '../../types';

export const urlShortenerRule = {
  id: 'url_shortener',
  evaluate(features: FeatureSet): Finding | null {
    const shortenerUrls = features.urls.filter(u => u.is_shortener);
    if (shortenerUrls.length === 0) return null;

    return {
      rule_id: 'url_shortener',
      severity: 'medium',
      description: `URL shortener service(s) detected — may be used to hide malicious destinations`,
      evidence: { shortener_urls: shortenerUrls.map(u => u.original) },
    };
  },
};
