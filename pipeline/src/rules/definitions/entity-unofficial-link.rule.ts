import { FeatureSet, Finding } from '../../types';

/**
 * The content names a verified Vietnamese organisation but carries a link that
 * is not on any official domain. On its own this is only a warning sign: a
 * genuine message may mention a bank and link to a news article.
 */
export const entityUnofficialLinkRule = {
  id: 'entity_unofficial_link',
  evaluate(features: FeatureSet): Finding | null {
    const knowledge = features.knowledge;
    if (!knowledge || knowledge.entities.length === 0) return null;

    const unofficial = knowledge.urls.filter(u => !u.official);
    if (unofficial.length === 0) return null;

    const entities = [...new Set(knowledge.entities.flatMap(e => e.found))].slice(0, 5);

    return {
      rule_id: 'entity_unofficial_link',
      severity: 'medium',
      description: `Nội dung nhắc tới ${entities.join(', ')} nhưng link không thuộc tên miền chính thức`,
      evidence: { entities, urls: unofficial.map(u => u.url) },
    };
  },
};
