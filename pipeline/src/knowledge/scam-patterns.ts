import scamPatterns from './vietnam_scam_patterns.json';
import { ScamPatternMatch } from '../types';
import { prepareText, containsKeyword } from './text-match';

export interface ScamPattern {
  id: string;
  name: string;
  keywords: string[];
  description: string;
  risk_weight: number;
}

export const SCAM_PATTERNS: ScamPattern[] = scamPatterns.patterns;

/** Common Vietnamese scam patterns whose keywords appear in the text, most dangerous first. */
export function matchScamPatterns(text: string): ScamPatternMatch[] {
  const prepared = prepareText(text);
  const matches: ScamPatternMatch[] = [];

  for (const pattern of SCAM_PATTERNS) {
    const matchedKeywords = pattern.keywords.filter(keyword => containsKeyword(prepared, keyword));
    if (matchedKeywords.length > 0) {
      matches.push({
        id: pattern.id,
        name: pattern.name,
        description: pattern.description,
        risk_weight: pattern.risk_weight,
        matched_keywords: matchedKeywords,
      });
    }
  }

  return matches.sort((a, b) => b.risk_weight - a.risk_weight);
}
