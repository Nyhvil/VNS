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
      delete process.env['PORT'];
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

    it('should parse LLM_ENABLED=false as boolean false', () => {
      process.env['PIPELINE_API_KEY'] = 'test-key';
      process.env['LLM_ENABLED'] = 'false';
      const config = getConfig();
      expect(config.llmEnabled).toBe(false);
    });

    it('should parse CACHE_ENABLED=false as boolean false', () => {
      process.env['PIPELINE_API_KEY'] = 'test-key';
      process.env['CACHE_ENABLED'] = 'false';
      const config = getConfig();
      expect(config.cacheEnabled).toBe(false);
    });

    it('should default to OpenAI in gray-zone mode', () => {
      process.env['PIPELINE_API_KEY'] = 'test-key';
      delete process.env['LLM_PROVIDER'];
      delete process.env['LLM_MODEL'];
      delete process.env['LLM_MODE'];
      const config = getConfig();
      expect(config.llmProvider).toBe('openai');
      expect(config.llmModel).toBe('gpt-4o-mini');
      expect(config.llmMode).toBe('gray_zone');
    });

    it('should pick the Gemini model and key when LLM_PROVIDER=gemini', () => {
      process.env['PIPELINE_API_KEY'] = 'test-key';
      process.env['LLM_PROVIDER'] = 'gemini';
      process.env['GEMINI_API_KEY'] = 'gemini-key';
      delete process.env['LLM_MODEL'];
      delete process.env['LLM_API_KEY'];
      const config = getConfig();
      expect(config.llmModel).toBe('gemini-3.8-flash');
      expect(config.llmApiKey).toBe('gemini-key');
    });

    it('should treat variables left blank in .env as unset', () => {
      process.env['PIPELINE_API_KEY'] = 'test-key';
      process.env['OPENAI_API_KEY'] = '';
      process.env['QDRANT_API_KEY'] = '  ';
      process.env['ML_SERVICE_URL'] = '';
      process.env['REDIS_URL'] = '';
      const config = getConfig();
      expect(config.openaiApiKey).toBeUndefined();
      expect(config.qdrantApiKey).toBeUndefined();
      expect(config.mlServiceUrl).toBeUndefined();
      expect(config.redisUrl).toBeUndefined();
    });

    it('should default the hybrid ML threshold to 0.9', () => {
      process.env['PIPELINE_API_KEY'] = 'test-key';
      delete process.env['ML_CONFIDENCE_THRESHOLD'];
      expect(getConfig().mlConfidenceThreshold).toBe(0.9);
    });

    it('should reject a boolean setting that is not a boolean', () => {
      process.env['PIPELINE_API_KEY'] = 'test-key';
      process.env['LLM_ENABLED'] = 'maybe';
      expect(() => getConfig()).toThrow('Configuration validation failed');
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

  describe('standalone web server settings', () => {
    const WEB_VARIABLES = [
      'WEB_ENABLED', 'WEB_DIST_DIR', 'ADMIN_PASSWORD', 'DATABASE_URL', 'DATABASE_SSL', 'DATA_DIR',
      'STORE_IMAGES', 'TRUSTED_PROXY_HOPS', 'RATE_LIMIT_PER_IP', 'RATE_LIMIT_WINDOW_MS',
      'RATE_LIMIT_GLOBAL_PER_MINUTE', 'PORT', 'PIPELINE_PORT', 'TESSERACT_LANGS',
    ];

    beforeEach(() => {
      process.env['PIPELINE_API_KEY'] = 'test-key';
      for (const name of WEB_VARIABLES) delete process.env[name];
    });

    it('should keep web mode off unless asked for', () => {
      expect(getConfig()).toMatchObject({
        webEnabled: false,
        storeImages: true,
        databaseSsl: 'auto',
        dataDir: './var',
        trustedProxyHops: 0,
        rateLimitPerIp: 20,
        rateLimitWindowMs: 300000,
        rateLimitGlobalPerMinute: 60,
      });
      expect(getConfig().adminPassword).toBeUndefined();
      expect(getConfig().databaseUrl).toBeUndefined();
    });

    it('should read the web settings from the environment', () => {
      process.env['WEB_ENABLED'] = 'true';
      process.env['ADMIN_PASSWORD'] = 'mật khẩu';
      process.env['DATABASE_URL'] = 'postgres://u:p@db.example.com/vns';
      process.env['DATABASE_SSL'] = 'verify';
      process.env['STORE_IMAGES'] = 'false';
      process.env['TRUSTED_PROXY_HOPS'] = '2';
      process.env['RATE_LIMIT_PER_IP'] = '5';

      expect(getConfig()).toMatchObject({
        webEnabled: true,
        adminPassword: 'mật khẩu',
        databaseUrl: 'postgres://u:p@db.example.com/vns',
        databaseSsl: 'verify',
        storeImages: false,
        trustedProxyHops: 2,
        rateLimitPerIp: 5,
      });
    });

    it('should treat variables left blank as not set', () => {
      process.env['ADMIN_PASSWORD'] = '';
      process.env['DATABASE_URL'] = '  ';
      process.env['DATABASE_SSL'] = '';
      expect(getConfig().adminPassword).toBeUndefined();
      expect(getConfig().databaseUrl).toBeUndefined();
      expect(getConfig().databaseSsl).toBe('auto');
    });

    it('should listen on PORT, the variable hosting platforms set', () => {
      process.env['PORT'] = '10000';
      expect(getConfig().port).toBe(10000);
    });

    it('should prefer PIPELINE_PORT over PORT', () => {
      process.env['PORT'] = '10000';
      process.env['PIPELINE_PORT'] = '4000';
      expect(getConfig().port).toBe(4000);
    });

    it('should reject an unknown DATABASE_SSL value', () => {
      process.env['DATABASE_SSL'] = 'maybe';
      expect(() => getConfig()).toThrow('Configuration validation failed');
    });

    it('should read Vietnamese and English in images by default', () => {
      expect(getConfig().tesseractLangs).toBe('vie+eng');
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

    it('should allow every address when the list is "*"', () => {
      process.env['PIPELINE_API_KEY'] = 'test-key';
      process.env['PIPELINE_ALLOWED_IPS'] = '*';
      expect(getAllowedIpList(getConfig())).toEqual([]);
    });
  });
});
