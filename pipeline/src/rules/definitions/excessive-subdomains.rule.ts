import { FeatureSet, Finding } from '../../types';

export const excessiveSubdomainsRule = {
  id: 'excessive_subdomains',
  evaluate(features: FeatureSet): Finding | null {
    const urls = (features.knowledge?.urls ?? []).filter(u => u.flags.many_subdomains);
    if (urls.length === 0) return null;

    return {
      rule_id: 'excessive_subdomains',
      severity: 'medium',
      description: 'Link có quá nhiều subdomain, thường dùng để che tên miền thật',
      evidence: { urls: urls.map(u => u.url) },
    };
  },
};
