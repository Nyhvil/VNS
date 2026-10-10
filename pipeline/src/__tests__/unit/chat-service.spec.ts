import { answerQuestion, buildChatContext, ChatRequestSchema, ChatUnavailableError } from '../../chat/chat-service';

const mockConfig: Record<string, unknown> = {};
const mockCreate = jest.fn();

jest.mock('../../config/config', () => ({
  getConfig: jest.fn(() => mockConfig),
}));
jest.mock('../../logger/logger', () => ({
  logLayerError: jest.fn(),
}));
jest.mock('../../rag/embedding-client', () => ({
  createEmbedding: jest.fn().mockResolvedValue(new Array(8).fill(0.1)),
}));
jest.mock('../../rag/qdrant-client', () => ({
  searchSimilar: jest.fn(),
}));
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ chat: { completions: { create: mockCreate } } })),
}));

const { searchSimilar } = require('../../rag/qdrant-client');

describe('RAG chatbot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    for (const key of Object.keys(mockConfig)) delete mockConfig[key];
    Object.assign(mockConfig, { llmEnabled: true, openaiApiKey: 'test-key', llmTimeoutMs: 1000, ragTopK: 5 });
    searchSimilar.mockResolvedValue([]);
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'Đây là tin giả danh ngân hàng.' } }] });
  });

  it('should validate the request', () => {
    expect(ChatRequestSchema.safeParse({ question: '  ' }).success).toBe(false);
    expect(ChatRequestSchema.safeParse({ question: 'Vì sao đây là lừa đảo?' }).success).toBe(true);
    expect(ChatRequestSchema.safeParse({ question: 'a', history: new Array(11).fill({ role: 'user', content: 'x' }) }).success).toBe(false);
  });

  it('should refuse when no LLM is configured', async () => {
    mockConfig['llmEnabled'] = false;
    await expect(answerQuestion({ question: 'Hỏi' }, 'job-1')).rejects.toBeInstanceOf(ChatUnavailableError);
  });

  it('should answer with the retrieved samples as sources', async () => {
    searchSimilar.mockResolvedValue([
      { id: '1', score: 0.88, payload: { label: 'phishing', source: 'curated', snippet: 'Tài khoản bị khóa, nhập mã OTP để mở khóa' } },
      { id: '2', score: 0.2, payload: { label: 'phishing', source: 'curated', snippet: 'Không liên quan' } },
      { id: '3', score: 0.86, payload: { label: 'phishing', source: 'pipeline_auto', snippet: 'Tin người khác đã gửi, tài khoản bị khóa' } },
    ]);

    const result = await answerQuestion(
      { question: 'Vì sao tin này là lừa đảo?', content: 'Tài khoản bị khóa, nhập mã OTP' },
      'job-2'
    );

    expect(result.answer).toBe('Đây là tin giả danh ngân hàng.');
    // Only the team's curated samples are handed back; a sample learned from
    // another person's submission informs the answer but is not shown.
    expect(result.sources).toEqual([
      { snippet: 'Tài khoản bị khóa, nhập mã OTP để mở khóa', similarity: 0.88, label: 'phishing', source: 'curated' },
    ]);
    expect(JSON.stringify(mockCreate.mock.calls[0][0].messages)).toContain('Tin người khác đã gửi');

    const messages = mockCreate.mock.calls[0][0].messages;
    expect(messages[0].role).toBe('system');
    expect(messages[messages.length - 1].content).toContain('Mẫu lừa đảo tương tự');
  });

  it('should still answer when retrieval fails', async () => {
    searchSimilar.mockRejectedValue(new Error('Qdrant down'));

    const result = await answerQuestion({ question: 'Tôi nên làm gì?' }, 'job-3');

    expect(result.answer).toBeTruthy();
    expect(result.sources).toEqual([]);
  });

  it('should remove personal data before it reaches the model', async () => {
    await answerQuestion(
      { question: 'Số 0912345678 gọi cho tôi, có sao không?', content: 'Liên hệ an.nguyen@example.com' },
      'job-4'
    );

    const sent = JSON.stringify(mockCreate.mock.calls[0][0].messages);
    expect(sent).not.toContain('0912345678');
    expect(sent).not.toContain('an.nguyen@example.com');
    expect(sent).toContain('[PHONE_REDACTED]');
  });

  it('should ground the answer in the scam-pattern knowledge base', () => {
    const context = buildChatContext(
      { question: 'Họ bảo tôi trúng thưởng và phải nhận thưởng ngay', verdict: { risk_level: 'SCAM', scam_percent: 90 } },
      []
    );

    expect(context).toContain('mức SCAM');
    expect(context).toContain('điểm lừa đảo 90/100');
    expect(context).toContain('Trúng thưởng giả');
  });
});
