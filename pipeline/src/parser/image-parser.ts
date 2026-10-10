import { ParsedText } from '../types';
import { extractTextWithVision } from './ocr-processor';
import { parsePlainText } from './plain-text-parser';

export interface ImageParseResult {
  parsed: ParsedText;
  ocrSuccess: boolean;
  ocrConfidence: number;
}

export async function parseImage(imageBase64: string): Promise<ImageParseResult> {
  try {
    const ocrResult = await extractTextWithVision(imageBase64);

    if (!ocrResult.success || !ocrResult.text) {
      return {
        parsed: { body: '', urls: [] },
        ocrSuccess: false,
        ocrConfidence: 0,
      };
    }

    const parsed = parsePlainText(ocrResult.text);
    parsed.metadata = ocrResult.metadata;

    return {
      parsed,
      ocrSuccess: true,
      ocrConfidence: ocrResult.confidence,
    };
  } catch (error) {
    // Gracefully handle OCR service exception (e.g. OpenAI 429 Quota Exceeded)
    return {
      parsed: { body: '', urls: [] },
      ocrSuccess: false,
      ocrConfidence: 0,
    };
  }
}
