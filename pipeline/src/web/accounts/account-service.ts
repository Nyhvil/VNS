import { createHash, randomBytes } from 'crypto';
import { Account, AccountStore, BusinessLead, EmailTakenError, NewLead, PaymentOrder } from './account-store';
import { checkPasswordPolicy, getDummyHash, hashPassword, verifyPassword } from './password';
import {
  ALLOWED_MONTHS,
  DAYS_PER_MONTH,
  GUEST_DAILY_LIMIT,
  PaidPlanId,
  PlanId,
  PLANS,
  nextVnMidnight,
  vnDayKey,
} from './plans';

/** Who is asking: a signed-in account, or a visitor without one. */
export type Identity =
  | { kind: 'account'; account: Account; tokenHash: string }
  | { kind: 'guest'; guestId: string; ip: string };

/** What an account may use right now. */
export interface Entitlement {
  plan: PlanId;
  /** "own": bought by the account. "family": shared by a family owner. */
  source: 'own' | 'family' | 'none';
  expiresAt: string | null;
  dailyLimit: number | null;
  familyOwner?: { id: string; email: string; name: string };
}

export interface UsageInfo {
  used: number;
  limit: number | null;
  resetsAt: string;
}

export interface PublicAccount {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  entitlement: Entitlement;
  ownPlan: { plan: PlanId; expiresAt: string | null };
}

export interface PublicOrder {
  code: string;
  plan: PaidPlanId;
  planName: string;
  months: number;
  amount: number;
  status: PaymentOrder['status'];
  createdAt: string;
  paidAt: string | null;
}

export class AccountError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string
  ) {
    super(message);
    this.name = 'AccountError';
  }
}

export interface AccountServiceOptions {
  sessionDays?: number;
  /** Analyses per day for all visitors without an account behind one address together. */
  guestDailyLimitPerIp?: number;
  maxPendingOrders?: number;
  now?: () => Date;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ORDER_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ORDER_CODE_PATTERN = /^VNS[A-Z0-9]{6}$/;

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : null;
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

function makeOrderCode(): string {
  const bytes = randomBytes(6);
  let code = 'VNS';
  for (const byte of bytes) code += ORDER_CODE_ALPHABET[byte % ORDER_CODE_ALPHABET.length];
  return code;
}

export function isOrderCode(value: string): boolean {
  return ORDER_CODE_PATTERN.test(value);
}

export class AccountService {
  readonly sessionDays: number;
  private readonly guestDailyLimitPerIp: number;
  private readonly maxPendingOrders: number;
  private readonly now: () => Date;

  constructor(
    readonly store: AccountStore,
    options: AccountServiceOptions = {}
  ) {
    this.sessionDays = options.sessionDays ?? 30;
    this.guestDailyLimitPerIp = options.guestDailyLimitPerIp ?? 20;
    this.maxPendingOrders = options.maxPendingOrders ?? 3;
    this.now = options.now ?? (() => new Date());
  }

  // ─── sign up, sign in ──────────────────────────────────────────────────

  private async startSession(account: Account): Promise<{ token: string; tokenHash: string }> {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = hashToken(token);
    const expires = new Date(this.now().getTime() + this.sessionDays * 86_400_000).toISOString();
    await this.store.createSession(tokenHash, account.id, expires);
    await this.store.touchLogin(account.id);
    return { token, tokenHash };
  }

  async register(input: { email: unknown; name: unknown; password: unknown }): Promise<{ account: Account; token: string }> {
    const email = normalizeEmail(input.email);
    if (!email) throw new AccountError('Email không hợp lệ.', 400, 'INVALID_EMAIL');
    const name = cleanText(input.name, 80);
    if (!name) throw new AccountError('Vui lòng nhập họ tên.', 400, 'INVALID_NAME');
    const passwordProblem = checkPasswordPolicy(input.password);
    if (passwordProblem) throw new AccountError(passwordProblem, 400, 'WEAK_PASSWORD');

    let account: Account;
    try {
      account = await this.store.createAccount({ email, name, password_hash: await hashPassword(input.password as string) });
    } catch (error) {
      if (error instanceof EmailTakenError) {
        throw new AccountError('Email này đã được đăng ký. Hãy đăng nhập.', 409, 'EMAIL_TAKEN');
      }
      throw error;
    }
    const { token } = await this.startSession(account);
    return { account, token };
  }

  /** Null when the email or the password is wrong (the caller cannot tell which). */
  async login(input: { email: unknown; password: unknown }): Promise<{ account: Account; token: string } | null> {
    const email = normalizeEmail(input.email);
    const password = typeof input.password === 'string' ? input.password : '';
    const account = email ? await this.store.findAccountByEmail(email) : null;

    // Check a password even when there is no account, so both cases take as long.
    const valid = await verifyPassword(password, account?.password_hash ?? (await getDummyHash()));
    if (!account || !valid) return null;

    const { token } = await this.startSession(account);
    return { account, token };
  }

