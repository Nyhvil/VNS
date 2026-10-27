import { ParsedText } from '../types';
import { extractUrls } from './url-extractor';

/** Links in the text, with or without "http://" (see url-extractor.ts). */
export function extractUrlsFromText(text: string): string[] {
  return extractUrls(text);
}

export function parsePlainText(content: string): ParsedText {
  const urls = extractUrlsFromText(content);
  return {
    body: content,
    urls,
  };
}
