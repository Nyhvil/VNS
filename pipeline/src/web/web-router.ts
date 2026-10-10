import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { Router, Request, Response } from 'express';
import { AnalysisRequest, AnalysisResponse } from '../types';
import { ChatRequest, ChatRequestSchema, ChatResponse, ChatUnavailableError } from '../chat/chat-service';
import { buildPipelineRequest, mapPipelineResponse, PipelineResponse } from './pipeline-client';
import { parseChatInput, toPipelineChatRequest } from './chat-core';
import { decodeBase64, detectImageType } from './image-type';
import { rateLimit, RateLimiter } from './rate-limit';
import { DataStore } from './store';

/**
 * The web app's backend, served by the pipeline itself.
 *
 * The React app talks to four functions through supabase-js
 * (`supabase.functions.invoke(name)`, which is a POST to /functions/v1/<name>).
 * In the Lovable version those are Supabase Edge Functions. This router
 * answers the same four addresses with the same request and response shapes,
 * so the same web app runs against this server with no Supabase project:
 * the analysis runs in-process and the data goes to this server's own store.
 */

export interface WebSettings {
  /** Password of the admin page. Without it the admin page stays closed. */
  adminPassword?: string;
  /** Keep uploaded images so the admin page can show them. */
  storeImages: boolean;
  /** Number of proxies in front of this server (see getClientIp). */
  trustedProxyHops: number;
  /** Analyses one address may ask for per window. */
  rateLimitPerIp: number;
  rateLimitWindowMs: number;
  /** Analyses and chat answers per minute from everyone together. */
  rateLimitGlobalPerMinute: number;
}

export interface WebDeps {
  store: DataStore;
  settings: WebSettings;
  analyze: (request: AnalysisRequest) => Promise<AnalysisResponse>;
  chat: (request: ChatRequest, jobId: string) => Promise<ChatResponse>;
  logError: (event: string, error: unknown) => void;
}

export const MAX_TEXT_LENGTH = 20_000;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
/** Wrong admin passwords tolerated from all addresses together, per window. */
export const ADMIN_MAX_FAILURES = 30;
const ADMIN_FAILURE_WINDOW_MS = 10 * 60_000;
const MAX_ID_LENGTH = 100;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FEEDBACK_VALUES = new Set(['correct', 'incorrect']);

function cleanId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= MAX_ID_LENGTH ? trimmed : null;
}

