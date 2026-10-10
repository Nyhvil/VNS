import { classifyWithMl, ocrWithMlService, ML_UNAVAILABLE } from '../../ml/ml-client';

const mockConfig: Record<string, unknown> = {};

jest.mock('../../config/config', () => ({
  getConfig: jest.fn(() => mockConfig),
}));

jest.mock('../../logger/logger', () => ({
  logLayerError: jest.fn(),
}));

const fetchMock = jest.fn();

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe('ML service client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    for (const key of Object.keys(mockConfig)) delete mockConfig[key];
    Object.assign(mockConfig, { mlServiceUrl: 'http://ml:8000/', mlServiceApiKey: 'ml-key', mlTimeoutMs: 1000 });
    (global as any).fetch = fetchMock;
  });

  describe('classifyWithMl()', () => {
    it('should return the classifier verdict', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ label: 'scam', confidence: 0.97, scam_probability: 0.97, model: 'phobert', language: 'vi' })
      );

      const result = await classifyWithMl('Tài khoản bị khóa, nhập OTP', 'job-1');

      expect(result).toEqual({
        available: true,
        label: 'scam',
        confidence: 0.97,
        scam_probability: 0.97,
        model: 'phobert',
        language: 'vi',
      });

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('http://ml:8000/classify');
      expect(init.headers['X-API-Key']).toBe('ml-key');
      expect(JSON.parse(init.body)).toEqual({ text: 'Tài khoản bị khóa, nhập OTP' });
    });

    it('should derive the confidence of a safe label from the scam probability', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ label: 'safe', scam_probability: 0.04 }));

      const result = await classifyWithMl('Chiều nay họp nhé', 'job-2');

      expect(result.label).toBe('safe');
      expect(result.confidence).toBeCloseTo(0.96, 10);
    });

    it('should not call the service when it is not configured', async () => {
      delete mockConfig['mlServiceUrl'];

      expect(await classifyWithMl('abc', 'job-3')).toEqual(ML_UNAVAILABLE);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should report unavailable instead of throwing when the service fails', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
      expect(await classifyWithMl('abc', 'job-4')).toEqual(ML_UNAVAILABLE);

      fetchMock.mockResolvedValue(jsonResponse({ detail: 'model not loaded' }, 503));
      expect(await classifyWithMl('abc', 'job-5')).toEqual(ML_UNAVAILABLE);
    });

    it('should report unavailable for an answer without a usable label', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ label: 'maybe', confidence: 0.99 }));
      expect(await classifyWithMl('abc', 'job-6')).toEqual(ML_UNAVAILABLE);
    });
  });

  describe('ocrWithMlService()', () => {
    it('should return the text PaddleOCR read, with confidence as a percentage', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ text: ' Xin chào \n', confidence: 0.93 }));

      const result = await ocrWithMlService('data:image/png;base64,QUJD');

      expect(result).toMatchObject({ text: 'Xin chào', confidence: 93, success: true });
      expect(result.metadata?.app_source).toBe('PaddleOCR');
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ image_base64: 'QUJD' });
    });

    it('should report failure when no text was found', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ text: '', confidence: 0 }));
      const result = await ocrWithMlService('QUJD');
      expect(result).toMatchObject({ text: '', confidence: 0, success: false });
    });

    it('should throw when the service answers with an error', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, 500));
      await expect(ocrWithMlService('QUJD')).rejects.toThrow('ML service answered 500');
    });
  });
});
