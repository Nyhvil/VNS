import verifiedEntities from './verified_entities_2026.json';
import { EntityMention } from '../types';
import { prepareText, containsKeyword } from './text-match';

const ENTITY_CATEGORIES: Array<[string, string[]]> = Object.entries(verifiedEntities)
  .filter(([category]) => category !== 'official_domains')
  .map(([category, names]) => [category, names as string[]]);

/**
 * Names that are also ordinary words ("Be" in English text, "Local" in "local
 * news"). They count only next to a word that shows the brand is meant
 * ("app Be", "nhà mạng Local").
 */
const AMBIGUOUS_NAMES: Record<string, RegExp> = {
  Be: /(?:^|[\s(])(?:app|ứng dụng|ung dung|tài xế|tai xe|xe|chuyến|chuyen|ví|đơn|don|đặt|dat)\s+Be\b|\bBe\s+(?:Group|bike|car|Delivery|Financial)\b/iu,
  Local: /(?:^|[\s(])(?:nhà mạng|nha mang|mạng|mang|sim|thuê bao|thue bao|app|ứng dụng|ung dung)\s+Local\b|\bMy ?Local\b/iu,
};

function mentions(text: string, prepared: ReturnType<typeof prepareText>, name: string): boolean {
  const context = AMBIGUOUS_NAMES[name];
  if (context) return context.test(text);
  return containsKeyword(prepared, name);
}

/** Verified Vietnamese organisations (banks, e-wallets, agencies...) named in the text. */
export function findEntities(text: string): EntityMention[] {
  const prepared = prepareText(text);
  const found: EntityMention[] = [];

  for (const [category, names] of ENTITY_CATEGORIES) {
    const named = names.filter(name => mentions(text, prepared, name));
    if (named.length > 0) {
      found.push({ category, found: named, verified: true });
    }
  }

  return found;
}
