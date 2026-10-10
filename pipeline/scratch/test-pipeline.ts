import { recursiveChunk, messageBasedChunk } from '../src/rag/chunker';
import { createEmbeddings } from '../src/rag/embedding-client';
import { extractTextWithVision } from '../src/parser/ocr-processor';
import { storeContentToVectorDb } from '../src/rag/rag-analyzer';
import { ParsedContent } from '../src/types';

async function runTests() {
  console.log('--- Running Chunker Tests ---');
  const text = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6';
  const chatChunks = messageBasedChunk(text, 4, 1);
  console.log('Chat chunks (batch 4, overlap 1):', chatChunks);

  const longText = 'A '.repeat(500) + 'B '.repeat(500);
  const textChunks = recursiveChunk(longText, 800, 100);
  console.log('Recursive chunks count:', textChunks.length);
  console.log('Recursive chunk 1 length:', textChunks[0]?.length);

  console.log('\n--- Running Batch Embedding Tests ---');
  try {
    const embeddings = await createEmbeddings(['Test chunk 1', 'Test chunk 2']);
    console.log('Generated embeddings count:', embeddings.length);
    console.log('Embedding 1 dimension:', embeddings[0]?.length);
  } catch (err) {
    console.log('Batch embedding failed (expected if OPENAI_API_KEY is missing):', err instanceof Error ? err.message : String(err));
  }

  console.log('\n--- Running OCR Vision Test Mock ---');
  const mockBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='; // 1x1 black pixel
  try {
    const ocrResult = await extractTextWithVision(mockBase64);
    console.log('OCR result:', ocrResult);
  } catch (err) {
    console.log('OCR Vision failed (expected if OPENAI_API_KEY is missing):', err instanceof Error ? err.message : String(err));
  }

  console.log('\n--- Running Store Content to VectorDB Test Mock ---');
  const mockContent: ParsedContent = {
    body: 'Suspicious conversation text\nAnother line of chat',
    urls: [],
    metadata: {
      app_source: 'Zalo',
      participants: ['Target', 'Scammer'],
      timestamp: 'Today'
    }
  };
  try {
    await storeContentToVectorDb(mockContent, 'test-job-id', 90);
    console.log('storeContentToVectorDb run successfully.');
  } catch (err) {
    console.log('storeContentToVectorDb failed (expected if DB/OpenAI is down):', err instanceof Error ? err.message : String(err));
  }
}

runTests().catch(err => {
  console.error('Test run crashed:', err);
});
