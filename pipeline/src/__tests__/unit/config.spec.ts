import { getConfig, resetConfig, getAllowedIpList } from '../../config/config';

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    resetConfig();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetConfig();
  });

  describe('getConfig()', () => {
    it('should load config with valid PIPELINE_API_KEY', () => {
      process.env['PIPELINE_API_KEY'] = 'test-api-key';
      const config = getConfig();
      expect(config.apiKey).toBe('test-api-key');
    });

    it('should use default port 3001 when PIPELINE_PORT is not set', () => {
      process.env['PIPELINE_API_KEY'] = 'test-key';
      delete process.env['PIPELINE_PORT'];
      const config = getConfig();
      expect(config.port).toBe(3001);
    });

    it('should parse PIPELINE_PORT as number', () => {
      process.env['PIPELINE_API_KEY'] = 'test-key';
      process.env['PIPELINE_PORT'] = '4000';
      const config = getConfig();
      expect(config.port).toBe(4000);
    });

    it('should default llmEnabled to false', () => {
      process.env['PIPELINE_API_KEY'] = 'test-key';
      delete process.env['LLM_ENABLED'];
      const config = getConfig();
      expect(config.llmEnabled).toBe(false);
    });

    it('should parse LLM_ENABLED=true as boolean true', () => {
      process.env['PIPELINE_API_KEY'] = 'test-key';
      process.env['LLM_ENABLED'] = 'true';
      const config = getConfig();
      expect(config.llmEnabled).toBe(true);
    });

    it('should default ragSimilarityThreshold to 0.75', () => {
      process.env['PIPELINE_API_KEY'] = 'test-key';
      const config = getConfig();
      expect(config.ragSimilarityThreshold).toBe(0.75);
    });

    it('should return same instance on multiple calls (singleton)', () => {
      process.env['PIPELINE_API_KEY'] = 'test-key';
      const config1 = getConfig();
      const config2 = getConfig();
      expect(config1).toBe(config2);
    });

    it('should throw when PIPELINE_API_KEY is empty string', () => {
      process.env['PIPELINE_API_KEY'] = '';
      expect(() => getConfig()).toThrow('Configuration validation failed');
    });
  });

  describe('getAllowedIpList()', () => {
    it('should parse comma-separated IPs', () => {
      process.env['PIPELINE_API_KEY'] = 'test-key';
      process.env['PIPELINE_ALLOWED_IPS'] = '127.0.0.1,192.168.1.1,::1';
      const config = getConfig();
      const ips = getAllowedIpList(config);
      expect(ips).toEqual(['127.0.0.1', '192.168.1.1', '::1']);
    });

    it('should trim whitespace from IPs', () => {
      process.env['PIPELINE_API_KEY'] = 'test-key';
      process.env['PIPELINE_ALLOWED_IPS'] = '127.0.0.1 , 192.168.1.1 ';
      const config = getConfig();
      const ips = getAllowedIpList(config);
      expect(ips).toEqual(['127.0.0.1', '192.168.1.1']);
    });

    it('should return default IPs when PIPELINE_ALLOWED_IPS is not set', () => {
      process.env['PIPELINE_API_KEY'] = 'test-key';
      delete process.env['PIPELINE_ALLOWED_IPS'];
      const config = getConfig();
      const ips = getAllowedIpList(config);
      expect(ips).toContain('127.0.0.1');
    });
  });
});
