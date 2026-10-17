import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { AccountError, AccountService, Identity } from '../../web/accounts/account-service';
import { FileAccountStore } from '../../web/accounts/file-account-store';

describe('AccountService (file store)', () => {
  let dir: string;
  let store: FileAccountStore;
  let now: Date;
  let service: AccountService;

  const guest = (guestId = 'guest-aaaaaaaaaaaaaaaa', ip = '1.1.1.1'): Identity => ({ kind: 'guest', guestId, ip });

  beforeEach(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vns-acc-'));
    store = new FileAccountStore(dir);
    await store.init();
    now = new Date('2026-10-17T03:00:00Z'); // 10:00 in Vietnam
    service = new AccountService(store, { now: () => now, guestDailyLimitPerIp: 8 });
  });

  afterEach(async () => {
    await store.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const register = (email = 'an@example.com', name = 'Nguyễn An', password = 'mat-khau-123') =>
    service.register({ email, name, password });

  const asIdentity = async (email: string): Promise<Identity> => {
    const account = (await store.findAccountByEmail(email))!;
    return { kind: 'account', account, tokenHash: 'x' };
  };

  const expectCode = async (promise: Promise<unknown>, code: string) => {
    await expect(promise).rejects.toBeInstanceOf(AccountError);
    await promise.catch(error => expect((error as AccountError).code).toBe(code));
  };

  describe('sign up and sign in', () => {
    it('should create an account on the free plan with a lowercase email', async () => {
      const { account, token } = await register('  An@Example.COM ');
      expect(account).toMatchObject({ email: 'an@example.com', name: 'Nguyễn An', plan: 'free' });
      expect(token.length).toBeGreaterThan(30);
      expect((await service.accountForToken(token))?.account.id).toBe(account.id);
    });

    it('should refuse a used email, a bad email, an empty name and a short password', async () => {
      await register();
      await expectCode(register('AN@example.com'), 'EMAIL_TAKEN');
      await expectCode(register('khong-phai-email'), 'INVALID_EMAIL');
      await expectCode(register('b@example.com', '   '), 'INVALID_NAME');
      await expectCode(register('b@example.com', 'B', '1234'), 'WEAK_PASSWORD');
    });

    it('should sign in with the right password only, whatever the case of the email', async () => {
      await register();
      expect(await service.login({ email: 'AN@EXAMPLE.COM', password: 'mat-khau-123' })).not.toBeNull();
      expect(await service.login({ email: 'an@example.com', password: 'sai-mat-khau' })).toBeNull();
      expect(await service.login({ email: 'khong-co@example.com', password: 'mat-khau-123' })).toBeNull();
    });

    it('should sign out, and know nothing of an unknown session', async () => {
      const { token } = await register();
      const session = await service.accountForToken(token);
      await service.logout(session!.tokenHash);
      expect(await service.accountForToken(token)).toBeNull();
      expect(await service.accountForToken('khong-co-phien')).toBeNull();
      expect(await service.accountForToken(undefined)).toBeNull();
    });

    it('should change the password and sign out the other devices', async () => {
      const first = await register();
      const other = await service.login({ email: 'an@example.com', password: 'mat-khau-123' });
      const current = (await service.accountForToken(first.token))!;

      await expectCode(service.changePassword(current.account, current.tokenHash, 'sai', 'mat-khau-moi-1'), 'WRONG_PASSWORD');
      await service.changePassword(current.account, current.tokenHash, 'mat-khau-123', 'mat-khau-moi-1');

      expect(await service.accountForToken(first.token)).not.toBeNull();
      expect(await service.accountForToken(other!.token)).toBeNull();
      expect(await service.login({ email: 'an@example.com', password: 'mat-khau-moi-1' })).not.toBeNull();
    });
  });

  describe('daily allowance', () => {
    it('should give a guest 5 analyses a day, and new ones after 00:00 in Vietnam', async () => {
      for (let i = 0; i < 5; i++) await service.reserveAnalysis(guest());
      await expectCode(service.reserveAnalysis(guest()), 'QUOTA_EXCEEDED');
      expect(await service.usage(guest())).toMatchObject({ used: 5, limit: 5, resetsAt: '2026-10-17T17:00:00.000Z' });

      now = new Date('2026-10-17T16:59:00Z'); // 23:59 in Vietnam: still today
      await expectCode(service.reserveAnalysis(guest()), 'QUOTA_EXCEEDED');

      now = new Date('2026-10-17T17:00:00Z'); // 00:00 next day
      await service.reserveAnalysis(guest());
      expect((await service.usage(guest())).used).toBe(1);
    });

    it('should give the use back when the analysis did not happen', async () => {
      const release = await service.reserveAnalysis(guest());
      expect((await service.usage(guest())).used).toBe(1);
      await release();
      expect((await service.usage(guest())).used).toBe(0);
    });

    it('should also cap all guests behind one address, so clearing cookies does not help', async () => {
      for (let i = 0; i < 8; i++) await service.reserveAnalysis(guest(`guest-${String(i).padStart(16, 'x')}`));
      await expectCode(service.reserveAnalysis(guest('guest-yyyyyyyyyyyyyyyy')), 'QUOTA_EXCEEDED');
      // The refused guest's own counter was given back.
      expect((await service.usage(guest('guest-yyyyyyyyyyyyyyyy'))).used).toBe(0);
      // Another address is not affected.
      await service.reserveAnalysis(guest('guest-zzzzzzzzzzzzzzzz', '2.2.2.2'));
    });

    it('should give a free account 10 a day and a paid account no daily limit', async () => {
      await register();
      const free = await asIdentity('an@example.com');
      for (let i = 0; i < 10; i++) await service.reserveAnalysis(free);
      await expectCode(service.reserveAnalysis(free), 'QUOTA_EXCEEDED');

      const account = (await store.findAccountByEmail('an@example.com'))!;
      await store.setPlan(account.id, 'premium', new Date(now.getTime() + 86_400_000).toISOString());
      const premium = await asIdentity('an@example.com');
      for (let i = 0; i < 50; i++) await service.reserveAnalysis(premium);
      expect(await service.usage(premium)).toMatchObject({ used: 60, limit: null });
    });

    it('should not let two requests at once both take the last use', async () => {
      const results = await Promise.allSettled(Array.from({ length: 20 }, () => service.reserveAnalysis(guest())));
      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(5);
    });
  });

  describe('orders', () => {
    it('should price an order by plan and months and refuse anything else', async () => {
      const { account } = await register();
      expect(await service.createOrder(account, 'premium', 3)).toMatchObject({ plan: 'premium', months: 3, amount: 87_000, status: 'pending' });
      expect((await service.createOrder(account, 'family', 1)).code).toMatch(/^VNS[A-Z0-9]{6}$/);
      await expectCode(service.createOrder(account, 'free', 1), 'INVALID_PLAN');
      await expectCode(service.createOrder(account, 'premium', 2), 'INVALID_MONTHS');
      await service.createOrder(account, 'premium', 1);
      await expectCode(service.createOrder(account, 'premium', 1), 'TOO_MANY_PENDING');
    });

    it('should give the plan when an order is paid, extend the same plan, and never pay twice', async () => {
      const { account } = await register();
      const first = await service.createOrder(account, 'premium', 1);
      await service.confirmOrder(first, 'admin');
      let updated = (await store.findAccountById(account.id))!;
      expect(updated.plan).toBe('premium');
      expect(updated.plan_expires_at).toBe('2026-11-16T03:00:00.000Z');
      await expectCode(service.confirmOrder(first, 'admin'), 'ORDER_NOT_PENDING');

      const second = await service.createOrder(account, 'premium', 1);
      await service.confirmOrder(second, 'admin');
      updated = (await store.findAccountById(account.id))!;
      expect(updated.plan_expires_at).toBe('2026-12-16T03:00:00.000Z');

      // Another plan starts from now.
      const third = await service.createOrder(account, 'family', 1);
      await service.confirmOrder(third, 'admin');
      updated = (await store.findAccountById(account.id))!;
      expect(updated).toMatchObject({ plan: 'family', plan_expires_at: '2026-11-16T03:00:00.000Z' });
    });

    it('should fall back to free when the plan runs out', async () => {
      const { account } = await register();
      await service.confirmOrder(await service.createOrder(account, 'premium', 1), 'admin');
      expect((await service.entitlement((await store.findAccountById(account.id))!)).plan).toBe('premium');
      now = new Date(now.getTime() + 31 * 86_400_000);
      expect((await service.entitlement((await store.findAccountById(account.id))!)).plan).toBe('free');
    });
  });

  describe('families', () => {
    it('should share the family plan with up to 4 members while it lasts', async () => {
      const { account: owner } = await register('chu@example.com');
      for (let i = 1; i <= 5; i++) await register(`tv${i}@example.com`, `Thành viên ${i}`);

      await expectCode(service.addFamilyMember(owner, 'tv1@example.com'), 'NOT_FAMILY_OWNER');
      await service.confirmOrder(await service.createOrder(owner, 'family', 1), 'admin');
      const paidOwner = (await store.findAccountById(owner.id))!;

      for (let i = 1; i <= 4; i++) await service.addFamilyMember(paidOwner, `tv${i}@example.com`);
      await expectCode(service.addFamilyMember(paidOwner, 'tv5@example.com'), 'FAMILY_FULL');
      await expectCode(service.addFamilyMember(paidOwner, 'tv1@example.com'), 'ALREADY_MEMBER');
      await expectCode(service.addFamilyMember(paidOwner, 'khong-co@example.com'), 'MEMBER_NOT_FOUND');
      await expectCode(service.addFamilyMember(paidOwner, 'chu@example.com'), 'SELF');

      const member = (await store.findAccountByEmail('tv1@example.com'))!;
      expect(await service.entitlement(member)).toMatchObject({
        plan: 'family',
        source: 'family',
        dailyLimit: null,
        familyOwner: { email: 'chu@example.com' },
      });

      now = new Date(now.getTime() + 31 * 86_400_000);
      expect((await service.entitlement(member)).plan).toBe('free');
    });

    it('should let the owner remove a member and a member leave', async () => {
      const { account: owner } = await register('chu@example.com');
      await register('tv1@example.com');
      await register('tv2@example.com');
      await service.confirmOrder(await service.createOrder(owner, 'family', 1), 'admin');
      const paidOwner = (await store.findAccountById(owner.id))!;
      await service.addFamilyMember(paidOwner, 'tv1@example.com');
      await service.addFamilyMember(paidOwner, 'tv2@example.com');

      const tv1 = (await store.findAccountByEmail('tv1@example.com'))!;
      await service.removeFamilyMember(paidOwner, tv1.id);
      const tv2 = (await store.findAccountByEmail('tv2@example.com'))!;
      await service.leaveFamily(tv2);
      expect((await service.family(paidOwner)).members).toEqual([]);
      await expectCode(service.removeFamilyMember(paidOwner, tv1.id), 'MEMBER_NOT_FOUND');
    });
  });

  describe('business requests', () => {
    it('should keep a valid request and refuse an invalid one', async () => {
      const lead = await service.createLead({
        name: ' Trần  Bình ',
        organization: 'Trường THPT A',
        email: 'binh@truong.edu.vn',
        phone: '0901 234 567',
        service: 'ai_agent',
        message: 'Cần tư vấn',
      });
      expect(lead).toMatchObject({ name: 'Trần Bình', status: 'new', service: 'ai_agent' });
      await expectCode(service.createLead({ name: 'A', organization: 'B', email: 'x@y.vn', service: 'hack' }), 'INVALID_SERVICE');
      await expectCode(service.createLead({ name: 'A', organization: 'B', email: 'x@y.vn', phone: 'abc', service: 'erp' }), 'INVALID_PHONE');
    });
  });

  it('should sum up accounts, orders and revenue for the admin page', async () => {
    const { account } = await register('chu@example.com');
    await register('tv@example.com');
    await service.confirmOrder(await service.createOrder(account, 'family', 3), 'admin');
    await service.addFamilyMember((await store.findAccountById(account.id))!, 'tv@example.com');
    await service.createOrder(account, 'premium', 1);
    await service.reserveAnalysis(await asIdentity('tv@example.com'));

    const overview = await service.adminOverview();
    expect(overview.accountStats).toMatchObject({ totalAccounts: 2, activePaid: 1, pendingOrders: 1, revenue: 327_000 });
    const member = overview.accounts.find(a => a.email === 'tv@example.com');
    expect(member).toMatchObject({ plan: 'family', planSource: 'family', familyOwnerEmail: 'chu@example.com', usageToday: 1 });
    expect(overview.orders[0]).toMatchObject({ accountEmail: 'chu@example.com' });
  });

  it('should keep everything after a restart', async () => {
    const { account } = await register();
    await service.reserveAnalysis(guest());
    await service.createOrder(account, 'premium', 1);
    await store.close();

    const reopened = new FileAccountStore(dir);
    await reopened.init();
    expect(await reopened.findAccountByEmail('an@example.com')).not.toBeNull();
    expect(await reopened.listOrdersByAccount(account.id)).toHaveLength(1);
    expect(await reopened.getUsage('guest:guest-aaaaaaaaaaaaaaaa', '2026-10-17')).toBe(1);
  });
});
