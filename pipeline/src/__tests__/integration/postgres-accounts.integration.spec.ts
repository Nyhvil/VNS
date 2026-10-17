import { PostgresStore } from '../../web/postgres-store';
import { PostgresAccountStore } from '../../web/accounts/postgres-account-store';
import { AccountService } from '../../web/accounts/account-service';

/**
 * Accounts against a real PostgreSQL. Runs when DATABASE_TEST_URL is set; it
 * empties the account tables of that database, so use one made for testing.
 */
const DATABASE_TEST_URL = process.env['DATABASE_TEST_URL'];
const describeWithDatabase = DATABASE_TEST_URL ? describe : describe.skip;

describeWithDatabase('PostgresAccountStore (real database)', () => {
  let scans: PostgresStore;
  let store: PostgresAccountStore;
  let service: AccountService;

  beforeAll(async () => {
    scans = await PostgresStore.connect(DATABASE_TEST_URL as string);
    await scans.init();
    store = new PostgresAccountStore(scans.pool);
    await store.init();
  });

  beforeEach(async () => {
    await scans.pool.query(
      'TRUNCATE accounts, account_sessions, usage_daily, payment_orders, family_members, business_leads, scans CASCADE'
    );
    service = new AccountService(store, { guestDailyLimitPerIp: 100 });
  });

  afterAll(async () => {
    await scans.close();
  });

  it('should be fine with creating its tables twice', async () => {
    await expect(store.init()).resolves.toBeUndefined();
    await expect(scans.init()).resolves.toBeUndefined();
  });

  it('should register, refuse a duplicate email and sign in', async () => {
    await service.register({ email: 'An@Example.com', name: 'An', password: 'mat-khau-123' });
    await expect(service.register({ email: 'an@example.com', name: 'An', password: 'mat-khau-123' })).rejects.toMatchObject({
      code: 'EMAIL_TAKEN',
    });
    const login = await service.login({ email: 'an@example.com', password: 'mat-khau-123' });
    expect(login).not.toBeNull();
    expect((await service.accountForToken(login!.token))?.account.email).toBe('an@example.com');
  });

  it('should hand out exactly the daily limit when 40 requests arrive at once', async () => {
    const identity = { kind: 'guest' as const, guestId: 'guest-aaaaaaaaaaaaaaaa', ip: '1.1.1.1' };
    const results = await Promise.allSettled(Array.from({ length: 40 }, () => service.reserveAnalysis(identity)));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(5);
    expect((await service.usage(identity)).used).toBe(5);
  });

  it('should count without a limit for a paid plan and give uses back', async () => {
    expect(await store.reserveUsage('account:x', '2026-10-17', null)).toBe(1);
    expect(await store.reserveUsage('account:x', '2026-10-17', null)).toBe(2);
    await store.releaseUsage('account:x', '2026-10-17');
    expect(await store.getUsage('account:x', '2026-10-17')).toBe(1);
    expect(await store.getUsageMany(['account:x', 'account:y'], '2026-10-17')).toEqual({ 'account:x': 1, 'account:y': 0 });
  });

  it('should pay an order only once even when confirmed twice at the same time', async () => {
    const { account } = await service.register({ email: 'an@example.com', name: 'An', password: 'mat-khau-123' });
    const order = await service.createOrder(account, 'premium', 1);
    const results = await Promise.allSettled([service.confirmOrder(order, 'admin'), service.confirmOrder(order, 'admin')]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect((await store.findOrderByCode(order.code))?.status).toBe('paid');
    expect((await store.findAccountById(account.id))?.plan).toBe('premium');
  });

  it('should keep families, business requests and per-account history', async () => {
    const { account: owner } = await service.register({ email: 'chu@example.com', name: 'Chủ', password: 'mat-khau-123' });
    await service.register({ email: 'con@example.com', name: 'Con', password: 'mat-khau-123' });
    await service.confirmOrder(await service.createOrder(owner, 'family', 1), 'admin');
    await service.addFamilyMember((await store.findAccountById(owner.id))!, 'con@example.com');
    const member = (await store.findAccountByEmail('con@example.com'))!;
    expect((await service.entitlement(member)).source).toBe('family');

    await service.createLead({ name: 'B', organization: 'Cty', email: 'b@b.vn', service: 'website' });
    expect(await store.setLeadStatus((await store.listLeads(10))[0]!.id, 'closed')).toBe(true);

    await scans.insertScan({
      session_id: 's',
      user_id: null,
      type: 'text',
      content_text: 'xin chào',
      image_url: null,
      risk_level: 'SAFE',
      ai_result: 'ok',
      dangerous_phrases: [],
      account_id: member.id,
    });
    expect(await scans.listScansByAccount(member.id, 10)).toHaveLength(1);
    expect(await scans.listScansByAccount(owner.id, 10)).toHaveLength(0);

    const overview = await service.adminOverview();
    expect(overview.accountStats).toMatchObject({ totalAccounts: 2, activePaid: 1, revenue: 109000 });
  });
});
