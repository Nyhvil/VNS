import { KnowledgeFindings } from '../types';
import { checkUrlsSafety } from './url-safety';
import { findEntities } from './entity-checker';
import { matchScamPatterns } from './scam-patterns';

export { checkUrlSafety, checkUrlsSafety, isOfficialDomain, OFFICIAL_DOMAINS } from './url-safety';
export { findEntities } from './entity-checker';
export { matchScamPatterns, SCAM_PATTERNS } from './scam-patterns';

/**
 * Check a piece of content against the Vietnamese knowledge base: official
 * domains, verified organisations and common scam patterns.
 */
export function checkKnowledge(text: string, urls: string[]): KnowledgeFindings {
  return {
    urls: checkUrlsSafety(urls),
    entities: findEntities(text),
    patterns: matchScamPatterns(text),
  };
}
