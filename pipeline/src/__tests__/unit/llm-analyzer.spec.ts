import { analyzeWithLlm } from '../../llm/llm-analyzer';
import { ParsedText, FeatureSet } from '../../types';

jest.mock('../../config/config', () => ({
  getConfig: jest.fn(),
}));

jest.mock('../../logger/logger', () => ({
  logLayerError: jest.fn(),
}));

const { getConfig } = require('../../config/config');

const mockContent: ParsedText = {
  body: 'Urgent: verify your account',
  urls: [],
};

const mockFeatures: FeatureSet = {
  sender_domain: null,
  reply_to_domain: null,
  urls: [],
  suspicious_keywords: ['urgent', 'verify'],
  domain_mismatch: false,
  spf_result: null,
  dkim_result: null,
};

describe('LLM Analyzer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return disabled result when LLM_ENABLED=false', async () => {
    getConfig.mockReturnValue({ llmEnabled: false });

    const result = await analyzeWithLlm(mockContent, mockFeatures, 'job-1');

    expect(result.enabled).toBe(false);
    expect(result.explanation).toBe('');
    expect(result.score).toBe(0);
  });

  it('should return disabled result when no OpenAI API key', async () => {
    getConfig.mockReturnValue({ llmEnabled: true, openaiApiKey: undefined });

    const result = await analyzeWithLlm(mockContent, mockFeatures, 'job-2');

    expect(result.enabled).toBe(false);
    expect(result.score).toBe(0);
  });

  it('should return empty explanation on API error without disrupting pipeline', async () => {
    getConfig.mockReturnValue({
      llmEnabled: true,
      openaiApiKey: 'test-key',
      llmModel: 'gpt-4o-mini',
      llmTimeoutMs: 10000,
    });

    // Mock OpenAI to throw
    jest.doMock('openai', () => ({
      default: jest.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('API Error')),
          },
        },
      })),
    }));

    const result = await analyzeWithLlm(mockContent, mockFeatures, 'job-3');

    // Should not throw, should return graceful fallback
    expect(result.explanation).toBe('');
    expect(result.score).toBe(0);
  });
});