/** Compare two secrets without leaking, through timing, how much of them matched. */
function secretsMatch(given: string, expected: string): boolean {
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export function createWebRouter(deps: WebDeps): Router {
  const { store, settings } = deps;
  const router = Router();

  const limits = {
    trustedProxyHops: settings.trustedProxyHops,
    windowMs: settings.rateLimitWindowMs,
  };
  const analysisLimit = rateLimit({
    ...limits,
    perIp: settings.rateLimitPerIp,
    globalPerMinute: settings.rateLimitGlobalPerMinute,
    message: 'Bạn kiểm tra hơi nhanh. Vui lòng đợi một lát rồi thử lại.',
  });
  const chatLimit = rateLimit({
    ...limits,
    perIp: settings.rateLimitPerIp * 2,
    globalPerMinute: settings.rateLimitGlobalPerMinute,
    message: 'Bạn hỏi hơi nhanh. Vui lòng đợi một lát rồi thử lại.',
  });
  const feedbackLimit = rateLimit({
    ...limits,
    perIp: settings.rateLimitPerIp * 3,
    message: 'Vui lòng đợi một lát rồi thử lại.',
  });
  // Few attempts, long window: this is what stands between a guesser and the admin page.
  const adminLimit = rateLimit({
    trustedProxyHops: settings.trustedProxyHops,
    perIp: 10,
    windowMs: 10 * 60_000,
    message: 'Thử quá nhiều lần. Vui lòng đợi 10 phút rồi thử lại.',
  });
  // Wrong passwords from everyone together. The per-address limit depends on
  // TRUSTED_PROXY_HOPS being right for the host; this one does not, so a
  // guesser who changes address still gets only a few tries.
  const adminFailures = new RateLimiter(ADMIN_MAX_FAILURES, ADMIN_FAILURE_WINDOW_MS);

  // ─── analyze-content ───────────────────────────────────────────────────
  router.post('/functions/v1/analyze-content', analysisLimit, async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const imageBase64 = typeof body.imageBase64 === 'string' && body.imageBase64 ? body.imageBase64 : null;

    if (!text && !imageBase64) {
      res.status(400).json({ error: 'Cần có nội dung text hoặc hình ảnh' });
      return;
    }
    if (text.length > MAX_TEXT_LENGTH) {
      res.status(413).json({ error: `Nội dung dài quá ${MAX_TEXT_LENGTH.toLocaleString('vi-VN')} ký tự.` });
      return;
    }

    let image: { data: Buffer; contentType: string } | null = null;
    if (imageBase64) {
      const data = decodeBase64(imageBase64);
      const contentType = data ? detectImageType(data) : null;
      if (!data || !contentType) {
        res.status(400).json({ error: 'Tệp tải lên không phải ảnh JPG, PNG, WEBP hoặc GIF.' });
        return;
      }
      if (data.length > MAX_IMAGE_BYTES) {
        res.status(413).json({ error: 'Ảnh lớn quá 10 MB. Hãy dùng ảnh nhỏ hơn.' });
        return;
      }
      image = { data, contentType };
    }

    let result;
    try {
      const response = await deps.analyze(
        buildPipelineRequest({ text: text || null, imageBase64 }, randomUUID()) as AnalysisRequest
      );
      // Same shape the edge function receives over HTTP.
      const outcome = mapPipelineResponse(JSON.parse(JSON.stringify(response)) as PipelineResponse);

      if (outcome.kind === 'unreadable_image') {
        res.status(422).json({
          error: 'Không đọc được chữ trong ảnh. Hãy thử ảnh rõ hơn hoặc dán nội dung dạng văn bản.',
        });
        return;
      }
      result = outcome.result;
    } catch (error) {
      const timedOut = error instanceof Error && error.message === 'Analysis timeout';
      if (!timedOut) deps.logError('web.analyze_failed', error);
      res
        .status(timedOut ? 504 : 500)
        .json({ error: timedOut ? 'Phân tích mất quá nhiều thời gian. Vui lòng thử lại.' : 'Đã xảy ra lỗi khi phân tích.' });
      return;
    }

    // Saving is for the admin page. A storage problem must not cost the
    // visitor the answer they are waiting for.
    try {
      const sessionId = cleanId(body.sessionId) ?? randomUUID();
      const userId = cleanId(body.userId);

      let imageUrl: string | null = null;
      if (image && settings.storeImages) {
        const imageId = randomUUID();
        await store.saveImage(imageId, image);
        imageUrl = `/uploads/${imageId}`;
      }

      const contentText = result.extractedText || text || null;

      await store.insertScan({
        session_id: sessionId,
        user_id: userId,
        type: image ? 'image' : 'text',
        content_text: contentText,
        image_url: imageUrl,
        risk_level: result.riskLevel,
        ai_result: result.explanation,
        dangerous_phrases: result.dangerousPhrases ?? [],
      });
      await store.insertLog({
        session_id: sessionId,
        user_id: userId,
        text_length: (contentText ?? '').length,
        scam_percent: result.scamPercent,
      });
    } catch (error) {
      deps.logError('web.save_failed', error);
    }

    res.status(200).json(result);
  });

  // ─── submit-feedback ───────────────────────────────────────────────────
  router.post('/functions/v1/submit-feedback', feedbackLimit, async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const sessionId = cleanId(body.sessionId);
    const feedback = typeof body.feedback === 'string' ? body.feedback : '';

    if (!sessionId || !FEEDBACK_VALUES.has(feedback)) {
      res.status(400).json({ error: 'Missing sessionId or feedback' });
      return;
    }

    try {
      await store.setFeedbackForLatestLog(sessionId, feedback);
      res.status(200).json({ success: true });
    } catch (error) {
      deps.logError('web.feedback_failed', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── admin-data ────────────────────────────────────────────────────────
  router.post('/functions/v1/admin-data', adminLimit, async (req: Request, res: Response) => {
    if (!settings.adminPassword) {
      res.status(503).json({ error: 'Máy chủ chưa đặt mật khẩu quản trị (biến ADMIN_PASSWORD).' });
      return;
    }

    const password = (req.body as Record<string, unknown> | undefined)?.password;
    if (typeof password !== 'string' || !secretsMatch(password, settings.adminPassword)) {
      if (adminFailures.hit('all') > 0) {
        res.status(429).json({ error: 'Có quá nhiều lần nhập sai mật khẩu. Vui lòng thử lại sau.' });
        return;
      }
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      res.status(200).json(await store.getAdminData());
    } catch (error) {
      deps.logError('web.admin_failed', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── scam-chat ─────────────────────────────────────────────────────────
  router.post('/functions/v1/scam-chat', chatLimit, async (req: Request, res: Response) => {
    const parsed = parseChatInput(req.body ?? null);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const request = ChatRequestSchema.safeParse(toPipelineChatRequest(parsed.input));
    if (!request.success) {
      res.status(400).json({ error: 'Yêu cầu không hợp lệ.' });
      return;
    }

    try {
      const answer = await deps.chat(request.data, randomUUID());
      res.status(200).json({ answer: answer.answer, sources: answer.sources ?? [], engine: 'pipeline' });
    } catch (error) {
      if (error instanceof ChatUnavailableError) {
        res.status(503).json({ error: 'Trợ lý chưa được cấu hình.' });
        return;
      }
      if (error instanceof Error && error.message === 'LLM timeout') {
        res.status(504).json({ error: 'Trợ lý trả lời quá lâu. Vui lòng thử lại.' });
        return;
      }
      deps.logError('web.chat_failed', error);
      res.status(500).json({ error: 'Đã xảy ra lỗi khi trả lời.' });
    }
  });

  // ─── uploaded images (linked from the admin page) ──────────────────────
  router.get('/uploads/:id', async (req: Request, res: Response) => {
    const id = String(req.params['id'] ?? '');
    if (!UUID_PATTERN.test(id)) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    try {
      const image = await store.getImage(id);
      if (!image) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.setHeader('Content-Type', image.contentType);
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'private, max-age=3600');
      // The bytes come from a visitor: the browser may show them, nothing more.
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      res.status(200).send(image.data);
    } catch (error) {
      deps.logError('web.image_failed', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
