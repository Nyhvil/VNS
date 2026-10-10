import { ParsedText } from '../types';

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

export function extractUrlsFromText(text: string): string[] {
  const matches = text.match(URL_REGEX) ?? [];
  return [...new Set(matches)];
}

export function parsePlainText(content: string): ParsedText {
  const urls = extractUrlsFromText(content);
  return {
    body: content,
    urls,
  };
}
