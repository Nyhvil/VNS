jest.mock('../../config/config', () => ({
  getConfig: jest.fn(() => ({
    port: 3001,
    apiKey: 'test-api-key',
    openaiApiKey: 'test-openai-key',
    openaiEmbeddingModel: 'text-embedding-3-small',
  })),
}));

jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: jest.fn().mockImplementation((options: any) => {
              const image = options.messages[1].content[0].image_url.url;
              if (image.includes('error')) {
                return Promise.reject(new Error('OpenAI API Error'));
              }
              if (image.includes('empty')) {
                return Promise.resolve({
                  choices: [
                    {
                      message: {
                        content: '{}'
                      }
                    }
                  ]
                });
              }
              return Promise.resolve({
                choices: [
                  {
                    message: {
                      content: JSON.stringify({
                        text: 'Clean chat message',
                        metadata: {
                          app_source: 'Zalo',
                          participants: ['Alice', 'Bob'],
                          timestamp: 'Today 10:00 AM'
                        }
                      })
                    }
                  }
                ]
              });
            })
          }
        }
      };
    })
  };
});

import { extractTextWithVision } from '../../parser/ocr-processor';

describe('OCR Processor with OpenAI Vision', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return success=true and parsed JSON metadata for valid vision OCR', async () => {
    const result = await extractTextWithVision('normal');

    expect(result.success).toBe(true);
    expect(result.text).toBe('Clean chat message');
    expect(result.confidence).toBe(100);
    expect(result.metadata).toEqual({
      app_source: 'Zalo',
      participants: ['Alice', 'Bob'],
      timestamp: 'Today 10:00 AM'
    });
  });

  it('should return success=false when openai returns invalid format or empty text', async () => {
    const result = await extractTextWithVision('empty');
    expect(result.success).toBe(false);
    expect(result.text).toBe('');
  });

  it('should throw error when openai throws error', async () => {
    await expect(extractTextWithVision('error')).rejects.toThrow('OpenAI Vision OCR failed: OpenAI API Error');
  });
});
