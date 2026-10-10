import request from 'supertest';
import express from 'express';
import { router, setReady } from '../../http/router';

// Mock config
jest.mock('../../config/config', () => ({
  getConfig: jest.fn(() => ({
    apiKey: 'test-api-key',
    allowedIps: '',
    pipelineTimeoutMs: 30000,
    ragSimilarityThreshold: 0.75,
  })),
  getAllowedIpList: jest.fn(() => []), // Empty = allow all IPs
}));

jest.mock('../../logger/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
  logAnalysisReceived: jest.fn(),
  logAnalysisCompleted: jest.fn(),
  logLayerError: jest.fn(),
}));

// Mock orchestrator
jest.mock('../../orchestrator/analysis-orchestrator', () => ({
  runAnalysis: jest.fn().mockResolvedValue({
    job_id: '550e8400-e29b-41d4-a716-446655440000',
    status: 'completed',
    risk_score: 0,
    risk_level: 'low',
    category: 'safe',
    findings: [],
    evidence: { headers: {}, urls: [], keywords: [], rag_matches: [] },
    recommendation: 'No threats detected.',
  }),
}));

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(router);
  return app;
}

const VALID_REQUEST = {
  job_id: '550e8400-e29b-41d4-a716-446655440000',
  type: 'plain_text',
  content: 'Hello world',
};

describe('POST /pipeline/analyze', () => {
  beforeAll(() => {
    setReady(true);
  });

  it('should return 200 for valid request with correct API key', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/pipeline/analyze')
      .set('X-API-Key', 'test-api-key')
      .send(VALID_REQUEST);

    expect(res.status).toBe(200);
    expect(res.body.job_id).toBe(VALID_REQUEST.job_id);
    expect(res.body.status).toBe('completed');
  });

  it('should return 401 when API key is missing', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/pipeline/analyze')
      .send(VALID_REQUEST);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('should return 401 when API key is wrong', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/pipeline/analyze')
      .set('X-API-Key', 'wrong-key')
      .send(VALID_REQUEST);

    expect(res.status).toBe(401);
  });

  it('should return 400 when job_id is missing', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/pipeline/analyze')
      .set('X-API-Key', 'test-api-key')
      .send({ type: 'plain_text', content: 'test' });

    expect(res.status).toBe(400);
  });

  it('should return 400 when job_id is not a valid UUID', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/pipeline/analyze')
      .set('X-API-Key', 'test-api-key')
      .send({ ...VALID_REQUEST, job_id: 'not-a-uuid' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('UUID');
  });

  it('should return 422 when type is invalid', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/pipeline/analyze')
      .set('X-API-Key', 'test-api-key')
      .send({ ...VALID_REQUEST, type: 'invalid_type' });

    expect(res.status).toBe(422);
  });

  it('should return 400 when content is missing', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/pipeline/analyze')
      .set('X-API-Key', 'test-api-key')
      .send({ job_id: VALID_REQUEST.job_id, type: 'plain_text' });

    expect(res.status).toBe(400);
  });

  it('should return response with all required fields', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/pipeline/analyze')
      .set('X-API-Key', 'test-api-key')
      .send(VALID_REQUEST);

    expect(res.body).toHaveProperty('job_id');
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('risk_score');
    expect(res.body).toHaveProperty('risk_level');
    expect(res.body).toHaveProperty('category');
    expect(res.body).toHaveProperty('findings');
    expect(res.body).toHaveProperty('evidence');
    expect(res.body).toHaveProperty('recommendation');
  });
});
