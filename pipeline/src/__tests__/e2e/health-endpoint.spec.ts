import request from 'supertest';
import express from 'express';
import { router, setReady } from '../../http/router';

// Mock config
jest.mock('../../config/config', () => ({
  getConfig: jest.fn(() => ({
    apiKey: 'test-api-key',
    allowedIps: '127.0.0.1,::1,::ffff:127.0.0.1',
    pipelineTimeoutMs: 30000,
    ragSimilarityThreshold: 0.75,
  })),
  getAllowedIpList: jest.fn(() => ['127.0.0.1', '::1', '::ffff:127.0.0.1']),
}));

jest.mock('../../logger/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
  logAnalysisReceived: jest.fn(),
  logAnalysisCompleted: jest.fn(),
  logLayerError: jest.fn(),
}));

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(router);
  return app;
}

describe('GET /pipeline/health', () => {
  it('should return 200 with status ok when ready', async () => {
    setReady(true);
    const app = buildApp();

    const res = await request(app).get('/pipeline/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('should return 503 with status starting when not ready', async () => {
    setReady(false);
    const app = buildApp();

    const res = await request(app).get('/pipeline/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('starting');
  });

  it('should include ISO 8601 timestamp', async () => {
    setReady(true);
    const app = buildApp();

    const res = await request(app).get('/pipeline/health');

    expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
