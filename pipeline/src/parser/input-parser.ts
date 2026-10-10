import { AnalysisRequest, ParsedContent } from '../types';
import { parseEmail } from './email-parser';
import { parsePlainText } from './plain-text-parser';
import { parseImage } from './image-parser';

export interface ParseResult {
  content: ParsedContent;
  imageScore: number;  // 0–100, based on OCR confidence
  ocrFailed: boolean;
}

export async function parseInput(request: AnalysisRequest): Promise<ParseResult> {
  switch (request.type) {
    case 'email_text':
    case 'eml_file': {
      const content = await parseEmail(request.content);
      return { content, imageScore: 0, ocrFailed: false };
    }

    case 'plain_text': {
      const content = parsePlainText(request.content);
      return { content, imageScore: 0, ocrFailed: false };
    }

    case 'image': {
      const result = await parseImage(request.content);
      return {
        content: result.parsed,
        imageScore: result.ocrSuccess ? result.ocrConfidence : 0,
        ocrFailed: !result.ocrSuccess,
      };
    }

    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = request.type;
      throw new Error(`Unknown input type: ${_exhaustive}`);
    }
  }
}
