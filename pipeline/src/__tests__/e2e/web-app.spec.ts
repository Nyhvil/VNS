import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import request from 'supertest';
import { createApp } from '../../app';
import { FileStore } from '../../web/file-store';
import { WebDeps } from '../../web/web-router';

jest.mock('../../config/config', () => ({
  getConfig: jest.fn(() => ({ apiKey: 'test-api-key', allowedIps: '', llmEnabled: false })),
  getAllowedIpList: jest.fn(() => []),
}));

jest.mock('../../logger/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
  logAnalysisReceived: jest.fn(),
  logAnalysisCompleted: jest.fn(),
  logLayerError: jest.fn(),
}));

jest.mock('../../orchestrator/analysis-orchestrator', () => ({
  runAnalysis: jest.fn(),
}));

describe('createApp()', () => {
  let dir: string;
  let distDir: string;
  let deps: WebDeps;

  beforeEach(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vns-app-'));
    distDir = path.join(dir, 'dist');
    fs.mkdirSync(path.join(distDir, 'assets'), { recursive: true });
    fs.writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><div id="root"></div>');
    fs.writeFileSync(path.join(distDir, 'assets', 'index-abc123.js'), 'console.log(1)');
    fs.writeFileSync(path.join(distDir, 'favicon.png'), 'png');

    const store = new FileStore(path.join(dir, 'var'));
    await store.init();
    deps = {
      store,
      analyze: jest.fn(),
      chat: jest.fn(),
      logError: jest.fn(),
      settings: {
        adminPassword: 'secret',
        storeImages: true,
        trustedProxyHops: 0,
        rateLimitPerIp: 100,
        rateLimitWindowMs: 60_000,
        rateLimitGlobalPerMinute: 0,
      },
    };
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  describe('with the web app', () => {
    const build = () => createApp({ web: { deps, distDir } });

    it('should serve the web app at / and at its own routes such as /admin', async () => {
      for (const url of ['/', '/admin', '/admin-dashboard', '/some/unknown/page']) {
        const response = await request(build()).get(url);
        expect(response.status).toBe(200);
        expect(response.text).toContain('<div id="root">');
        expect(response.headers['cache-control']).toBe('no-cache');
      }
    });

    it('should serve hashed assets with a long cache and other files without it', async () => {
      const asset = await request(build()).get('/assets/index-abc123.js');
      expect(asset.status).toBe(200);
      expect(asset.headers['cache-control']).toContain('immutable');

      const favicon = await request(build()).get('/favicon.png');
      expect(favicon.status).toBe(200);
      expect(favicon.headers['cache-control']).not.toContain('immutable');
    });

    it('should answer 404, not the web app, for a missing file or an unknown API address', async () => {
      for (const url of ['/assets/missing.js', '/pipeline/unknown', '/functions/v1/unknown', '/uploads/x']) {
        const response = await request(build()).get(url);
        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: 'Not found' });
      }
    });

    it('should not serve files outside the build folder', async () => {
      fs.writeFileSync(path.join(dir, 'secret.txt'), 'top secret');
      const response = await request(build()).get('/..%2Fsecret.txt');
      expect(response.text ?? '').not.toContain('top secret');
    });

    it('should send security headers that still let the app load itself', async () => {
      const response = await request(build()).get('/');
      const csp = response.headers['content-security-policy'];
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("img-src 'self' data: blob:");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).not.toContain('upgrade-insecure-requests');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('should answer the web backend without an API key', async () => {
      const response = await request(build()).post('/functions/v1/admin-data').send({ password: 'wrong' });
      expect(response.status).toBe(401);
    });

    it('should keep the pipeline API behind its key', async () => {
      const response = await request(build())
        .post('/pipeline/analyze')
        .send({ job_id: '550e8400-e29b-41d4-a716-446655440000', type: 'plain_text', content: 'x' });
      expect(response.status).toBe(401);
    });

    it('should answer 400 for a body that is not JSON', async () => {
      const response = await request(build())
        .post('/functions/v1/analyze-content')
        .set('Content-Type', 'application/json')
        .send('{not json');
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Yêu cầu không hợp lệ.' });
    });

    it('should answer 413 for a body over the size limit', async () => {
      const response = await request(build())
        .post('/functions/v1/analyze-content')
        .send({ text: 'a'.repeat(16 * 1024 * 1024) });
      expect(response.status).toBe(413);
    });
  });

  it('should serve only the API when the web app has not been built', async () => {
    const app = createApp({ web: { deps, distDir: path.join(dir, 'nowhere') } });
    expect((await request(app).get('/')).status).toBe(404);
    expect((await request(app).post('/functions/v1/admin-data').send({ password: 'secret' })).status).toBe(200);
  });

  it('should not expose the web backend unless web mode is on', async () => {
    const app = createApp();
    expect((await request(app).post('/functions/v1/analyze-content').send({ text: 'a' })).status).toBe(404);
    expect((await request(app).post('/functions/v1/admin-data').send({ password: 'secret' })).status).toBe(404);
    expect((await request(app).get('/')).status).toBe(404);
    expect((await request(app).get('/pipeline/health')).status).toBeGreaterThanOrEqual(200);
  });
});
