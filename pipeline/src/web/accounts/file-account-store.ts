import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  Account,
  AccountStore,
  BusinessLead,
  EmailTakenError,
  FamilyMember,
  LeadStatus,
  NewAccount,
  NewLead,
  NewOrder,
  PaymentOrder,
} from './account-store';
import { PlanId } from './plans';

interface Session {
  token_hash: string;
  account_id: string;
  created_at: string;
  expires_at: string;
}

interface Data {
  accounts: Account[];
  sessions: Session[];
  /** "subject|day" -> count */
  usage: Record<string, number>;
  orders: PaymentOrder[];
  family: FamilyMember[];
  leads: BusinessLead[];
}

const EMPTY: Data = { accounts: [], sessions: [], usage: {}, orders: [], family: [], leads: [] };
/** Daily counters older than this are dropped. */
const USAGE_KEEP_DAYS = 7;

const newest = <T extends { created_at: string }>(rows: T[]) =>
  [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));

/**
 * Accounts kept in one JSON file next to the other data files. Fine for a
 * demo or a small site; with DATABASE_URL set, PostgresAccountStore is used.
 * Every change rewrites the file through a temporary file, one change at a
 * time, so a crash never leaves half a file.
 */
export class FileAccountStore implements AccountStore {
  private data: Data = structuredClone(EMPTY);
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly dir: string) {}

  private get file(): string {
    return path.join(this.dir, 'accounts.json');
  }

  async init(): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    try {
      const parsed = JSON.parse(await fs.readFile(this.file, 'utf8')) as Partial<Data>;
      this.data = { ...structuredClone(EMPTY), ...parsed };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  async close(): Promise<void> {
    await this.queue;
  }

  /** Run a change and save, one at a time. */
  private write<T>(change: (data: Data) => T): Promise<T> {
    const run = this.queue.then(async () => {
      const result = change(this.data);
      const tmp = `${this.file}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(this.data));
      await fs.rename(tmp, this.file);
      return result;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  // ─── accounts ──────────────────────────────────────────────────────────
  createAccount(input: NewAccount): Promise<Account> {
    const email = input.email.toLowerCase();
    return this.write(data => {
      if (data.accounts.some(a => a.email === email)) throw new EmailTakenError();
      const account: Account = {
        id: randomUUID(),
        email,
        name: input.name,
        password_hash: input.password_hash,
        plan: 'free',
        plan_expires_at: null,
        created_at: new Date().toISOString(),
        last_login_at: null,
      };
      data.accounts.push(account);
      return { ...account };
    });
  }

  async findAccountByEmail(email: string): Promise<Account | null> {
    const found = this.data.accounts.find(a => a.email === email.toLowerCase());
    return found ? { ...found } : null;
  }

  async findAccountById(id: string): Promise<Account | null> {
    const found = this.data.accounts.find(a => a.id === id);
    return found ? { ...found } : null;
  }

  async listAccounts(limit: number): Promise<Account[]> {
    return newest(this.data.accounts).slice(0, limit).map(a => ({ ...a }));
  }

  async countAccounts(): Promise<number> {
    return this.data.accounts.length;
  }

  private updateAccount(id: string, change: (account: Account) => void): Promise<void> {
    return this.write(data => {
      const account = data.accounts.find(a => a.id === id);
      if (account) change(account);
    });
  }

  setPassword(accountId: string, passwordHash: string): Promise<void> {
    return this.updateAccount(accountId, a => {
      a.password_hash = passwordHash;
    });
  }

  setPlan(accountId: string, plan: PlanId, expiresAt: string | null): Promise<void> {
    return this.updateAccount(accountId, a => {
      a.plan = plan;
      a.plan_expires_at = expiresAt;
    });
  }

  touchLogin(accountId: string): Promise<void> {
    return this.updateAccount(accountId, a => {
      a.last_login_at = new Date().toISOString();
    });
  }

  // ─── sessions ──────────────────────────────────────────────────────────
  createSession(tokenHash: string, accountId: string, expiresAt: string): Promise<void> {
    return this.write(data => {
      const now = new Date().toISOString();
      data.sessions = data.sessions.filter(s => s.expires_at > now);
      data.sessions.push({ token_hash: tokenHash, account_id: accountId, created_at: now, expires_at: expiresAt });
    });
  }

  async findSessionAccount(tokenHash: string): Promise<Account | null> {
    const session = this.data.sessions.find(s => s.token_hash === tokenHash);
    if (!session || session.expires_at <= new Date().toISOString()) return null;
    return this.findAccountById(session.account_id);
  }

  deleteSession(tokenHash: string): Promise<void> {
    return this.write(data => {
      data.sessions = data.sessions.filter(s => s.token_hash !== tokenHash);
    });
  }

  deleteAccountSessions(accountId: string, exceptTokenHash?: string): Promise<void> {
    return this.write(data => {
      data.sessions = data.sessions.filter(s => s.account_id !== accountId || s.token_hash === exceptTokenHash);
    });
  }

  // ─── daily usage ───────────────────────────────────────────────────────
  reserveUsage(subject: string, day: string, limit: number | null): Promise<number | null> {
    return this.write(data => {
      const key = `${subject}|${day}`;
      const current = data.usage[key] ?? 0;
      if (limit !== null && current >= limit) return null;
      data.usage[key] = current + 1;

      // Keep the file small: forget counters of past days.
      const oldest = new Date(Date.parse(`${day}T00:00:00Z`) - USAGE_KEEP_DAYS * 86_400_000).toISOString().slice(0, 10);
      for (const existing of Object.keys(data.usage)) {
        if ((existing.split('|').pop() ?? '') < oldest) delete data.usage[existing];
      }
      return current + 1;
    });
  }

  releaseUsage(subject: string, day: string): Promise<void> {
    return this.write(data => {
      const key = `${subject}|${day}`;
      if ((data.usage[key] ?? 0) > 0) data.usage[key] = (data.usage[key] ?? 0) - 1;
    });
  }

  async getUsage(subject: string, day: string): Promise<number> {
    return this.data.usage[`${subject}|${day}`] ?? 0;
  }

  async getUsageMany(subjects: string[], day: string): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    for (const subject of subjects) result[subject] = this.data.usage[`${subject}|${day}`] ?? 0;
    return result;
  }

  // ─── orders ────────────────────────────────────────────────────────────
  createOrder(input: NewOrder): Promise<PaymentOrder> {
    return this.write(data => {
      const order: PaymentOrder = {
        id: randomUUID(),
        ...input,
        status: 'pending',
        created_at: new Date().toISOString(),
        paid_at: null,
        confirmed_by: null,
      };
      data.orders.push(order);
      return { ...order };
    });
  }

  async findOrderByCode(code: string): Promise<PaymentOrder | null> {
    const found = this.data.orders.find(o => o.code === code.toUpperCase());
    return found ? { ...found } : null;
  }

  async listOrdersByAccount(accountId: string): Promise<PaymentOrder[]> {
    return newest(this.data.orders.filter(o => o.account_id === accountId)).map(o => ({ ...o }));
  }

  async listOrders(limit: number): Promise<PaymentOrder[]> {
    return newest(this.data.orders).slice(0, limit).map(o => ({ ...o }));
  }

  settleOrder(id: string, status: 'paid' | 'cancelled', confirmedBy: string | null): Promise<PaymentOrder | null> {
    return this.write(data => {
      const order = data.orders.find(o => o.id === id);
      if (!order || order.status !== 'pending') return null;
      order.status = status;
      if (status === 'paid') {
        order.paid_at = new Date().toISOString();
        order.confirmed_by = confirmedBy;
      }
      return { ...order };
    });
  }

  // ─── families ──────────────────────────────────────────────────────────
  addFamilyMember(ownerId: string, memberId: string): Promise<void> {
    return this.write(data => {
      if (data.family.some(f => f.member_id === memberId)) return;
      data.family.push({ owner_id: ownerId, member_id: memberId, created_at: new Date().toISOString() });
    });
  }

  removeFamilyMember(ownerId: string, memberId: string): Promise<boolean> {
    return this.write(data => {
      const before = data.family.length;
      data.family = data.family.filter(f => !(f.owner_id === ownerId && f.member_id === memberId));
      return data.family.length < before;
    });
  }

  async listFamilyMembers(ownerId: string): Promise<FamilyMember[]> {
    return this.data.family.filter(f => f.owner_id === ownerId).map(f => ({ ...f }));
  }

  async findFamilyOfMember(memberId: string): Promise<FamilyMember | null> {
    const found = this.data.family.find(f => f.member_id === memberId);
    return found ? { ...found } : null;
  }

  async listAllFamilyMembers(): Promise<FamilyMember[]> {
    return this.data.family.map(f => ({ ...f }));
  }

  // ─── business requests ─────────────────────────────────────────────────
  createLead(input: NewLead): Promise<BusinessLead> {
    return this.write(data => {
      const lead: BusinessLead = { id: randomUUID(), created_at: new Date().toISOString(), status: 'new', ...input };
      data.leads.push(lead);
      return { ...lead };
    });
  }

  async listLeads(limit: number): Promise<BusinessLead[]> {
    return newest(this.data.leads).slice(0, limit).map(l => ({ ...l }));
  }

  setLeadStatus(id: string, status: LeadStatus): Promise<boolean> {
    return this.write(data => {
      const lead = data.leads.find(l => l.id === id);
      if (!lead) return false;
      lead.status = status;
      return true;
    });
  }
}
