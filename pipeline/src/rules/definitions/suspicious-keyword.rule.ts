import { FeatureSet, Finding } from '../../types';

export const suspiciousKeywordRule = {
  id: 'suspicious_keyword',
  evaluate(features: FeatureSet): Finding | null {
    if (features.suspicious_keywords.length === 0) return null;

    const severity = features.suspicious_keywords.length >= 3 ? 'medium' : 'low';

    return {
      rule_id: 'suspicious_keyword',
      severity,
      description: `Suspicious keywords detected: ${features.suspicious_keywords.slice(0, 5).join(', ')}`,
      evidence: { keywords: features.suspicious_keywords },
    };
  },
};