  async accountForToken(token: string | undefined): Promise<{ account: Account; tokenHash: string } | null> {
    if (!token || token.length > 100) return null;
    const tokenHash = hashToken(token);
    const account = await this.store.findSessionAccount(tokenHash);
    return account ? { account, tokenHash } : null;
  }

  async logout(tokenHash: string): Promise<void> {
    await this.store.deleteSession(tokenHash);
  }

  async changePassword(account: Account, tokenHash: string, current: unknown, next: unknown): Promise<void> {
    if (typeof current !== 'string' || !(await verifyPassword(current, account.password_hash))) {
      throw new AccountError('Mật khẩu hiện tại không đúng.', 400, 'WRONG_PASSWORD');
    }
    const problem = checkPasswordPolicy(next);
    if (problem) throw new AccountError(problem, 400, 'WEAK_PASSWORD');
    await this.store.setPassword(account.id, await hashPassword(next as string));
    // Other devices must sign in again with the new password.
    await this.store.deleteAccountSessions(account.id, tokenHash);
  }

  // ─── plans and daily limits ────────────────────────────────────────────

  private isActive(account: Account): boolean {
    if (account.plan === 'free') return false;
    return account.plan_expires_at === null || Date.parse(account.plan_expires_at) > this.now().getTime();
  }

  async entitlement(account: Account): Promise<Entitlement> {
    if (this.isActive(account)) {
      return {
        plan: account.plan,
        source: 'own',
        expiresAt: account.plan_expires_at,
        dailyLimit: PLANS[account.plan].dailyLimit,
      };
    }

    const family = await this.store.findFamilyOfMember(account.id);
    if (family) {
      const owner = await this.store.findAccountById(family.owner_id);
      if (owner && owner.plan === 'family' && this.isActive(owner)) {
        return {
          plan: 'family',
          source: 'family',
          expiresAt: owner.plan_expires_at,
          dailyLimit: PLANS.family.dailyLimit,
          familyOwner: { id: owner.id, email: owner.email, name: owner.name },
        };
      }
    }

    return { plan: 'free', source: 'none', expiresAt: null, dailyLimit: PLANS.free.dailyLimit };
  }

  async publicAccount(account: Account): Promise<PublicAccount> {
    return {
      id: account.id,
      email: account.email,
      name: account.name,
      createdAt: account.created_at,
      entitlement: await this.entitlement(account),
      ownPlan: { plan: account.plan, expiresAt: account.plan_expires_at },
    };
  }

  private resetsAt(): string {
    return nextVnMidnight(this.now()).toISOString();
  }

  async usage(identity: Identity): Promise<UsageInfo> {
    const day = vnDayKey(this.now());
    if (identity.kind === 'guest') {
      return {
        used: await this.store.getUsage(`guest:${identity.guestId}`, day),
        limit: GUEST_DAILY_LIMIT,
        resetsAt: this.resetsAt(),
      };
    }
    const { dailyLimit } = await this.entitlement(identity.account);
    return {
      used: await this.store.getUsage(`account:${identity.account.id}`, day),
      limit: dailyLimit,
      resetsAt: this.resetsAt(),
    };
  }

  /**
   * Take one analysis from today's allowance. Returns a function that gives
   * it back (call it when the analysis did not happen), or throws an
   * AccountError with code QUOTA_EXCEEDED.
   */
  async reserveAnalysis(identity: Identity): Promise<() => Promise<void>> {
    const day = vnDayKey(this.now());

    if (identity.kind === 'account') {
      const subject = `account:${identity.account.id}`;
      const { dailyLimit, plan } = await this.entitlement(identity.account);
      const count = await this.store.reserveUsage(subject, day, dailyLimit);
      if (count === null) {
        throw new AccountError(
          `Bạn đã dùng hết ${dailyLimit} lượt kiểm tra hôm nay của gói ${PLANS[plan].name}. Lượt mới có từ 0 giờ, hoặc nâng cấp gói để kiểm tra không giới hạn.`,
          429,
          'QUOTA_EXCEEDED'
        );
      }
      return () => this.store.releaseUsage(subject, day);
    }

    const guestSubject = `guest:${identity.guestId}`;
    const ipSubject = `guest-ip:${identity.ip}`;
    const quotaError = new AccountError(
      `Khách chưa đăng nhập được ${GUEST_DAILY_LIMIT} lượt kiểm tra mỗi ngày và bạn đã dùng hết. Đăng ký miễn phí để có ${PLANS.free.dailyLimit} lượt mỗi ngày.`,
      429,
      'QUOTA_EXCEEDED'
    );

    if ((await this.store.reserveUsage(guestSubject, day, GUEST_DAILY_LIMIT)) === null) throw quotaError;
    // A second cap per address, so clearing cookies does not give unlimited uses.
    if ((await this.store.reserveUsage(ipSubject, day, this.guestDailyLimitPerIp)) === null) {
      await this.store.releaseUsage(guestSubject, day);
      throw quotaError;
    }
    return async () => {
      await this.store.releaseUsage(guestSubject, day);
      await this.store.releaseUsage(ipSubject, day);
    };
  }

