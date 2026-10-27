import { performAnalysis } from '../../orchestrator/analysis-orchestrator';
import { AnalysisRequest, MlResult } from '../../types';

// The real parser, feature extractor, rules and scoring run here; only the
// layers that call out to other services are replaced.
jest.mock('../../rag/rag-analyzer', () => ({
  analyzeWithRag: jest.fn(),
  storeContentToVectorDb: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../llm/llm-analyzer', () => ({
  analyzeWithLlm: jest.fn(),
}));
jest.mock('../../ml/ml-client', () => ({
  classifyWithMl: jest.fn(),
  ML_UNAVAILABLE: { available: false, label: null, confidence: 0, scam_probability: 0, model: null, language: null },
}));
jest.mock('../../logger/logger', () => ({
  logAnalysisReceived: jest.fn(),
  logAnalysisCompleted: jest.fn(),
  logLayerError: jest.fn(),
}));

const { analyzeWithRag, storeContentToVectorDb } = require('../../rag/rag-analyzer');
const { analyzeWithLlm } = require('../../llm/llm-analyzer');
const { classifyWithMl } = require('../../ml/ml-client');

const baseConfig = {
  pipelineTimeoutMs: 30000,
  ragSimilarityThreshold: 0.75,
  llmEnabled: true,
  llmMode: 'always',
  openaiApiKey: 'test-key',
  mlServiceUrl: 'http://ml:8000',
  mlConfidenceThreshold: 0.9,
} as any;

const request = (content: string): AnalysisRequest => ({
  job_id: '550e8400-e29b-41d4-a716-446655440000',
  type: 'plain_text',
  content,
});

const ml = (label: 'scam' | 'safe', scamProbability: number): MlResult => ({
  available: true,
  label,
  confidence: label === 'scam' ? scamProbability : 1 - scamProbability,
  scam_probability: scamProbability,
  model: 'phobert',
  language: 'vi',
});

const SAFE_TEXT = 'Chào bạn, chiều nay 3 giờ nhóm mình họp ở thư viện tầng 2 nhé.';
const SCAM_TEXT = 'Tôi là công an, bạn liên quan đến vụ án rửa tiền. Chuyển tiền ngay tại http://45.12.8.9/nop';

describe('Orchestrator — hybrid ML routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    analyzeWithRag.mockResolvedValue({ result: { matches: [], top_score: 0, score: 0 }, finding: null });
    analyzeWithLlm.mockResolvedValue({ explanation: 'LLM nói', score: 10, enabled: true, succeeded: true });
  });

  it('should return the classifier verdict directly when it is confident of a scam', async () => {
    classifyWithMl.mockResolvedValue(ml('scam', 0.97));

    const result = await performAnalysis(request(SCAM_TEXT), baseConfig);

    expect(result.analysis_path).toBe('fast_ml');
    expect(result.risk_score).toBe(97);
    expect(result.vns?.risk_level).toBe('SCAM');
    expect(result.vns?.explanation).toContain('Mô hình phân loại (phobert)');
    expect(analyzeWithRag).not.toHaveBeenCalled();
    expect(analyzeWithLlm).not.toHaveBeenCalled();
  });

  it('should return a confident safe verdict directly when no other check objects', async () => {
    classifyWithMl.mockResolvedValue(ml('safe', 0.02));

    const result = await performAnalysis(request(SAFE_TEXT), baseConfig);

    expect(result.analysis_path).toBe('fast_ml');
    expect(result.risk_score).toBe(2);
    expect(result.category).toBe('safe');
    expect(analyzeWithLlm).not.toHaveBeenCalled();
  });

  it('should not trust a confident safe verdict when a rule fired', async () => {
    classifyWithMl.mockResolvedValue(ml('safe', 0.02));
    analyzeWithLlm.mockResolvedValue({ explanation: 'Giả danh công an', score: 95, enabled: true, succeeded: true });

    const result = await performAnalysis(request(SCAM_TEXT), baseConfig);

    expect(result.analysis_path).toBe('deep');
    expect(analyzeWithLlm).toHaveBeenCalled();
    expect(result.vns?.risk_level).toBe('SCAM');
  });

  it('should take the deep path when the classifier is not sure enough', async () => {
    classifyWithMl.mockResolvedValue(ml('scam', 0.7));

    const result = await performAnalysis(request(SAFE_TEXT), baseConfig);

    expect(result.analysis_path).toBe('deep');
    expect(analyzeWithRag).toHaveBeenCalled();
    // The classifier's opinion is handed to the LLM as context.
    expect(analyzeWithLlm.mock.calls[0][3].ml.scam_probability).toBe(0.7);
    expect(result.ml?.model).toBe('phobert');
  });

  it('should skip the classifier when the ML service is not configured', async () => {
    const result = await performAnalysis(request(SAFE_TEXT), { ...baseConfig, mlServiceUrl: undefined });

    expect(classifyWithMl).not.toHaveBeenCalled();
    expect(result.analysis_path).toBe('deep');
    expect(result.ml).toBeUndefined();
  });

  it('should keep rule-less ML scams out of the known-sample set', async () => {
    classifyWithMl.mockResolvedValue(ml('scam', 0.95));

    await performAnalysis(request(SAFE_TEXT), baseConfig);

    expect(storeContentToVectorDb.mock.calls[0][3]).toBe('phishing_ml');
  });
});

