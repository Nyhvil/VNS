import { FeatureSet, Finding, Severity } from '../../types';

/**
 * The content names a verified Vietnamese organisation but carries a link that
 * is not on any official domain. On its own this is only a weak sign: a
 * genuine message may mention a bank and link to a news article or a shop. It
 * becomes a warning when the link itself looks wrong or the content also asks
 * for something or puts pressure on the reader.
 */
export const entityUnofficialLinkRule = {
  id: 'entity_unofficial_link',
  evaluate(features: FeatureSet): Finding | null {
    const knowledge = features.knowledge;
    if (!knowledge || knowledge.entities.length === 0) return null;

    const unofficial = knowledge.urls.filter(u => !u.official);
    if (unofficial.length === 0) return null;

    const entities = [...new Set(knowledge.entities.flatMap(e => e.found))].slice(0, 5);
    const corroborated = unofficial.some(u => u.suspicious) || (features.signals ?? []).length > 0;
    const severity: Severity = corroborated ? 'medium' : 'low';

    return {
      rule_id: 'entity_unofficial_link',
      severity,
      description: `Nội dung nhắc tới ${entities.join(', ')} nhưng link không thuộc tên miền chính thức`,
      evidence: { entities, urls: unofficial.map(u => u.url) },
    };
  },
};
