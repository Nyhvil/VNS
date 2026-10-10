import { FeatureSet, Finding } from '../../types';

export const suspiciousTldRule = {
  id: 'suspicious_tld',
  evaluate(features: FeatureSet): Finding | null {
    const urls = (features.knowledge?.urls ?? []).filter(u => u.flags.suspicious_tld);
    if (urls.length === 0) return null;

    return {
      rule_id: 'suspicious_tld',
      severity: 'medium',
      description: 'Link có đuôi tên miền thường gặp ở trang lừa đảo',
      evidence: { urls: urls.map(u => u.url) },
    };
  },
};
