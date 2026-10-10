import * as QRCode from 'qrcode';
import { decodeQrCodes } from '../../parser/qr-decoder';
import { normalizeOcrText } from '../../parser/ocr-normalizer';
import { computeImageRiskScore } from '../../scoring/image-risk';
import { parseImage } from '../../parser/image-parser';

jest.mock('../../parser/ocr-processor', () => ({
  extractTextFromImage: jest.fn(),
}));

const { extractTextFromImage } = require('../../parser/ocr-processor');

async function qrPngBase64(text: string): Promise<string> {
  const buffer = await QRCode.toBuffer(text, { type: 'png', width: 300, margin: 2 });
  return buffer.toString('base64');
}

describe('QR decoder', () => {
  it('should read the link inside a QR code image', async () => {
    const image = await qrPngBase64('http://vietcombank-xacminh.top/qr');
    expect(decodeQrCodes(image)).toEqual(['http://vietcombank-xacminh.top/qr']);
  });

  it('should accept a data URL', async () => {
    const image = await qrPngBase64('https://momo.vn/pay');
    expect(decodeQrCodes(`data:image/png;base64,${image}`)).toEqual(['https://momo.vn/pay']);
  });

  it('should return nothing for data that is not an image', () => {
    expect(decodeQrCodes('not-an-image')).toEqual([]);
    expect(decodeQrCodes(Buffer.from('x'.repeat(500)).toString('base64'))).toEqual([]);
  });
});

describe('OCR normaliser', () => {
  it('should undo common look-alike substitutions', () => {
    expect(normalizeOcrText('Please ver1fy your acc0unt at hltps://bank.corn')).toBe(
      'Please verify your account at https://bank.com'
    );
  });

  it('should keep line breaks and collapse spaces', () => {
    expect(normalizeOcrText('Anh:   chào em\n\n\n\nEm:  dạ')).toBe('Anh: chào em\n\nEm: dạ');
  });
});

describe('Image risk score', () => {
  it('should be 0 without a QR code', () => {
    expect(computeImageRiskScore({ body: 'text only', urls: [] })).toBe(0);
  });

  it('should be high for a QR code that leads to a suspicious link', () => {
    expect(computeImageRiskScore({ body: '', urls: [], qr_codes: ['http://vietcombank-xacminh.top/qr'] })).toBe(90);
  });

  it('should be moderate for a QR code that leads to an unknown domain', () => {
    expect(computeImageRiskScore({ body: '', urls: [], qr_codes: ['https://example-shop.com/pay'] })).toBe(50);
  });

  it('should be 0 for a QR code that leads to an official domain', () => {
    expect(computeImageRiskScore({ body: '', urls: [], qr_codes: ['https://momo.vn/pay'] })).toBe(0);
  });

  it('should be low for a QR code that is not a link', () => {
    expect(computeImageRiskScore({ body: '', urls: [], qr_codes: ['00020101021238540010A000000727'] })).toBe(30);
  });
});

describe('Image parser', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should combine the OCR text with the QR code link', async () => {
    extractTextFromImage.mockResolvedValue({ text: 'Quét mã để nhận quà', confidence: 91, success: true });
    const image = await qrPngBase64('http://qua-tang.xyz/nhan');

    const result = await parseImage(image);

    expect(result.ocrSuccess).toBe(true);
    expect(result.ocrConfidence).toBe(91);
    expect(result.parsed.body).toBe('Quét mã để nhận quà\n[Mã QR] http://qua-tang.xyz/nhan');
    expect(result.parsed.urls).toEqual(['http://qua-tang.xyz/nhan']);
    expect(result.parsed.qr_codes).toEqual(['http://qua-tang.xyz/nhan']);
  });

  it('should still analyse a QR code when no text could be read', async () => {
    extractTextFromImage.mockRejectedValue(new Error('all OCR engines failed'));
    const image = await qrPngBase64('http://qua-tang.xyz/nhan');

    const result = await parseImage(image);

    expect(result.ocrSuccess).toBe(true);
    expect(result.parsed.urls).toEqual(['http://qua-tang.xyz/nhan']);
  });

  it('should report failure when there is neither text nor a QR code', async () => {
    extractTextFromImage.mockResolvedValue({ text: '', confidence: 0, success: false });

    const result = await parseImage('not-an-image');

    expect(result).toEqual({ parsed: { body: '', urls: [] }, ocrSuccess: false, ocrConfidence: 0 });
  });

  it('should normalise the OCR text', async () => {
    extractTextFromImage.mockResolvedValue({ text: 'ver1fy your acc0unt', confidence: 80, success: true });

    const result = await parseImage('not-an-image');

    expect(result.parsed.body).toBe('verify your account');
  });
});
