import { FeatureSet, Finding } from '../../types';

/**
 * A link whose domain contains a well-known Vietnamese brand name but is not
 * one of that brand's official domains, e.g. vietcombank-secure.xyz.
 */
export const brandImpersonationRule = {
  id: 'brand_impersonation_url',
  evaluate(features: FeatureSet): Finding | null {
    const urls = (features.knowledge?.urls ?? []).filter(u => u.flags.impersonated_brands.length > 0);
    if (urls.length === 0) return null;

    const brands = [...new Set(urls.flatMap(u => u.flags.impersonated_brands))];

    return {
      rule_id: 'brand_impersonation_url',
      severity: 'high',
      description: `Link dùng tên thương hiệu (${brands.join(', ')}) nhưng không thuộc tên miền chính thức`,
      evidence: { urls: urls.map(u => u.url), brands },
    };
  },
};
