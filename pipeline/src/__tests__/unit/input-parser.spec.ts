import { parseInput, ADDITIONAL_TEXT_SEPARATOR } from '../../parser/input-parser';

jest.mock('../../parser/image-parser', () => ({
  parseImage: jest.fn(),
}));

const { parseImage } = require('../../parser/image-parser');

const imageRequest = (metadata?: Record<string, unknown>) => ({
  job_id: '550e8400-e29b-41d4-a716-446655440000',
  type: 'image' as const,
  content: 'base64',
  metadata,
});

describe('Input parser — image with a note from the user', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should analyse the note together with the image text', async () => {
    parseImage.mockResolvedValue({ parsed: { body: 'Chữ trong ảnh', urls: [] }, ocrSuccess: true, ocrConfidence: 90 });

    const result = await parseInput(imageRequest({ additional_text: 'Họ gửi kèm link http://qua-tang.xyz' }));

    expect(result.content.body).toBe(
      `Chữ trong ảnh\n\n${ADDITIONAL_TEXT_SEPARATOR}\nHọ gửi kèm link http://qua-tang.xyz`
    );
    expect(result.content.urls).toEqual(['http://qua-tang.xyz']);
    expect(result.ocrFailed).toBe(false);
  });

  it('should still analyse the note when the image is unreadable', async () => {
    parseImage.mockResolvedValue({ parsed: { body: '', urls: [] }, ocrSuccess: false, ocrConfidence: 0 });

    const result = await parseInput(imageRequest({ additional_text: 'Tin này có phải lừa đảo không?' }));

    expect(result.content.body).toBe('Tin này có phải lừa đảo không?');
    expect(result.ocrFailed).toBe(false);
    expect(result.imageScore).toBe(0);
  });

  it('should report an unreadable image when there is no note', async () => {
    parseImage.mockResolvedValue({ parsed: { body: '', urls: [] }, ocrSuccess: false, ocrConfidence: 0 });

    expect((await parseInput(imageRequest())).ocrFailed).toBe(true);
    expect((await parseInput(imageRequest({ additional_text: '   ' }))).ocrFailed).toBe(true);
    expect((await parseInput(imageRequest({ additional_text: 42 }))).ocrFailed).toBe(true);
  });
});
