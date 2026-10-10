import { AnalysisRequest, ParsedContent, ParsedText } from '../types';
import { parseEmail } from './email-parser';
import { parsePlainText, extractUrlsFromText } from './plain-text-parser';
import { parseImage } from './image-parser';

export interface ParseResult {
  content: ParsedContent;
  imageScore: number;  // 0–100, based on OCR confidence
  ocrFailed: boolean;
}

export const ADDITIONAL_TEXT_SEPARATOR = '--- Nội dung bổ sung từ người dùng ---';

/**
 * A screenshot may come with a note the user typed next to it
 * (metadata.additional_text). It is analysed together with the image text.
 */
function withAdditionalText(parsed: ParsedText, metadata: AnalysisRequest['metadata']): ParsedText {
  const extra = metadata?.['additional_text'];
  if (typeof extra !== 'string' || !extra.trim()) return parsed;

  const note = extra.trim().slice(0, 10000);
  const body = parsed.body ? `${parsed.body}\n\n${ADDITIONAL_TEXT_SEPARATOR}\n${note}` : note;
  const urls = [...new Set([...parsed.urls, ...extractUrlsFromText(note)])];

  return { ...parsed, body, urls };
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
      const content = withAdditionalText(result.parsed, request.metadata);
      return {
        content,
        imageScore: result.ocrSuccess ? result.ocrConfidence : 0,
        // Text typed next to an unreadable image is still worth analysing.
        ocrFailed: !result.ocrSuccess && content.body.trim() === '',
      };
    }

    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = request.type;
      throw new Error(`Unknown input type: ${_exhaustive}`);
    }
  }
}
