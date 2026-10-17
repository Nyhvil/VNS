import { OcrResult } from '../types';
import { getConfig } from '../config/config';
import { getReasoningOptions, getVisionEndpoint } from '../config/ai-endpoints';
import { getOcrCache, generateHash } from '../cache/cache-manager';
import { ocrWithMlService } from '../ml/ml-client';

export async function extractTextWithVision(imageBase64: string): Promise<OcrResult> {
  const config = getConfig();
  const cacheEnabled = config.cacheEnabled;
  const imageHash = generateHash(imageBase64);
  const ocrCache = getOcrCache(86400000, config.cacheMaxSize); // OCR cache defaults to 24h TTL

  if (cacheEnabled) {
    const cachedResult = ocrCache.get(imageHash);
    if (cachedResult) {
      return cachedResult;
    }
  }

  const endpoint = getVisionEndpoint(config);
  if (!endpoint.apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  try {
    const OpenAIModule = await import('openai');
    let OpenAI = typeof OpenAIModule.default === 'function'
      ? OpenAIModule.default
      : ((OpenAIModule as any).default || OpenAIModule);
    if (OpenAI && typeof (OpenAI as any).default === 'function') {
      OpenAI = (OpenAI as any).default;
    }
    const client = new OpenAI({ apiKey: endpoint.apiKey, baseURL: endpoint.baseURL });

    const imageUrl = imageBase64.startsWith('data:') 
      ? imageBase64 
      : `data:image/jpeg;base64,${imageBase64}`;

    const response = await client.chat.completions.create({
      model: endpoint.model,
      messages: [
        {
          role: 'system',
          content: `You are an expert AI OCR assistant. Analyze the provided image of a chat conversation, email, or document.
Extract the text content and return a JSON object with the following fields:
{
  "text": "The reconstructed dialogue or document text. For chat screenshots, format it cleanly with sender names if present, representing only the conversation/content itself. Do not include UI noise, status bar indicators (battery, wifi, time), phone status, navigation bars, buttons, or system menu items.",
  "metadata": {
    "app_source": "The source app or medium of the screenshot (e.g., 'Messenger', 'Zalo', 'Viber', 'Telegram', 'SMS', 'Email', 'Unknown')",
    "participants": ["List of names of people participating in the chat, or the sender/receiver if identifiable"],
    "timestamp": "The timestamp of the chat or document if visible, otherwise null"
  }
}
Respond strictly in JSON format.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      ...getReasoningOptions(config),
    });

    const rawContent = response.choices[0]?.message?.content ?? '{}';
    let parsed: { 
      text?: string; 
      metadata?: { 
      app_source?: string; 
        participants?: string[]; 
        timestamp?: string | null; 
      }; 
    };

    try {
      parsed = JSON.parse(rawContent);
    } catch {
      parsed = {};
    }

    const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';
    const success = text.length > 0;
    
    const result: OcrResult = {
      text,
      confidence: success ? 100 : 0,
      success,
      metadata: parsed.metadata ? {
        app_source: typeof parsed.metadata.app_source === 'string' ? parsed.metadata.app_source : undefined,
        participants: Array.isArray(parsed.metadata.participants) ? parsed.metadata.participants.map(String) : undefined,
        timestamp: parsed.metadata.timestamp === null || typeof parsed.metadata.timestamp === 'string' ? parsed.metadata.timestamp : undefined,
      } : undefined
    };

    if (cacheEnabled && success) {
      ocrCache.set(imageHash, result);
    }

    return result;
  } catch (error) {
    // OpenAI Vision failed (e.g. Quota Exceeded 429) -> Fall back to Tesseract OCR offline!
    console.warn(`OpenAI Vision OCR failed: ${error instanceof Error ? error.message : String(error)}. Falling back to Tesseract OCR offline...`);
    
    try {
      const tesseractResult = await extractTextWithTesseract(imageBase64);
      if (cacheEnabled && tesseractResult.success) {
        ocrCache.set(imageHash, tesseractResult);
      }
      return tesseractResult;
    } catch (tesseractError) {
      // If Tesseract also fails, throw the original OpenAI Vision error to maintain backwards compatibility
      throw new Error(`OpenAI Vision OCR failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

async function extractTextWithTesseract(imageBase64: string): Promise<OcrResult> {
  try {
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    
    // Quick validation: actual base64 images are always very large (thousands of characters).
    // Avoid running Tesseract on invalid/mock strings (like 'image' in tests) to prevent worker crashes.
    if (cleanBase64.length < 100) {
      throw new Error('Invalid image base64 format');
    }

    const Tesseract = await import('tesseract.js');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const result = await Tesseract.recognize(buffer, getConfig().tesseractLangs ?? 'vie+eng');
    const text = result.data && typeof result.data.text === 'string' ? result.data.text.trim() : '';
    const success = text.length > 0;

    return {
      text,
      confidence: result.data && typeof result.data.confidence === 'number' ? result.data.confidence : (success ? 100 : 0),
      success,
      metadata: {
        app_source: 'OCR Offline (Tesseract)',
        participants: [],
        timestamp: null,
      }
    };
  } catch (error) {
    throw new Error(`Tesseract OCR fallback failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Read the text of an image, trying each OCR engine in turn:
 *
 *   1. PaddleOCR, through the ML service        (when ML_SERVICE_URL is set)
 *   2. the vision model of the LLM provider     (when an API key is set)
 *   3. Tesseract, offline                        (always available)
 *
 * The first engine that returns text wins.
 */
export async function extractTextFromImage(imageBase64: string): Promise<OcrResult> {
  const config = getConfig();
  const cacheEnabled = config.cacheEnabled;
  const imageHash = generateHash(imageBase64);
  const ocrCache = getOcrCache(86400000, config.cacheMaxSize);

  if (cacheEnabled) {
    const cached = ocrCache.get(imageHash);
    if (cached) return cached;
  }

  if (config.mlServiceUrl) {
    try {
      const paddleResult = await ocrWithMlService(imageBase64);
      if (paddleResult.success) {
        if (cacheEnabled) ocrCache.set(imageHash, paddleResult);
        return paddleResult;
      }
    } catch (error) {
      console.warn(`PaddleOCR failed: ${error instanceof Error ? error.message : String(error)}. Trying the next OCR engine...`);
    }
  }

  if (getVisionEndpoint(config).apiKey) {
    // Falls back to Tesseract by itself when the vision model fails.
    return extractTextWithVision(imageBase64);
  }

  const tesseractResult = await extractTextWithTesseract(imageBase64);
  if (cacheEnabled && tesseractResult.success) {
    ocrCache.set(imageHash, tesseractResult);
  }
  return tesseractResult;
}
