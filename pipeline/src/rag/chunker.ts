import { ParsedContent, Chunk, isParsedEmail } from '../types';

export function recursiveChunk(text: string, size = 800, overlap = 100): string[] {
  if (text.length <= size) {
    return [text];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + size;

    if (endIndex < text.length) {
      // Find a good boundary
      const searchWindow = text.slice(startIndex, endIndex);
      let boundaryIndex = -1;

      // 1. Try paragraph break
      boundaryIndex = searchWindow.lastIndexOf('\n\n');
      if (boundaryIndex === -1 || boundaryIndex < size * 0.5) {
        // 2. Try newline
        boundaryIndex = searchWindow.lastIndexOf('\n');
      }
      if (boundaryIndex === -1 || boundaryIndex < size * 0.5) {
        // 3. Try sentence end
        const match = searchWindow.match(/[.!?]\s+(?=[^.!?]*$)/);
        if (match && match.index !== undefined) {
          boundaryIndex = match.index + 1;
        }
      }
      if (boundaryIndex === -1 || boundaryIndex < size * 0.5) {
        // 4. Try space
        boundaryIndex = searchWindow.lastIndexOf(' ');
      }

      if (boundaryIndex !== -1 && boundaryIndex > 0) {
        endIndex = startIndex + boundaryIndex;
      }
    }

    const chunkText = text.slice(startIndex, endIndex).trim();
    if (chunkText) {
      chunks.push(chunkText);
    }

    startIndex = endIndex - overlap;
    if (startIndex >= text.length || endIndex >= text.length) {
      break;
    }
    if (startIndex <= endIndex - size) {
      startIndex = endIndex;
    }
  }

  return chunks;
}

export function messageBasedChunk(text: string, batchCount = 4, overlapCount = 1): string[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const chunks: string[] = [];
  if (lines.length === 0) return chunks;

  const step = batchCount - overlapCount;
  const actualStep = step > 0 ? step : 1;

  for (let i = 0; i < lines.length; i += actualStep) {
    const chunkLines = lines.slice(i, i + batchCount);
    if (chunkLines.length > 0) {
      chunks.push(chunkLines.join('\n'));
    }
    if (i + batchCount >= lines.length) {
      break;
    }
  }

  return chunks;
}

const isChatApp = (source?: string): boolean => {
  if (!source) return false;
  const lower = source.toLowerCase();
  return ['messenger', 'zalo', 'viber', 'sms', 'telegram', 'whatsapp', 'chat'].some(app => 
    lower.includes(app)
  );
};

export function chunkContent(content: ParsedContent): Chunk[] {
  let chunks: string[] = [];

  const appSource = content.metadata?.app_source;

  if (isParsedEmail(content)) {
    const fullText = [content.subject ?? '', content.body].join('\n').trim();
    chunks = recursiveChunk(fullText);
  } else if (isChatApp(appSource)) {
    chunks = messageBasedChunk(content.body);
  } else {
    chunks = recursiveChunk(content.body);
  }

  return chunks.map((text, index) => ({
    text,
    index,
    metadata: content.metadata
  }));
}
