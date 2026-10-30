import request from 'supertest';
import express from 'express';
import { router, setReady } from '../../http/router';

jest.mock('../../config/config', () => ({
  getConfig: jest.fn(() => ({
    apiKey: 'test-api-key',
    allowedIps: '',
    pipelineTimeoutMs: 30000,
    ragSimilarityThreshold: 0.75,
    qdrantCollection: 'phishing_emails',
    llmEnabled: true,
    llmProvider: 'gemini',
    llmApiKey: 'gemini-key',
    llmModel: 'gemini-3.8-flash',
    llmMode: 'always',
    openaiApiKey: 'openai-key',
    mlServiceUrl: 'http://ml:8000',
    mlConfidenceThreshold: 0.9,
  })),
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

jest.mock('../../chat/chat-service', () => {
  const actual = jest.requireActual('../../chat/chat-service');
  return { ...actual, answerQuestion: jest.fn() };
});

const { answerQuestion, ChatUnavailableError } = require('../../chat/chat-service');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(router);
  return app;
}

const KEY = { 'X-API-Key': 'test-api-key' };
const VALID_REQUEST = {
  job_id: '550e8400-e29b-41d4-a716-446655440000',
  type: 'plain_text',
  content: 'Hello world',
};

describe('Additional pipeline endpoints', () => {
  beforeAll(() => setReady(true));
  beforeEach(() => jest.clearAllMocks());

  describe('GET /pipeline/status', () => {
    it('should require the API key', async () => {
      const res = await request(buildApp()).get('/pipeline/status');
      expect(res.status).toBe(401);
    });

    it('should describe which layers are configured, without secrets', async () => {
      const res = await request(buildApp()).get('/pipeline/status').set(KEY);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        rule: { enabled: true },
        knowledge: { scam_patterns: 16, official_domains: 63 },
        ml: { configured: true, confidence_threshold: 0.9 },
        rag: { configured: true, embedding_model: 'text-embedding-3-small', rerank: true },
        llm: { configured: true, provider: 'gemini', model: 'gemini-3.8-flash', mode: 'always' },
        ocr: ['paddleocr', 'vision_llm', 'tesseract'],
        queue: { running: false },
      });
      expect(JSON.stringify(res.body)).not.toContain('gemini-key');
      expect(JSON.stringify(res.body)).not.toContain('openai-key');
    });
  });

  describe('POST /pipeline/chat', () => {
    it('should require the API key', async () => {
      const res = await request(buildApp()).post('/pipeline/chat').send({ question: 'Hỏi' });
      expect(res.status).toBe(401);
      expect(answerQuestion).not.toHaveBeenCalled();
    });

    it('should reject a request without a question', async () => {
      const res = await request(buildApp()).post('/pipeline/chat').set(KEY).send({ content: 'abc' });
      expect(res.status).toBe(400);
    });

    it('should return the answer and its sources', async () => {
      answerQuestion.mockResolvedValue({ answer: 'Đây là lừa đảo.', sources: [] });

      const res = await request(buildApp()).post('/pipeline/chat').set(KEY).send({ question: 'Vì sao?' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ answer: 'Đây là lừa đảo.', sources: [] });
    });

    it('should answer 503 when no LLM is configured', async () => {
      answerQuestion.mockRejectedValue(new ChatUnavailableError('no llm'));

      const res = await request(buildApp()).post('/pipeline/chat').set(KEY).send({ question: 'Vì sao?' });

      expect(res.status).toBe(503);
    });

    it('should not leak internal errors', async () => {
      answerQuestion.mockRejectedValue(new Error('secret stack detail'));

      const res = await request(buildApp()).post('/pipeline/chat').set(KEY).send({ question: 'Vì sao?' });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Internal server error' });
    });
  });

  describe('job endpoints without Redis', () => {
    it('should answer 503 for POST /pipeline/jobs', async () => {
      const res = await request(buildApp()).post('/pipeline/jobs').set(KEY).send(VALID_REQUEST);
      expect(res.status).toBe(503);
      expect(res.body.error).toContain('REDIS_URL');
    });

    it('should answer 503 for GET /pipeline/jobs/:id', async () => {
      const res = await request(buildApp()).get(`/pipeline/jobs/${VALID_REQUEST.job_id}`).set(KEY);
      expect(res.status).toBe(503);
    });

    it('should still validate the request first', async () => {
      const res = await request(buildApp()).post('/pipeline/jobs').set(KEY).send({ type: 'plain_text', content: 'x' });
      expect(res.status).toBe(400);
    });
  });
});
