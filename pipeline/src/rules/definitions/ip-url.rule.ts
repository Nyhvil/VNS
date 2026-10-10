import { FeatureSet, Finding } from '../../types';

export const ipUrlRule = {
  id: 'ip_url',
  evaluate(features: FeatureSet): Finding | null {
    const ipUrls = features.urls.filter(u => u.is_ip_based);
    if (ipUrls.length === 0) return null;

    return {
      rule_id: 'ip_url',
      severity: 'high',
      description: `URL(s) using IP address instead of domain name detected — common phishing technique`,
      evidence: { ip_urls: ipUrls.map(u => u.original) },
    };
  },
};
