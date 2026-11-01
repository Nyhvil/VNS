import { FeatureSet, Finding, Severity } from '../../types';

/** A pattern counts as a strong match when at least this many of its keywords appear. */
const STRONG_MATCH_KEYWORDS = 2;
/** risk_weight from which a strongly matched pattern is treated as high severity. */
const HIGH_RISK_WEIGHT = 80;

/**
 * The content matches one of the common Vietnamese scam patterns (fake bank
 * asking for OTP, fake police, fake prize, easy job...).
 *
 * One keyword alone is weak evidence ("công an" appears in ordinary messages
 * too), so severity depends on how many keywords of a pattern matched.
 */
export const scamPatternRule = {
  id: 'scam_pattern',
  evaluate(features: FeatureSet): Finding | null {
    const patterns = features.knowledge?.patterns ?? [];
    if (patterns.length === 0) return null;

    const strong = patterns.filter(p => p.matched_keywords.length >= STRONG_MATCH_KEYWORDS);

    let severity: Severity = 'low';
    if (strong.some(p => p.risk_weight >= HIGH_RISK_WEIGHT)) {
      severity = 'high';
    } else if (strong.length > 0 || patterns.length >= 2) {
      severity = 'medium';
    }

    // News about scams and notices that only point to official channels share
    // the topic of a scam pattern, not its intent.
    if (features.scam_warning || features.official_notice) severity = 'low';

    const top = (strong.length > 0 ? strong : patterns).slice(0, 3);

    return {
      rule_id: 'scam_pattern',
      severity,
      description: `Khớp mẫu lừa đảo phổ biến: ${top.map(p => p.name).join('; ')}`,
      evidence: {
        patterns: patterns.map(p => ({
          id: p.id,
          name: p.name,
          risk_weight: p.risk_weight,
          keywords: p.matched_keywords,
        })),
      },
    };
  },
};