  // ─── orders ────────────────────────────────────────────────────────────

  toPublicOrder(order: PaymentOrder): PublicOrder {
    return {
      code: order.code,
      plan: order.plan,
      planName: PLANS[order.plan].name,
      months: order.months,
      amount: order.amount,
      status: order.status,
      createdAt: order.created_at,
      paidAt: order.paid_at,
    };
  }

  async createOrder(account: Account, plan: unknown, months: unknown): Promise<PaymentOrder> {
    if (plan !== 'premium' && plan !== 'family') throw new AccountError('Gói không hợp lệ.', 400, 'INVALID_PLAN');
    const monthCount = Number(months);
    if (!ALLOWED_MONTHS.includes(monthCount)) throw new AccountError('Thời hạn không hợp lệ.', 400, 'INVALID_MONTHS');

    const pending = (await this.store.listOrdersByAccount(account.id)).filter(o => o.status === 'pending');
    if (pending.length >= this.maxPendingOrders) {
      throw new AccountError(
        'Bạn đang có quá nhiều đơn chờ thanh toán. Hãy huỷ bớt đơn cũ trong trang tài khoản.',
        409,
        'TOO_MANY_PENDING'
      );
    }

    let code = makeOrderCode();
    while (await this.store.findOrderByCode(code)) code = makeOrderCode();

    return this.store.createOrder({
      code,
      account_id: account.id,
      plan,
      months: monthCount,
      amount: PLANS[plan].pricePerMonth * monthCount,
    });
  }

  /**
   * Mark a pending order paid and give the buyer the plan. Buying the plan
   * already running adds to its end; buying another plan replaces it from now.
   */
  async confirmOrder(order: PaymentOrder, confirmedBy: string): Promise<PaymentOrder> {
    const settled = await this.store.settleOrder(order.id, 'paid', confirmedBy);
    if (!settled) throw new AccountError('Đơn này không còn ở trạng thái chờ thanh toán.', 409, 'ORDER_NOT_PENDING');

    const account = await this.store.findAccountById(settled.account_id);
    if (account) {
      const now = this.now().getTime();
      const sameRunning = account.plan === settled.plan && this.isActive(account) && account.plan_expires_at !== null;
      const start = sameRunning ? Date.parse(account.plan_expires_at as string) : now;
      const expires = new Date(start + settled.months * DAYS_PER_MONTH * 86_400_000).toISOString();
      await this.store.setPlan(account.id, settled.plan, expires);
    }
    return settled;
  }

  async cancelOrder(order: PaymentOrder): Promise<PaymentOrder> {
    const settled = await this.store.settleOrder(order.id, 'cancelled', null);
    if (!settled) throw new AccountError('Đơn này không còn ở trạng thái chờ thanh toán.', 409, 'ORDER_NOT_PENDING');
    return settled;
  }

  // ─── families ──────────────────────────────────────────────────────────

  async family(owner: Account): Promise<{ maxMembers: number; members: { id: string; email: string; name: string }[] }> {
    const rows = await this.store.listFamilyMembers(owner.id);
    const members = [];
    for (const row of rows) {
      const member = await this.store.findAccountById(row.member_id);
      if (member) members.push({ id: member.id, email: member.email, name: member.name });
    }
    return { maxMembers: PLANS.family.extraMembers, members };
  }

  async addFamilyMember(owner: Account, emailInput: unknown): Promise<void> {
    if (!(owner.plan === 'family' && this.isActive(owner))) {
      throw new AccountError('Cần có gói Gia đình đang hoạt động để thêm thành viên.', 403, 'NOT_FAMILY_OWNER');
    }
    const email = normalizeEmail(emailInput);
    if (!email) throw new AccountError('Email không hợp lệ.', 400, 'INVALID_EMAIL');

    const member = await this.store.findAccountByEmail(email);
    if (!member) {
      throw new AccountError('Chưa có tài khoản nào dùng email này. Người đó cần đăng ký trước.', 404, 'MEMBER_NOT_FOUND');
    }
    if (member.id === owner.id) throw new AccountError('Bạn đã là chủ gói.', 400, 'SELF');

    const existing = await this.store.findFamilyOfMember(member.id);
    if (existing) {
      throw new AccountError(
        existing.owner_id === owner.id ? 'Người này đã ở trong gói của bạn.' : 'Người này đang ở trong một gói Gia đình khác.',
        409,
        'ALREADY_MEMBER'
      );
    }
    if ((await this.store.listFamilyMembers(owner.id)).length >= PLANS.family.extraMembers) {
      throw new AccountError(`Gói Gia đình có tối đa ${PLANS.family.extraMembers} thành viên.`, 409, 'FAMILY_FULL');
    }
    await this.store.addFamilyMember(owner.id, member.id);
  }