describe('Orchestrator — deep path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    classifyWithMl.mockResolvedValue({ available: false, label: null, confidence: 0, scam_probability: 0, model: null, language: null });
    analyzeWithRag.mockResolvedValue({ result: { matches: [], top_score: 0, score: 0 }, finding: null });
  });

  const config = { ...baseConfig, mlServiceUrl: undefined };

  it('should report every layer and the Vietnamese verdict', async () => {
    analyzeWithLlm.mockResolvedValue({
      explanation: 'Giả danh công an để yêu cầu chuyển tiền.',
      score: 100,
      enabled: true,
      succeeded: true,
      dangerous_phrases: ['lệnh bắt'],
      advice: 'Không chuyển tiền.',
      verification_summary: 'Link là địa chỉ IP.',
    });

    const result = await performAnalysis(request(SCAM_TEXT), config);

    expect(result.layers?.map(l => l.id)).toEqual(['rag', 'rule', 'header', 'image', 'llm']);
    expect(result.layers?.find(l => l.id === 'rule')?.applied).toBe(true);
    expect(result.layers?.find(l => l.id === 'rag')?.applied).toBe(false);
    expect(result.risk_score).toBe(100);
    expect(result.vns).toMatchObject({
      scam_percent: 100,
      risk_level: 'SCAM',
      explanation: 'Giả danh công an để yêu cầu chuyển tiền.',
      advice: 'Không chuyển tiền.',
    });
    expect(result.evidence.scam_patterns?.[0]?.id).toBe('fake_police');
    expect(result.evidence.url_checks?.[0]?.flags.ip_address).toBe(true);
  });

  it('should rate a clear scam as SCAM even without RAG samples or an LLM', async () => {
    const result = await performAnalysis(request(SCAM_TEXT), { ...config, llmEnabled: false });

    expect(analyzeWithLlm).not.toHaveBeenCalled();
    expect(result.vns?.risk_level).toBe('SCAM');
    expect(result.vns?.explanation).toContain('dấu hiệu lừa đảo');
  });

  it('should rate an ordinary message as SAFE', async () => {
    analyzeWithLlm.mockResolvedValue({ explanation: 'Tin nhắn hẹn họp bình thường.', score: 3, enabled: true, succeeded: true });

    const result = await performAnalysis(request(SAFE_TEXT), config);

    expect(result.risk_score).toBe(3);
    expect(result.vns?.risk_level).toBe('SAFE');
    expect(result.category).toBe('safe');
  });

  it('should raise the score when a known sample matches', async () => {
    analyzeWithRag.mockResolvedValue({
      result: {
        matches: [{ id: '1', similarity: 0.91, label: 'phishing', snippet: 'Tôi là công an...' }],
        top_score: 0.91,
        score: 91,
      },
      finding: {
        rule_id: 'similar_to_known_phishing',
        severity: 'critical',
        description: 'similar',
        evidence: { top_similarity: 0.91 },
      },
    });
    analyzeWithLlm.mockResolvedValue({ explanation: 'Có thể lừa đảo', score: 60, enabled: true, succeeded: true });

    const result = await performAnalysis(request(SCAM_TEXT), config);

    expect(result.layers?.find(l => l.id === 'rag')).toMatchObject({ applied: true, score: 91 });
    expect(result.risk_score).toBeGreaterThan(60);
    expect(result.llm_floor_applied).toBe(false);
  });

  it('should only ask the LLM in the gray zone when LLM_MODE=gray_zone', async () => {
    analyzeWithLlm.mockResolvedValue({ explanation: 'x', score: 5, enabled: true, succeeded: true });

    await performAnalysis(request(SAFE_TEXT), { ...config, llmMode: 'gray_zone' });
    expect(analyzeWithLlm).not.toHaveBeenCalled();

    // Rule layer alone gives 0.25 * 85 = 21.25, inside [15, 75)
    await performAnalysis(request(SCAM_TEXT), { ...config, llmMode: 'gray_zone' });
    expect(analyzeWithLlm).toHaveBeenCalledTimes(1);
  });

  it('should skip the LLM only for clear scams when LLM_MODE=confident', async () => {
    analyzeWithLlm.mockResolvedValue({ explanation: 'x', score: 90, enabled: true, succeeded: true });
    const confident = { ...config, llmMode: 'confident' };

    // The rules already rate this a scam: answer without waiting for the LLM.
    const clear = await performAnalysis(request(SCAM_TEXT), confident);
    expect(analyzeWithLlm).not.toHaveBeenCalled();
    expect(clear.vns?.risk_level).toBe('SCAM');

    // No rule fires on this one, but it may still be a new kind of scam: ask.
    await performAnalysis(request(SAFE_TEXT), confident);
    expect(analyzeWithLlm).toHaveBeenCalledTimes(1);
  });
});
