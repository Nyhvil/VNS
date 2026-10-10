import { FeatureSet, RuleResult, Finding } from '../types';
import { spfFailRule } from './definitions/spf-fail.rule';
import { dkimFailRule } from './definitions/dkim-fail.rule';
import { domainMismatchRule } from './definitions/domain-mismatch.rule';
import { suspiciousKeywordRule } from './definitions/suspicious-keyword.rule';
import { ipUrlRule } from './definitions/ip-url.rule';
import { urlShortenerRule } from './definitions/url-shortener.rule';

interface Rule {
  id: string;
  evaluate(features: FeatureSet): Finding | null;
}

const ALL_RULES: Rule[] = [
  spfFailRule,
  dkimFailRule,
  domainMismatchRule,
  suspiciousKeywordRule,
  ipUrlRule,
  urlShortenerRule,
];

// Severity weights for score calculation
const SEVERITY_WEIGHTS: Record<string, number> = {
  critical: 100,
  high: 75,
  medium: 40,
  low: 15,
};

function calculateRuleScore(violations: Finding[]): number {
  if (violations.length === 0) return 0;

  // Score based on highest severity + bonus for multiple violations
  const maxSeverityScore = Math.max(
    ...violations.map(v => SEVERITY_WEIGHTS[v.severity] ?? 0)
  );
  const bonusScore = Math.min(violations.length * 5, 25);

  return Math.min(100, maxSeverityScore + bonusScore);
}

export function evaluateRules(features: FeatureSet): RuleResult {
  const violations: Finding[] = [];

  for (const rule of ALL_RULES) {
    try {
      const finding = rule.evaluate(features);
      if (finding !== null) {
        violations.push(finding);
      }
    } catch {
      // Individual rule failure should not stop other rules
    }
  }

  return {
    violations,
    score: calculateRuleScore(violations),
  };
}