  async removeFamilyMember(owner: Account, memberId: unknown): Promise<void> {
    if (typeof memberId !== 'string' || !(await this.store.removeFamilyMember(owner.id, memberId))) {
      throw new AccountError('Không tìm thấy thành viên này.', 404, 'MEMBER_NOT_FOUND');
    }
  }

  /** A member leaves the family they were added to. */
  async leaveFamily(member: Account): Promise<void> {
    const family = await this.store.findFamilyOfMember(member.id);
    if (!family) throw new AccountError('Bạn không ở trong gói Gia đình nào.', 404, 'NOT_MEMBER');
    await this.store.removeFamilyMember(family.owner_id, member.id);
  }

  // ─── business requests ─────────────────────────────────────────────────

  async createLead(input: Record<string, unknown>): Promise<BusinessLead> {
    const name = cleanText(input['name'], 120);
    const organization = cleanText(input['organization'], 160);
    const email = normalizeEmail(input['email']);
    const phone = cleanText(input['phone'], 30);
    const message = typeof input['message'] === 'string' ? input['message'].trim().slice(0, 2000) : '';
    const service = input['service'];

    if (!name) throw new AccountError('Vui lòng nhập họ tên.', 400, 'INVALID_NAME');
    if (!organization) throw new AccountError('Vui lòng nhập tên đơn vị.', 400, 'INVALID_ORGANIZATION');
    if (!email) throw new AccountError('Email không hợp lệ.', 400, 'INVALID_EMAIL');
    if (phone && !/^[0-9+().\s-]{8,30}$/.test(phone)) {
      throw new AccountError('Số điện thoại không hợp lệ.', 400, 'INVALID_PHONE');
    }
    if (service !== 'ai_agent' && service !== 'website' && service !== 'erp' && service !== 'other') {
      throw new AccountError('Vui lòng chọn dịch vụ.', 400, 'INVALID_SERVICE');
    }

    const lead: NewLead = { name, organization, email, phone, service, message };
    return this.store.createLead(lead);
  }

  // ─── admin ─────────────────────────────────────────────────────────────

  async adminOverview() {
    const day = vnDayKey(this.now());
    const [accounts, orders, leads, families, totalAccounts] = await Promise.all([
      this.store.listAccounts(500),
      this.store.listOrders(500),
      this.store.listLeads(500),
      this.store.listAllFamilyMembers(),
      this.store.countAccounts(),
    ]);

    const usage = await this.store.getUsageMany(
      accounts.map(a => `account:${a.id}`),
      day
    );
    const byId = new Map(accounts.map(a => [a.id, a]));
    const ownerOf = new Map(families.map(f => [f.member_id, f.owner_id]));

    const accountRows = accounts.map(a => {
      const ownActive = this.isActive(a);
      const ownerId = ownerOf.get(a.id);
      const owner = ownerId ? byId.get(ownerId) : undefined;
      const viaFamily = !ownActive && !!owner && owner.plan === 'family' && this.isActive(owner);
      const plan: PlanId = ownActive ? a.plan : viaFamily ? 'family' : 'free';
      return {
        id: a.id,
        email: a.email,
        name: a.name,
        createdAt: a.created_at,
        lastLoginAt: a.last_login_at,
        plan,
        planSource: ownActive ? 'own' : viaFamily ? 'family' : 'none',
        planExpiresAt: ownActive ? a.plan_expires_at : viaFamily ? owner?.plan_expires_at ?? null : null,
        familyOwnerEmail: viaFamily ? owner?.email ?? null : null,
        usageToday: usage[`account:${a.id}`] ?? 0,
        dailyLimit: PLANS[plan].dailyLimit,
      };
    });

    const paid = orders.filter(o => o.status === 'paid');
    return {
      accountStats: {
        totalAccounts,
        activePaid: accounts.filter(a => this.isActive(a)).length,
        pendingOrders: orders.filter(o => o.status === 'pending').length,
        revenue: paid.reduce((sum, o) => sum + o.amount, 0),
        newLeads: leads.filter(l => l.status === 'new').length,
      },
      accounts: accountRows,
      orders: orders.map(o => ({
        id: o.id,
        code: o.code,
        accountEmail: byId.get(o.account_id)?.email ?? null,
        plan: o.plan,
        months: o.months,
        amount: o.amount,
        status: o.status,
        createdAt: o.created_at,
        paidAt: o.paid_at,
        confirmedBy: o.confirmed_by,
      })),
      leads,
    };
  }
}
