import { analyzeWithLlm, buildPrompt } from '../../llm/llm-analyzer';
import { extractFeatures } from '../../features/feature-extractor';
import { parsePlainText } from '../../parser/plain-text-parser';

const mockConfig: Record<string, unknown> = {};
const mockCreate = jest.fn();
const mockOpenAI = jest.fn().mockImplementation(() => ({ chat: { completions: { create: mockCreate } } }));

jest.mock('../../config/config', () => ({
  getConfig: jest.fn(() => mockConfig),
}));
jest.mock('../../logger/logger', () => ({
  logLayerError: jest.fn(),
}));
jest.mock('openai', () => ({
  __esModule: true,
  default: function (...args: unknown[]) {
    return mockOpenAI(...args);
  },
}));

const content = parsePlainText(
  'Vietcombank: tài khoản bị khóa. Nhập mã OTP tại http://vietcombank-xacminh.top, gọi 0912345678'
);
const features = extractFeatures(content);

const answer = (body: unknown) => ({ choices: [{ message: { content: typeof body === 'string' ? body : JSON.stringify(body) } }] });

describe('LLM reasoning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    for (const key of Object.keys(mockConfig)) delete mockConfig[key];
    Object.assign(mockConfig, { llmEnabled: true, openaiApiKey: 'openai-key', llmModel: 'gpt-4o-mini', llmTimeoutMs: 1000 });
  });

  it('should hand the findings of the other layers to the model, without personal data', () => {
    const prompt = buildPrompt(content, features, {
      ragMatches: [{ id: '1', similarity: 0.9, label: 'phishing', snippet: 'Tài khoản bị khóa, nhập OTP' }],
      ml: { available: true, label: 'scam', confidence: 0.8, scam_probability: 0.8, model: 'phobert', language: 'vi' },
    });

    expect(prompt).toContain('[PHONE_REDACTED]');
    expect(prompt).not.toContain('0912345678');
    expect(prompt).toContain('ĐÁNG NGỜ');
    expect(prompt).toContain('Giả mạo ngân hàng yêu cầu OTP');
    expect(prompt).toContain('Mẫu lừa đảo tương tự trong cơ sở dữ liệu (giống 90%)');
    expect(prompt).toContain('Mô hình phân loại (phobert): lừa đảo, xác suất lừa đảo 80%');
  });

  it('should parse the full verdict', async () => {
    mockCreate.mockResolvedValue(
      answer({
        score: 93.6,
        explanation: 'Giả mạo ngân hàng.',
        dangerous_phrases: ['mã OTP', 'tài khoản bị khóa'],
        advice: 'Không nhập OTP.',
        verification_summary: 'Link giả mạo.',
      })
    );

    const result = await analyzeWithLlm(content, features, 'job-1');

    expect(result).toEqual({
      explanation: 'Giả mạo ngân hàng.',
      score: 94,
      enabled: true,
      succeeded: true,
      dangerous_phrases: ['mã OTP', 'tài khoản bị khóa'],
      advice: 'Không nhập OTP.',
      verification_summary: 'Link giả mạo.',
    });
  });

  it('should accept JSON wrapped in a code block', async () => {
    mockCreate.mockResolvedValue(answer('```json\n{"score": 12, "explanation": "Bình thường"}\n```'));

    const result = await analyzeWithLlm(content, features, 'job-2');

    expect(result.score).toBe(12);
    expect(result.succeeded).toBe(true);
  });

  it('should not count an answer without a score as a verdict', async () => {
    mockCreate.mockResolvedValue(answer('Xin lỗi, tôi không thể trả lời.'));

    const result = await analyzeWithLlm(content, features, 'job-3');

    expect(result.succeeded).toBe(false);
    expect(result.score).toBe(0);
  });

  it('should call OpenAI by default', async () => {
    mockCreate.mockResolvedValue(answer({ score: 1, explanation: 'ok' }));

    await analyzeWithLlm(content, features, 'job-4');

    expect(mockOpenAI).toHaveBeenCalledWith({ apiKey: 'openai-key', baseURL: undefined });
    expect(mockCreate.mock.calls[0][0].model).toBe('gpt-4o-mini');
  });

  it('should call Gemini through its OpenAI-compatible endpoint when configured', async () => {
    Object.assign(mockConfig, { llmProvider: 'gemini', llmApiKey: 'gemini-key', llmModel: 'gemini-3.8-flash' });
    mockCreate.mockResolvedValue(answer({ score: 1, explanation: 'ok' }));

    await analyzeWithLlm(content, features, 'job-5');

    expect(mockOpenAI).toHaveBeenCalledWith({
      apiKey: 'gemini-key',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    });
    expect(mockCreate.mock.calls[0][0].model).toBe('gemini-3.8-flash');
  });

  it('should not send the OpenAI key to another provider', async () => {
    Object.assign(mockConfig, { llmProvider: 'gemini', llmApiKey: undefined });

    const result = await analyzeWithLlm(content, features, 'job-6');

    expect(result.enabled).toBe(false);
    expect(mockOpenAI).not.toHaveBeenCalled();
  });
});
