import { ParsedText } from '../types';
import { extractTextFromImage } from './ocr-processor';
import { parsePlainText } from './plain-text-parser';
import { normalizeOcrText } from './ocr-normalizer';
import { decodeQrCodes } from './qr-decoder';

export interface ImageParseResult {
  parsed: ParsedText;
  ocrSuccess: boolean;
  ocrConfidence: number;
}

const URL_START = /^https?:\/\//i;

export async function parseImage(imageBase64: string): Promise<ImageParseResult> {
  const qrCodes = decodeQrCodes(imageBase64);

  let text = '';
  let confidence = 0;
  let metadata: ParsedText['metadata'];

  try {
    const ocrResult = await extractTextFromImage(imageBase64);
    if (ocrResult.success && ocrResult.text) {
      text = normalizeOcrText(ocrResult.text);
      confidence = ocrResult.confidence;
      metadata = ocrResult.metadata;
    }
  } catch {
    // Every OCR engine failed (for example the provider is out of quota).
    // A QR code alone may still be enough to analyse.
  }

  if (!text && qrCodes.length === 0) {
    return {
      parsed: { body: '', urls: [] },
      ocrSuccess: false,
      ocrConfidence: 0,
    };
  }

  // The content of a QR code is analysed as if it had been typed in the message.
  const qrLines = qrCodes.map(code => `[Mã QR] ${code}`);
  const body = [text, ...qrLines].filter(Boolean).join('\n');

  const parsed = parsePlainText(body);
  for (const code of qrCodes) {
    if (URL_START.test(code) && !parsed.urls.includes(code)) {
      parsed.urls.push(code);
    }
  }
  parsed.metadata = metadata;
  if (qrCodes.length > 0) parsed.qr_codes = qrCodes;

  return {
    parsed,
    ocrSuccess: true,
    ocrConfidence: text ? confidence : 100,
  };
}
