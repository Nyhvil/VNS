import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import express from 'express';
import request from 'supertest';
import { createWebRouter, WebDeps, WebSettings, MAX_TEXT_LENGTH, ADMIN_MAX_FAILURES } from '../../web/web-router';
import { FileStore } from '../../web/file-store';
import { ChatUnavailableError } from '../../chat/chat-service';

jest.mock('../../config/config', () => ({
  getConfig: jest.fn(() => ({ llmEnabled: false })),
}));

jest.mock('../../logger/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
  logLayerError: jest.fn(),
}));

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('fake image body for the test'),
]);

function pipelineAnswer(overrides: Record<string, unknown> = {}) {
  return {
    job_id: '550e8400-e29b-41d4-a716-446655440000',
    status: 'completed',
    risk_score: 91,
    risk_level: 'critical',
    category: 'phishing',
    findings: [{ rule_id: 'scam_pattern', severity: 'high', description: 'Khớp mẫu lừa đảo' }],
    evidence: {
      url_checks: [{ url: 'http://vietcombank-xacminh.top', suspicious: true, reasons: ['Tên miền nhái'] }],
    },
    recommendation: '',
    analysis_path: 'deep',
    layers: [{ id: 'rule', label: 'Rule', weight: 0.25, score: 100, applied: true }],
    formula_score: 91,
    llm_floor_applied: false,
    vns: {
      scam_percent: 91,
      risk_level: 'SCAM',
      explanation: 'Tin nhắn giả danh ngân hàng.',
      dangerous_phrases: ['cung cấp mã OTP'],
      advice: 'Không bấm vào link.',
      verification_summary: '',
    },
    ...overrides,
  };
}

