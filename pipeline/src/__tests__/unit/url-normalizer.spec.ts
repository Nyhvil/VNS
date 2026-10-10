import { normalizeUrl, isIpBasedUrl, isUrlShortener, normalizeAndAnalyzeUrl } from '../../features/url-normalizer';

describe('URL Normalizer', () => {
  describe('normalizeUrl()', () => {
    it('should lowercase scheme and host', () => {
      expect(normalizeUrl('HTTP://EXAMPLE.COM/Path')).toBe('http://example.com/Path');
    });

    it('should preserve path case', () => {
      expect(normalizeUrl('https://example.com/SomePath')).toBe('https://example.com/SomePath');
    });

    it('should handle URLs with query strings', () => {
      const result = normalizeUrl('https://EXAMPLE.COM/path?q=1&r=2');
      expect(result).toBe('https://example.com/path?q=1&r=2');
    });

    it('should handle URLs with ports', () => {
      const result = normalizeUrl('https://example.com:8080/path');
      expect(result).toBe('https://example.com:8080/path');
    });

    it('should return lowercase for invalid URLs', () => {
      const result = normalizeUrl('not-a-url');
      expect(result).toBe('not-a-url');
    });

    it('should be idempotent (normalizing twice = normalizing once)', () => {
      const url = 'HTTPS://EXAMPLE.COM/Path?q=1';
      const once = normalizeUrl(url);
      const twice = normalizeUrl(once);
      expect(once).toBe(twice);
    });
  });

  describe('isIpBasedUrl()', () => {
    it('should detect IPv4-based URLs', () => {
      expect(isIpBasedUrl('http://192.168.1.1/phishing')).toBe(true);
    });

    it('should detect IPv4 URLs with port', () => {
      expect(isIpBasedUrl('https://10.0.0.1:8080/path')).toBe(true);
    });

    it('should return false for domain-based URLs', () => {
      expect(isIpBasedUrl('https://example.com/path')).toBe(false);
    });

    it('should return false for non-URLs', () => {
      expect(isIpBasedUrl('not-a-url')).toBe(false);
    });
  });

  describe('isUrlShortener()', () => {
    it('should detect bit.ly as shortener', () => {
      expect(isUrlShortener('https://bit.ly/abc123')).toBe(true);
    });

    it('should detect tinyurl.com as shortener', () => {
      expect(isUrlShortener('http://tinyurl.com/xyz')).toBe(true);
    });

    it('should return false for regular domains', () => {
      expect(isUrlShortener('https://example.com/path')).toBe(false);
    });

    it('should return false for invalid URLs', () => {
      expect(isUrlShortener('not-a-url')).toBe(false);
    });
  });

  describe('normalizeAndAnalyzeUrl()', () => {
    it('should return NormalizedUrl with all fields', () => {
      const result = normalizeAndAnalyzeUrl('http://192.168.1.1/phish');
      expect(result.original).toBe('http://192.168.1.1/phish');
      expect(result.is_ip_based).toBe(true);
      expect(result.is_shortener).toBe(false);
    });

    it('should flag bit.ly as shortener', () => {
      const result = normalizeAndAnalyzeUrl('https://bit.ly/abc');
      expect(result.is_shortener).toBe(true);
      expect(result.is_ip_based).toBe(false);
    });
  });
});
