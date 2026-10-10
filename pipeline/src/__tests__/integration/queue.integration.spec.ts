/**
 * BullMQ queues against a real Redis.
 *
 * Runs only when REDIS_TEST_URL is set, for example:
 *   REDIS_TEST_URL=redis://127.0.0.1:6379 npm run test:integration
 */
const REDIS_URL = process.env['REDIS_TEST_URL'];

// A prefix of its own, so a pipeline that happens to use the same Redis does
// not pick up the jobs of this test.
const mockQueuePrefix = `vns-test-${process.pid}-${Date.now()}`;

jest.mock('../../config/config', () => ({
  getConfig: jest.fn(() => ({
    redisUrl: process.env['REDIS_TEST_URL'],
    queueConcurrency: 2,
    queuePrefix: mockQueuePrefix,
    logLevel: 'fatal',
  })),
}));

import {
  startQueues,
  stopQueues,
  isQueueRunning,
  runAnalysisJob,
  submitAnalysisJob,
  getAnalysisJob,
  enqueueVectorStore,
} from '../../queue/analysis-queue';
import { getCachedAnalysis, setCachedAnalysis } from '../../cache/shared-cache';
import { closeRedis } from '../../queue/redis';
import { AnalysisRequest, AnalysisResponse } from '../../types';
import { randomUUID } from 'crypto';

const describeWithRedis = REDIS_URL ? describe : describe.skip;

const makeRequest = (content: string): AnalysisRequest => ({ job_id: randomUUID(), type: 'plain_text', content });

const makeResponse = (request: AnalysisRequest): AnalysisResponse => ({
  job_id: request.job_id,
  status: 'completed',
  risk_score: request.content.length,
  risk_level: 'low',
  category: 'safe',
  findings: [],
  evidence: { headers: {}, urls: [], keywords: [], rag_matches: [] },
  recommendation: `seen: ${request.content}`,
});

describeWithRedis('BullMQ queues (needs Redis)', () => {
  const stored: unknown[] = [];
  let running = 0;
  let peak = 0;

  beforeAll(async () => {
    await startQueues({
      analyze: async request => {
        if (request.content === 'boom') throw new Error('handler failed');
        running++;
        peak = Math.max(peak, running);
        await new Promise(resolve => setTimeout(resolve, request.content === 'slow' ? 1500 : 60));
        running--;
        return makeResponse(request);
      },
      storeVector: async payload => {
        stored.push(payload);
      },
    });
  });

  afterAll(async () => {
    await stopQueues();
    await closeRedis();
  });

  it('should be running once started', () => {
    expect(isQueueRunning()).toBe(true);
  });

  it('should run a job and hand back its result', async () => {
    const request = makeRequest('xin chào');
    const result = await runAnalysisJob(request, 5000);
    expect(result).toEqual(makeResponse(request));
  });

  it('should cap how many analyses run at once', async () => {
    peak = 0;
    const requests = Array.from({ length: 8 }, (_, i) => makeRequest(`job ${i}`));

    const results = await Promise.all(requests.map(r => runAnalysisJob(r, 10000)));

    expect(results.map(r => r.job_id)).toEqual(requests.map(r => r.job_id));
    expect(peak).toBeLessThanOrEqual(2);
  });

  it('should report a timeout the way the HTTP layer expects', async () => {
    await expect(runAnalysisJob(makeRequest('slow'), 200)).rejects.toThrow('Analysis timeout');
  });

  it('should surface a failing job as an error', async () => {
    await expect(runAnalysisJob(makeRequest('boom'), 5000)).rejects.toThrow();
  });

  it('should let a submitted job be polled for its result', async () => {
    const request = makeRequest('async job');
    const jobId = await submitAnalysisJob(request);
    expect(jobId).toBe(request.job_id);

    let status = await getAnalysisJob(jobId);
    for (let i = 0; i < 40 && status?.state !== 'completed'; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      status = await getAnalysisJob(jobId);
    }

    expect(status).toEqual({ job_id: jobId, state: 'completed', result: makeResponse(request) });
  });

  it('should return null for an unknown job', async () => {
    expect(await getAnalysisJob(randomUUID())).toBeNull();
  });

  it('should process vector-store jobs in the background', async () => {
    const payload = { jobId: randomUUID(), score: 80, label: 'phishing' };

    expect(await enqueueVectorStore(payload)).toBe(true);

    for (let i = 0; i < 40 && !stored.includes(payload) && stored.length === 0; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    expect(stored).toContainEqual(payload);
  });

  it('should share cached results through Redis', async () => {
    const key = `test-${randomUUID()}`;

    expect(await getCachedAnalysis(key, 2000, 10)).toBeNull();
    await setCachedAnalysis(key, { risk_score: 42 }, 2000, 10);
    expect(await getCachedAnalysis(key, 2000, 10)).toEqual({ risk_score: 42 });
  });
});