describe('Standalone web backend (/functions/v1/*)', () => {
  let dir: string;
  let store: FileStore;
  let analyze: jest.Mock;
  let chat: jest.Mock;
  let logError: jest.Mock;

  const DEFAULT_SETTINGS: WebSettings = {
    adminPassword: 'đúng-mật-khẩu',
    storeImages: true,
    trustedProxyHops: 1,
    rateLimitPerIp: 100,
    rateLimitWindowMs: 60_000,
    rateLimitGlobalPerMinute: 0,
  };

  function buildApp(settings: Partial<WebSettings> = {}, overrides: Partial<WebDeps> = {}) {
    const app = express();
    app.use(express.json({ limit: '15mb' }));
    app.use(
      createWebRouter({
        store,
        analyze,
        chat,
        logError,
        settings: { ...DEFAULT_SETTINGS, ...settings },
        ...overrides,
      })
    );
    return app;
  }

  beforeEach(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vns-web-'));
    store = new FileStore(dir);
    await store.init();
    analyze = jest.fn().mockResolvedValue(pipelineAnswer());
    chat = jest.fn().mockResolvedValue({ answer: 'Đừng bấm vào link.', sources: [] });
    logError = jest.fn();
  });

  afterEach(async () => {
    await store.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  describe('POST /functions/v1/analyze-content', () => {
    it('should analyse a text and answer in the shape the web app expects', async () => {
      const response = await request(buildApp())
        .post('/functions/v1/analyze-content')
        .send({ text: '  Vietcombank: cung cấp mã OTP tại http://vietcombank-xacminh.top  ', sessionId: 'sess-1', userId: 'user-1' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        scamPercent: 91,
        riskLevel: 'SCAM',
        explanation: 'Tin nhắn giả danh ngân hàng.',
        dangerousPhrases: ['cung cấp mã OTP'],
        advice: 'Không bấm vào link.',
        engine: 'pipeline',
        urlsChecked: 1,
        suspiciousUrls: [{ url: 'http://vietcombank-xacminh.top', reasons: ['Tên miền nhái'] }],
      });
      expect(response.body.pipeline.layers).toHaveLength(1);

      expect(analyze).toHaveBeenCalledTimes(1);
      expect(analyze.mock.calls[0][0]).toMatchObject({
        type: 'plain_text',
        content: 'Vietcombank: cung cấp mã OTP tại http://vietcombank-xacminh.top',
        metadata: { source: 'vns-web' },
      });
      expect(analyze.mock.calls[0][0].job_id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('should save the scan and the log for the admin page', async () => {
      await request(buildApp())
        .post('/functions/v1/analyze-content')
        .send({ text: 'Xin chào', sessionId: 'sess-1', userId: 'user-1' })
        .expect(200);

      const admin = await store.getAdminData();
      expect(admin.scans).toHaveLength(1);
      expect(admin.scans[0]).toMatchObject({
        session_id: 'sess-1',
        user_id: 'user-1',
        type: 'text',
        content_text: 'Xin chào',
        image_url: null,
        risk_level: 'SCAM',
        ai_result: 'Tin nhắn giả danh ngân hàng.',
        dangerous_phrases: ['cung cấp mã OTP'],
      });
      expect(admin.logs[0]).toMatchObject({ session_id: 'sess-1', user_id: 'user-1', text_length: 8, scam_percent: 91, feedback: null });
    });

    it('should send a pasted raw email as an email, so its headers are checked', async () => {
      const rawEmail = 'From: a@b.vn\nTo: c@d.vn\nSubject: Xin chào\nAuthentication-Results: mx; spf=fail\n\nNội dung thư';
      await request(buildApp()).post('/functions/v1/analyze-content').send({ text: rawEmail }).expect(200);
      expect(analyze.mock.calls[0][0].type).toBe('email_text');
    });

    it('should analyse an image, keep it, and serve it back from /uploads', async () => {
      analyze.mockResolvedValue(
        pipelineAnswer({ vns: { ...pipelineAnswer().vns, extracted_text: 'Chữ đọc được trong ảnh' } })
      );
      const app = buildApp();

      const response = await request(app)
        .post('/functions/v1/analyze-content')
        .send({ imageBase64: PNG.toString('base64'), text: 'ghi chú thêm', sessionId: 'sess-2' });

      expect(response.status).toBe(200);
      expect(response.body.extractedText).toBe('Chữ đọc được trong ảnh');
      expect(analyze.mock.calls[0][0]).toMatchObject({
        type: 'image',
        content: PNG.toString('base64'),
        metadata: { additional_text: 'ghi chú thêm' },
      });

      const scan = (await store.getAdminData()).scans[0];
      expect(scan).toMatchObject({ type: 'image', content_text: 'Chữ đọc được trong ảnh', user_id: null });
      expect(scan?.image_url).toMatch(/^\/uploads\/[0-9a-f-]{36}$/);

      const image = await request(app).get(scan?.image_url ?? '').buffer(true).parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      });
      expect(image.status).toBe(200);
      expect(image.headers['content-type']).toBe('image/png');
      expect(image.headers['content-security-policy']).toContain("default-src 'none'");
      expect(Buffer.compare(image.body, PNG)).toBe(0);
    });

    it('should not keep the image when STORE_IMAGES is off', async () => {
      await request(buildApp({ storeImages: false }))
        .post('/functions/v1/analyze-content')
        .send({ imageBase64: PNG.toString('base64') })
        .expect(200);

      expect((await store.getAdminData()).scans[0]?.image_url).toBeNull();
      expect(fs.readdirSync(path.join(dir, 'uploads'))).toHaveLength(0);
    });

    it('should refuse an upload that is not an image, before analysing it', async () => {
      const response = await request(buildApp())
        .post('/functions/v1/analyze-content')
        .send({ imageBase64: Buffer.from('<html><script>alert(1)</script></html>').toString('base64') });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('không phải ảnh');
      expect(analyze).not.toHaveBeenCalled();
    });

    it('should answer 400 when there is neither text nor image', async () => {
      const response = await request(buildApp()).post('/functions/v1/analyze-content').send({ text: '   ', imageBase64: null });
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Cần có nội dung text hoặc hình ảnh' });
      expect(analyze).not.toHaveBeenCalled();
    });

    it('should refuse a text that is too long', async () => {
      const response = await request(buildApp())
        .post('/functions/v1/analyze-content')
        .send({ text: 'a'.repeat(MAX_TEXT_LENGTH + 1) });
      expect(response.status).toBe(413);
      expect(analyze).not.toHaveBeenCalled();
    });

    it('should answer 422 and save nothing when the image cannot be read', async () => {
      analyze.mockResolvedValue(pipelineAnswer({ category: 'unreadable_image' }));

      const response = await request(buildApp())
        .post('/functions/v1/analyze-content')
        .send({ imageBase64: PNG.toString('base64') });

      expect(response.status).toBe(422);
      expect(response.body.error).toContain('Không đọc được chữ trong ảnh');
      expect((await store.getAdminData()).stats.totalScans).toBe(0);
    });

    it('should answer 504 on a timeout and 500 on any other failure', async () => {
      analyze.mockRejectedValueOnce(new Error('Analysis timeout'));
      const timeout = await request(buildApp()).post('/functions/v1/analyze-content').send({ text: 'a' });
      expect(timeout.status).toBe(504);

      analyze.mockRejectedValueOnce(new Error('boom'));
      const failure = await request(buildApp()).post('/functions/v1/analyze-content').send({ text: 'a' });
      expect(failure.status).toBe(500);
      expect(failure.body).toEqual({ error: 'Đã xảy ra lỗi khi phân tích.' });
      expect(logError).toHaveBeenCalledWith('web.analyze_failed', expect.any(Error));
    });

    it('should still give the visitor the result when saving fails', async () => {
      const brokenStore = Object.assign(Object.create(store), {
        insertScan: jest.fn().mockRejectedValue(new Error('disk full')),
      });

      const response = await request(buildApp({}, { store: brokenStore }))
        .post('/functions/v1/analyze-content')
        .send({ text: 'Xin chào' });

      expect(response.status).toBe(200);
      expect(response.body.scamPercent).toBe(91);
      expect(logError).toHaveBeenCalledWith('web.save_failed', expect.any(Error));
    });

    it('should make up a session id when the browser sends none or a bad one', async () => {
      await request(buildApp()).post('/functions/v1/analyze-content').send({ text: 'a', sessionId: { $ne: null } }).expect(200);
      const scan = (await store.getAdminData()).scans[0];
      expect(scan?.session_id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('should slow down an address that analyses too often', async () => {
      const app = buildApp({ rateLimitPerIp: 2 });
      const send = () => request(app).post('/functions/v1/analyze-content').set('X-Forwarded-For', '5.5.5.5').send({ text: 'a' });

      expect((await send()).status).toBe(200);
      expect((await send()).status).toBe(200);
      const blocked = await send();
      expect(blocked.status).toBe(429);
      expect(blocked.body.error).toContain('đợi một lát');
      expect(analyze).toHaveBeenCalledTimes(2);
    });
  });

  describe('POST /functions/v1/submit-feedback', () => {
    it('should attach the feedback to the last analysis of the session', async () => {
      const app = buildApp();
      await request(app).post('/functions/v1/analyze-content').send({ text: 'a', sessionId: 'sess-1' }).expect(200);

      const response = await request(app).post('/functions/v1/submit-feedback').send({ sessionId: 'sess-1', feedback: 'incorrect' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
      expect((await store.getAdminData()).stats.incorrectFeedback).toBe(1);
    });

    it('should refuse a missing session or an unknown feedback value', async () => {
      const app = buildApp();
      await request(app).post('/functions/v1/submit-feedback').send({ feedback: 'correct' }).expect(400);
      await request(app).post('/functions/v1/submit-feedback').send({ sessionId: 's', feedback: '<script>' }).expect(400);
    });
  });

  describe('POST /functions/v1/admin-data', () => {
    it('should return the statistics and the rows for the right password', async () => {
      const app = buildApp();
      await request(app).post('/functions/v1/analyze-content').send({ text: 'a', sessionId: 's1', userId: 'u1' }).expect(200);
      await request(app).post('/functions/v1/analyze-content').send({ text: 'bb', sessionId: 's1', userId: 'u1' }).expect(200);

      const response = await request(app).post('/functions/v1/admin-data').send({ password: 'đúng-mật-khẩu' });

      expect(response.status).toBe(200);
      expect(response.body.stats).toMatchObject({
        totalScans: 2,
        textScans: 2,
        uniqueUsers: 1,
        returnUsers: 1,
        totalAnalyses: 2,
        avgScamPercent: 91,
        totalCharsAnalyzed: 3,
        returningSessions: 1,
      });
      expect(response.body.scans).toHaveLength(2);
      expect(response.body.logs).toHaveLength(2);
    });

    it('should answer 401 for a wrong or missing password and return no data', async () => {
      const app = buildApp();
      for (const body of [{ password: 'sai' }, { password: '' }, {}, { password: ['đúng-mật-khẩu'] }]) {
        const response = await request(app).post('/functions/v1/admin-data').send(body);
        expect(response.status).toBe(401);
        expect(response.body).toEqual({ error: 'Unauthorized' });
      }
    });

    it('should say so when the server has no admin password', async () => {
      const response = await request(buildApp({ adminPassword: undefined }))
        .post('/functions/v1/admin-data')
        .send({ password: 'bất kỳ' });
      expect(response.status).toBe(503);
      expect(response.body.error).toContain('ADMIN_PASSWORD');
    });

    it('should block an address after 10 attempts, even with the right password', async () => {
      const app = buildApp();
      const attempt = (password: string) =>
        request(app).post('/functions/v1/admin-data').set('X-Forwarded-For', '6.6.6.6').send({ password });

      for (let i = 0; i < 10; i++) expect((await attempt('sai')).status).toBe(401);
      expect((await attempt('đúng-mật-khẩu')).status).toBe(429);

      // Someone else is not locked out.
      const other = await request(app).post('/functions/v1/admin-data').set('X-Forwarded-For', '7.7.7.7').send({ password: 'đúng-mật-khẩu' });
      expect(other.status).toBe(200);
    });
  });

  describe('POST /functions/v1/admin-data, guessing from many addresses', () => {
    it('should stop answering wrong passwords once there are too many, whatever the address', async () => {
      const app = buildApp();
      const guess = (i: number) =>
        request(app).post('/functions/v1/admin-data').set('X-Forwarded-For', `10.1.${i}.1`).send({ password: `sai-${i}` });

      for (let i = 0; i < ADMIN_MAX_FAILURES; i++) expect((await guess(i)).status).toBe(401);

      const blocked = await guess(999);
      expect(blocked.status).toBe(429);
      expect(blocked.body.error).toContain('quá nhiều lần nhập sai');

      // The owner, with the right password, still gets in.
      const owner = await request(app)
        .post('/functions/v1/admin-data')
        .set('X-Forwarded-For', '10.9.9.9')
        .send({ password: 'đúng-mật-khẩu' });
      expect(owner.status).toBe(200);
    });
  });

  describe('POST /functions/v1/scam-chat', () => {
    it('should pass the question and the analysis to the chatbot', async () => {
      const response = await request(buildApp())
        .post('/functions/v1/scam-chat')
        .send({
          question: 'Tôi nên làm gì?',
          content: 'Tin nhắn đòi OTP',
          verdict: { riskLevel: 'SCAM', scamPercent: 91, explanation: 'Giả danh ngân hàng' },
          history: [{ role: 'user', content: 'Chào' }],
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ answer: 'Đừng bấm vào link.', sources: [], engine: 'pipeline' });
      expect(chat.mock.calls[0][0]).toEqual({
        question: 'Tôi nên làm gì?',
        content: 'Tin nhắn đòi OTP',
        verdict: { risk_level: 'SCAM', scam_percent: 91, explanation: 'Giả danh ngân hàng' },
        history: [{ role: 'user', content: 'Chào' }],
      });
    });

    it('should answer 400 without a question', async () => {
      const response = await request(buildApp()).post('/functions/v1/scam-chat').send({ question: '  ' });
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Hãy nhập câu hỏi.' });
      expect(chat).not.toHaveBeenCalled();
    });

    it('should answer 503 when no LLM is configured', async () => {
      chat.mockRejectedValue(new ChatUnavailableError('no llm'));
      const response = await request(buildApp()).post('/functions/v1/scam-chat').send({ question: 'Vì sao?' });
      expect(response.status).toBe(503);
      expect(response.body).toEqual({ error: 'Trợ lý chưa được cấu hình.' });
    });

    it('should answer 504 on an LLM timeout and 500 otherwise', async () => {
      chat.mockRejectedValueOnce(new Error('LLM timeout'));
      expect((await request(buildApp()).post('/functions/v1/scam-chat').send({ question: 'a' })).status).toBe(504);
      chat.mockRejectedValueOnce(new Error('boom'));
      expect((await request(buildApp()).post('/functions/v1/scam-chat').send({ question: 'a' })).status).toBe(500);
    });
  });

  describe('GET /uploads/:id', () => {
    it('should answer 404 for an unknown image or a strange id', async () => {
      const app = buildApp();
      await request(app).get('/uploads/11111111-1111-4111-8111-111111111111').expect(404);
      await request(app).get('/uploads/..%2F..%2Fetc%2Fpasswd').expect(404);
      await request(app).get('/uploads/scans.jsonl').expect(404);
    });
  });
});
