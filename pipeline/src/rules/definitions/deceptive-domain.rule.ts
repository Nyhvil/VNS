import { FeatureSet, Finding } from '../../types';

/**
 * An unofficial link whose domain is dressed up to look official or urgent:
 * "xacminh", "hoantien", "nangcap", "support"... Together with a brand name
 * (bidv-nangcap.top) this is a classic phishing domain.
 */
export const deceptiveDomainRule = {
  id: 'deceptive_domain',
  evaluate(features: FeatureSet): Finding | null {
    const urls = (features.knowledge?.urls ?? []).filter(u => !u.official && (u.flags.deceptive_words?.length ?? 0) > 0);
    if (urls.length === 0) return null;

    const withBrand = urls.some(u => u.flags.impersonated_brands.length > 0);
    const words = [...new Set(urls.flatMap(u => u.flags.deceptive_words ?? []))];

    return {
      rule_id: 'deceptive_domain',
      severity: withBrand ? 'critical' : 'medium',
      description: `Tên miền chứa từ dễ gây hiểu nhầm (${words.join(', ')})${withBrand ? ' kèm tên thương hiệu' : ''}`,
      evidence: { urls: urls.map(u => u.url), words },
    };
  },
};
