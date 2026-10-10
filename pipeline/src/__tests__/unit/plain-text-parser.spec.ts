import { parsePlainText, extractUrlsFromText } from '../../parser/plain-text-parser';

describe('Plain Text Parser', () => {
  describe('extractUrlsFromText()', () => {
    it('should extract HTTP URLs', () => {
      const text = 'Visit http://example.com for more info';
      const urls = extractUrlsFromText(text);
      expect(urls).toContain('http://example.com');
    });

    it('should extract HTTPS URLs', () => {
      const text = 'Visit https://secure.example.com/path?q=1';
      const urls = extractUrlsFromText(text);
      expect(urls).toContain('https://secure.example.com/path?q=1');
    });

    it('should extract multiple URLs', () => {
      const text = 'Go to http://a.com and https://b.com';
      const urls = extractUrlsFromText(text);
      expect(urls).toHaveLength(2);
    });

    it('should return empty array when no URLs', () => {
      const text = 'No links here, just plain text.';
      const urls = extractUrlsFromText(text);
      expect(urls).toEqual([]);
    });

    it('should deduplicate URLs', () => {
      const text = 'http://example.com and http://example.com again';
      const urls = extractUrlsFromText(text);
      expect(urls).toHaveLength(1);
    });
  });

  describe('parsePlainText()', () => {
    it('should return body as the original content', () => {
      const content = 'Hello world http://example.com';
      const result = parsePlainText(content);
      expect(result.body).toBe(content);
    });

    it('should extract URLs from content', () => {
      const content = 'Click https://phishing.com/steal';
      const result = parsePlainText(content);
      expect(result.urls).toContain('https://phishing.com/steal');
    });

    it('should return empty urls array for text without URLs', () => {
      const result = parsePlainText('No URLs here');
      expect(result.urls).toEqual([]);
    });
  });
});
