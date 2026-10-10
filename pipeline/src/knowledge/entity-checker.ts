import verifiedEntities from './verified_entities_2026.json';
import { EntityMention } from '../types';
import { prepareText, containsKeyword } from './text-match';

const ENTITY_CATEGORIES: Array<[string, string[]]> = Object.entries(verifiedEntities)
  .filter(([category]) => category !== 'official_domains')
  .map(([category, names]) => [category, names as string[]]);

/** Verified Vietnamese organisations (banks, e-wallets, agencies...) named in the text. */
export function findEntities(text: string): EntityMention[] {
  const prepared = prepareText(text);
  const mentions: EntityMention[] = [];

  for (const [category, names] of ENTITY_CATEGORIES) {
    const found = names.filter(name => containsKeyword(prepared, name));
    if (found.length > 0) {
      mentions.push({ category, found, verified: true });
    }
  }

  return mentions;
}
