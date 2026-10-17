import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import express from 'express';
import request from 'supertest';
import { createWebRouter, WebSettings } from '../../web/web-router';
import { FileStore } from '../../web/file-store';
import { FileAccountStore } from '../../web/accounts/file-account-store';
import { AccountService } from '../../web/accounts/account-service';
import { PaymentSettings } from '../../web/accounts/account-router';

jest.mock('../../config/config', () => ({ getConfig: jest.fn(() => ({ llmEnabled: false })) }));
jest.mock('../../logger/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
  logLayerError: jest.fn(),
}));

const ANSWER = {
  job_id: '550e8400-e29b-41d4-a716-446655440000',
  status: 'completed',
  risk_score: 91,
  risk_level: 'critical',
  category: 'phishing',
  findings: [],
  evidence: {},
  recommendation: '',
  vns: { scam_percent: 91, risk_level: 'SCAM', explanation: 'Lừa đảo', dangerous_phrases: [], advice: '', verification_summary: '' },
};

const SETTINGS: WebSettings = {
  adminPassword: 'admin-pw',
  storeImages: false,
  trustedProxyHops: 1,
  rateLimitPerIp: 1000,
  rateLimitWindowMs: 60_000,
  rateLimitGlobalPerMinute: 0,
};

describe('Accounts and plans over HTTP', () => {
  let dir: string;
  let store: FileStore;
  let accountStore: FileAccountStore;
  let analyze: jest.Mock;

  function buildApp(payment: PaymentSettings = { mode: 'manual', bankName: 'MB Bank', accountNumber: '0123456789', accountName: 'NGUYEN VAN A' }) {
    const app = express();
    app.use(express.json());
    app.use(
      createWebRouter({
        store,
        accounts: new AccountService(accountStore, { guestDailyLimitPerIp: 50 }),
        payment,
        analyze,
        chat: jest.fn(),
        logError: jest.fn(),
        settings: SETTINGS,
      })
    );
    return app;
  }

  beforeEach(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vns-acc-http-'));
    store = new FileStore(dir);
    await store.init();
    accountStore = new FileAccountStore(dir);
    await accountStore.init();
    analyze = jest.fn().mockResolvedValue(ANSWER);
  });

  afterEach(async () => {
    await accountStore.close();
    await store.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  type Agent = ReturnType<typeof request.agent>;
  const register = (agent: Agent, email = 'an@example.com') =>
    agent.post('/api/auth/register').send({ email, name: 'Nguyễn An', password: 'mat-khau-123' });

  it('should register, set an HttpOnly session cookie and answer /api/me', async () => {
    const agent = request.agent(buildApp());
    const response = await register(agent);

    expect(response.status).toBe(201);
    const cookie = String(response.headers['set-cookie']);
    expect(cookie).toContain('vns_session=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(response.body.account).toMatchObject({ email: 'an@example.com', entitlement: { plan: 'free', dailyLimit: 10 } });
    expect(JSON.stringify(response.body)).not.toContain('password');

    const me = await agent.get('/api/me');
    expect(me.body.account.email).toBe('an@example.com');
    expect(me.body.usage).toMatchObject({ used: 0, limit: 10 });
    expect(me.headers['cache-control']).toBe('no-store');
  });

  it('should mark the session cookie Secure behind an HTTPS proxy', async () => {
    const response = await request(buildApp())
      .post('/api/auth/register')
      .set('X-Forwarded-Proto', 'https')
      .send({ email: 'an@example.com', name: 'An', password: 'mat-khau-123' });
    expect(String(response.headers['set-cookie'])).toContain('Secure');
  });

  it('should give a guest a cookie and 5 analyses, then explain how to get more', async () => {
    const agent = request.agent(buildApp());
    const me = await agent.get('/api/me');
    expect(me.body).toMatchObject({ account: null, usage: { used: 0, limit: 5 } });
    expect(String(me.headers['set-cookie'])).toContain('vns_guest=');

    for (let i = 1; i <= 5; i++) {
      const ok = await agent.post('/functions/v1/analyze-content').send({ text: `tin ${i}` });
      expect(ok.status).toBe(200);
      expect(ok.body.usage).toMatchObject({ used: i, limit: 5 });
    }
    const blocked = await agent.post('/functions/v1/analyze-content').send({ text: 'tin 6' });
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe('QUOTA_EXCEEDED');
    expect(blocked.body.error).toContain('Đăng ký miễn phí');
    expect(analyze).toHaveBeenCalledTimes(5);
  });

  it('should not count an analysis that failed or a request that was refused', async () => {
    const agent = request.agent(buildApp());
    await agent.post('/functions/v1/analyze-content').send({ text: '' }).expect(400);
    analyze.mockRejectedValueOnce(new Error('boom'));
    await agent.post('/functions/v1/analyze-content').send({ text: 'a' }).expect(500);
    analyze.mockResolvedValueOnce({ ...ANSWER, category: 'unreadable_image' });
    await agent.post('/functions/v1/analyze-content').send({ text: 'a' }).expect(422);
    expect((await agent.get('/api/me')).body.usage.used).toBe(0);
  });

  it('should give a signed-in account 10 analyses and keep its history to itself', async () => {
    const an = request.agent(buildApp());
    await register(an);
    for (let i = 0; i < 10; i++) await an.post('/functions/v1/analyze-content').send({ text: `tin ${i}` }).expect(200);
    const blocked = await an.post('/functions/v1/analyze-content').send({ text: 'x' });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toContain('nâng cấp');

    const history = await an.get('/api/account/history');
    expect(history.body.scans).toHaveLength(10);
    expect(history.body.scans[0]).toMatchObject({ content: 'tin 9', riskLevel: 'SCAM' });

    const binh = request.agent(buildApp());
    await register(binh, 'binh@example.com');
    expect((await binh.get('/api/account/history')).body.scans).toEqual([]);
  });

  it('should sign in, refuse a wrong password without saying which part was wrong, and sign out', async () => {
    const app = buildApp();
    await register(request.agent(app));

    const wrong = await request(app).post('/api/auth/login').send({ email: 'an@example.com', password: 'sai-roi-123' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'ai@example.com', password: 'sai-roi-123' });
    expect(wrong.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);

    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'an@example.com', password: 'mat-khau-123' }).expect(200);
    expect((await agent.get('/api/me')).body.account).not.toBeNull();
    await agent.post('/api/auth/logout').expect(200);
    expect((await agent.get('/api/me')).body.account).toBeNull();
    await agent.get('/api/account/history').expect(401);
  });

  it('should lock an email after 10 wrong passwords', async () => {
    const app = buildApp();
    await register(request.agent(app));
    for (let i = 0; i < 10; i++) {
      await request(app).post('/api/auth/login').set('X-Forwarded-For', `9.9.9.${i}`).send({ email: 'an@example.com', password: 'sai' }).expect(401);
    }
    const locked = await request(app).post('/api/auth/login').set('X-Forwarded-For', '8.8.8.8').send({ email: 'an@example.com', password: 'sai' });
    expect(locked.status).toBe(429);
  });

  it('should refuse a request sent by a page on another site', async () => {
    const agent = request.agent(buildApp());
    await register(agent);
    const response = await agent.post('/api/account/orders').set('Origin', 'https://evil.example').send({ plan: 'premium', months: 1 });
    expect(response.status).toBe(403);
    const analyse = await agent.post('/functions/v1/analyze-content').set('Origin', 'https://evil.example').send({ text: 'a' });
    expect(analyse.status).toBe(403);
  });

  it('should list the plans and the payment details', async () => {
    const response = await request(buildApp()).get('/api/plans');
    expect(response.body.guestDailyLimit).toBe(5);
    expect(response.body.plans.map((p: { id: string; pricePerMonth: number }) => [p.id, p.pricePerMonth])).toEqual([
      ['free', 0],
      ['premium', 29000],
      ['family', 109000],
    ]);
    expect(response.body.payment).toMatchObject({ mode: 'manual', configured: true, accountNumber: '0123456789' });
    expect(response.body.business.map((b: { id: string }) => b.id)).toEqual(['ai_agent', 'website', 'erp', 'other']);
  });

  it('should take an order, let only its owner see it, and give the plan once an admin confirms', async () => {
    const app = buildApp();
    const an = request.agent(app);
    await register(an);
    const created = await an.post('/api/account/orders').send({ plan: 'premium', months: 3 });
    expect(created.status).toBe(201);
    const code = created.body.order.code;
    expect(created.body.order).toMatchObject({ amount: 87000, status: 'pending', planName: 'Nâng cao' });

    const binh = request.agent(app);
    await register(binh, 'binh@example.com');
    await binh.get(`/api/account/orders/${code}`).expect(404);
    await binh.post(`/api/account/orders/${code}/cancel`).expect(404);

    // Manual mode: the buyer cannot mark it paid.
    await an.post(`/api/account/orders/${code}/demo-pay`).expect(403);

    await request(app).post('/functions/v1/admin-action').send({ password: 'sai', action: 'confirm_order', code }).expect(401);
    const confirmed = await request(app).post('/functions/v1/admin-action').send({ password: 'admin-pw', action: 'confirm_order', code });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.accountStats).toMatchObject({ activePaid: 1, revenue: 87000 });

    const me = await an.get('/api/me');
    expect(me.body.account.entitlement).toMatchObject({ plan: 'premium', dailyLimit: null });
    expect((await an.get(`/api/account/orders/${code}`)).body.order.status).toBe('paid');
    // Already paid: cannot be paid or cancelled again.
    await request(app).post('/functions/v1/admin-action').send({ password: 'admin-pw', action: 'confirm_order', code }).expect(409);
  });

  it('should let the buyer pay at once in demo mode', async () => {
    const agent = request.agent(buildApp({ mode: 'demo' }));
    await register(agent);
    const plans = await agent.get('/api/plans');
    expect(plans.body.payment).toMatchObject({ mode: 'demo', configured: false });
    const { body } = await agent.post('/api/account/orders').send({ plan: 'family', months: 1 });
    const paid = await agent.post(`/api/account/orders/${body.order.code}/demo-pay`);
    expect(paid.status).toBe(200);
    expect(paid.body.account.entitlement.plan).toBe('family');
  });

  it('should let a family owner add a member, who then has no daily limit', async () => {
    const app = buildApp({ mode: 'demo' });
    const owner = request.agent(app);
    await register(owner, 'chu@example.com');
    const member = request.agent(app);
    await register(member, 'con@example.com');

    await owner.post('/api/account/family').send({ email: 'con@example.com' }).expect(403);
    const { body } = await owner.post('/api/account/orders').send({ plan: 'family', months: 1 });
    await owner.post(`/api/account/orders/${body.order.code}/demo-pay`).expect(200);

    const added = await owner.post('/api/account/family').send({ email: 'con@example.com' });
    expect(added.status).toBe(201);
    expect(added.body).toMatchObject({ maxMembers: 4, members: [{ email: 'con@example.com' }] });

    const me = await member.get('/api/me');
    expect(me.body.account.entitlement).toMatchObject({ plan: 'family', source: 'family', familyOwner: { email: 'chu@example.com' } });

    await member.post('/api/account/family/leave').expect(200);
    expect((await member.get('/api/me')).body.account.entitlement.plan).toBe('free');
  });

  it('should keep a business request and show it on the admin page', async () => {
    const app = buildApp();
    await request(app)
      .post('/api/business-leads')
      .send({ name: 'Bình', organization: 'Công ty B', email: 'binh@b.vn', phone: '0901234567', service: 'erp', message: 'Báo giá' })
      .expect(201);
    await request(app).post('/api/business-leads').send({ name: 'x' }).expect(400);

    const admin = await request(app).post('/functions/v1/admin-data').send({ password: 'admin-pw' });
    expect(admin.body.leads[0]).toMatchObject({ organization: 'Công ty B', status: 'new' });
    expect(admin.body.accountStats.newLeads).toBe(1);
    // The scan statistics are still there.
    expect(admin.body.stats).toBeDefined();

    const leadId = admin.body.leads[0].id;
    const updated = await request(app).post('/functions/v1/admin-action').send({ password: 'admin-pw', action: 'set_lead_status', leadId, status: 'contacted' });
    expect(updated.body.leads[0].status).toBe('contacted');
  });

  it('should let an admin give or take away a plan', async () => {
    const app = buildApp();
    const agent = request.agent(app);
    const { body } = await register(agent);
    const accountId = body.account.id;

    await request(app).post('/functions/v1/admin-action').send({ password: 'admin-pw', action: 'set_plan', accountId, plan: 'premium', days: 0 }).expect(400);
    await request(app).post('/functions/v1/admin-action').send({ password: 'admin-pw', action: 'set_plan', accountId, plan: 'premium', days: 7 }).expect(200);
    expect((await agent.get('/api/me')).body.account.entitlement.plan).toBe('premium');
    await request(app).post('/functions/v1/admin-action').send({ password: 'admin-pw', action: 'set_plan', accountId, plan: 'free' }).expect(200);
    expect((await agent.get('/api/me')).body.account.entitlement.plan).toBe('free');
  });

  it('should change the password', async () => {
    const agent = request.agent(buildApp());
    await register(agent);
    await agent.post('/api/account/password').send({ currentPassword: 'sai-roi-12', newPassword: 'moi-moi-123' }).expect(400);
    await agent.post('/api/account/password').send({ currentPassword: 'mat-khau-123', newPassword: 'moi-moi-123' }).expect(200);
    await agent.post('/api/auth/logout');
    await agent.post('/api/auth/login').send({ email: 'an@example.com', password: 'moi-moi-123' }).expect(200);
  });
});
