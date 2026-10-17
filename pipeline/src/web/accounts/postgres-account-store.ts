import { randomUUID } from 'crypto';
import type { Pool } from 'pg';
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

const SCHEMA = `
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  plan text NOT NULL DEFAULT 'free',
  plan_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);
CREATE TABLE IF NOT EXISTS account_sessions (
  token_hash text PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS account_sessions_account_idx ON account_sessions (account_id);
CREATE TABLE IF NOT EXISTS usage_daily (
  subject text NOT NULL,
  day date NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (subject, day)
);
CREATE TABLE IF NOT EXISTS payment_orders (
  id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plan text NOT NULL,
  months integer NOT NULL,
  amount integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  confirmed_by text
);
CREATE INDEX IF NOT EXISTS payment_orders_account_idx ON payment_orders (account_id, created_at DESC);
CREATE TABLE IF NOT EXISTS family_members (
  owner_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  member_id uuid NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, member_id)
);
CREATE TABLE IF NOT EXISTS business_leads (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  organization text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  service text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new'
);
`;

const iso = (value: unknown): string | null =>
  value === null || value === undefined ? null : value instanceof Date ? value.toISOString() : String(value);

function toAccount(row: Record<string, unknown>): Account {
  return {
    id: String(row['id']),
    email: String(row['email']),
    name: String(row['name']),
    password_hash: String(row['password_hash']),
    plan: row['plan'] as PlanId,
    plan_expires_at: iso(row['plan_expires_at']),
    created_at: iso(row['created_at']) as string,
    last_login_at: iso(row['last_login_at']),
  };
}

function toOrder(row: Record<string, unknown>): PaymentOrder {
  return {
    id: String(row['id']),
    code: String(row['code']),
    account_id: String(row['account_id']),
    plan: row['plan'] as PaymentOrder['plan'],
    months: Number(row['months']),
    amount: Number(row['amount']),
    status: row['status'] as PaymentOrder['status'],
    created_at: iso(row['created_at']) as string,
    paid_at: iso(row['paid_at']),
    confirmed_by: (row['confirmed_by'] as string | null) ?? null,
  };
}

function toFamily(row: Record<string, unknown>): FamilyMember {
  return { owner_id: String(row['owner_id']), member_id: String(row['member_id']), created_at: iso(row['created_at']) as string };
}

function toLead(row: Record<string, unknown>): BusinessLead {
  return { ...(row as unknown as BusinessLead), created_at: iso(row['created_at']) as string };
}

/** Accounts kept in PostgreSQL, in the same database as the scans. */
export class PostgresAccountStore implements AccountStore {
  constructor(private readonly pool: Pool) {}

  async init(): Promise<void> {
    await this.pool.query(SCHEMA);
  }

  async close(): Promise<void> {
    // The pool belongs to PostgresStore, which closes it.
  }

  async createAccount(input: NewAccount): Promise<Account> {
    try {
      const result = await this.pool.query(
        `INSERT INTO accounts (id, email, name, password_hash) VALUES ($1, $2, $3, $4) RETURNING *`,
        [randomUUID(), input.email.toLowerCase(), input.name, input.password_hash]
      );
      return toAccount(result.rows[0]);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new EmailTakenError();
      throw error;
    }
  }

  async findAccountByEmail(email: string): Promise<Account | null> {
    const result = await this.pool.query('SELECT * FROM accounts WHERE email = $1', [email.toLowerCase()]);
    return result.rows[0] ? toAccount(result.rows[0]) : null;
  }

  async findAccountById(id: string): Promise<Account | null> {
    const result = await this.pool.query('SELECT * FROM accounts WHERE id = $1', [id]);
    return result.rows[0] ? toAccount(result.rows[0]) : null;
  }

  async listAccounts(limit: number): Promise<Account[]> {
    const result = await this.pool.query('SELECT * FROM accounts ORDER BY created_at DESC LIMIT $1', [limit]);
    return result.rows.map(toAccount);
  }

  async countAccounts(): Promise<number> {
    const result = await this.pool.query('SELECT count(*)::int AS n FROM accounts');
    return Number(result.rows[0]?.n ?? 0);
  }

  async setPassword(accountId: string, passwordHash: string): Promise<void> {
    await this.pool.query('UPDATE accounts SET password_hash = $2 WHERE id = $1', [accountId, passwordHash]);
  }

  async setPlan(accountId: string, plan: PlanId, expiresAt: string | null): Promise<void> {
    await this.pool.query('UPDATE accounts SET plan = $2, plan_expires_at = $3 WHERE id = $1', [accountId, plan, expiresAt]);
  }

  async touchLogin(accountId: string): Promise<void> {
    await this.pool.query('UPDATE accounts SET last_login_at = now() WHERE id = $1', [accountId]);
  }

  async createSession(tokenHash: string, accountId: string, expiresAt: string): Promise<void> {
    await this.pool.query('DELETE FROM account_sessions WHERE expires_at <= now()');
    await this.pool.query('INSERT INTO account_sessions (token_hash, account_id, expires_at) VALUES ($1, $2, $3)', [
      tokenHash,
      accountId,
      expiresAt,
    ]);
  }

  async findSessionAccount(tokenHash: string): Promise<Account | null> {
    const result = await this.pool.query(
      `SELECT a.* FROM account_sessions s JOIN accounts a ON a.id = s.account_id
       WHERE s.token_hash = $1 AND s.expires_at > now()`,
      [tokenHash]
    );
    return result.rows[0] ? toAccount(result.rows[0]) : null;
  }

  async deleteSession(tokenHash: string): Promise<void> {
    await this.pool.query('DELETE FROM account_sessions WHERE token_hash = $1', [tokenHash]);
  }

  async deleteAccountSessions(accountId: string, exceptTokenHash?: string): Promise<void> {
    await this.pool.query('DELETE FROM account_sessions WHERE account_id = $1 AND token_hash <> $2', [
      accountId,
      exceptTokenHash ?? '',
    ]);
  }

  async reserveUsage(subject: string, day: string, limit: number | null): Promise<number | null> {
    // One statement, so the check and the increment cannot be split by another request.
    const result = await this.pool.query(
      `INSERT INTO usage_daily (subject, day, count) VALUES ($1, $2, 1)
       ON CONFLICT (subject, day) DO UPDATE SET count = usage_daily.count + 1
       WHERE $3::int IS NULL OR usage_daily.count < $3::int
       RETURNING count`,
      [subject, day, limit]
    );
    return result.rows[0] ? Number(result.rows[0].count) : null;
  }

  async releaseUsage(subject: string, day: string): Promise<void> {
    await this.pool.query('UPDATE usage_daily SET count = GREATEST(count - 1, 0) WHERE subject = $1 AND day = $2', [
      subject,
      day,
    ]);
  }

  async getUsage(subject: string, day: string): Promise<number> {
    const result = await this.pool.query('SELECT count FROM usage_daily WHERE subject = $1 AND day = $2', [subject, day]);
    return Number(result.rows[0]?.count ?? 0);
  }

  async getUsageMany(subjects: string[], day: string): Promise<Record<string, number>> {
    const counts: Record<string, number> = Object.fromEntries(subjects.map(s => [s, 0]));
    if (subjects.length === 0) return counts;
    const result = await this.pool.query('SELECT subject, count FROM usage_daily WHERE day = $1 AND subject = ANY($2)', [
      day,
      subjects,
    ]);
    for (const row of result.rows) counts[String(row.subject)] = Number(row.count);
    return counts;
  }

  async createOrder(input: NewOrder): Promise<PaymentOrder> {
    const result = await this.pool.query(
      `INSERT INTO payment_orders (id, code, account_id, plan, months, amount) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [randomUUID(), input.code, input.account_id, input.plan, input.months, input.amount]
    );
    return toOrder(result.rows[0]);
  }

  async findOrderByCode(code: string): Promise<PaymentOrder | null> {
    const result = await this.pool.query('SELECT * FROM payment_orders WHERE code = $1', [code.toUpperCase()]);
    return result.rows[0] ? toOrder(result.rows[0]) : null;
  }

  async listOrdersByAccount(accountId: string): Promise<PaymentOrder[]> {
    const result = await this.pool.query('SELECT * FROM payment_orders WHERE account_id = $1 ORDER BY created_at DESC', [
      accountId,
    ]);
    return result.rows.map(toOrder);
  }

  async listOrders(limit: number): Promise<PaymentOrder[]> {
    const result = await this.pool.query('SELECT * FROM payment_orders ORDER BY created_at DESC LIMIT $1', [limit]);
    return result.rows.map(toOrder);
  }

  async settleOrder(id: string, status: 'paid' | 'cancelled', confirmedBy: string | null): Promise<PaymentOrder | null> {
    const result = await this.pool.query(
      `UPDATE payment_orders
       SET status = $2,
           paid_at = CASE WHEN $2 = 'paid' THEN now() ELSE paid_at END,
           confirmed_by = CASE WHEN $2 = 'paid' THEN $3 ELSE confirmed_by END
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id, status, confirmedBy]
    );
    return result.rows[0] ? toOrder(result.rows[0]) : null;
  }

  async addFamilyMember(ownerId: string, memberId: string): Promise<void> {
    await this.pool.query(
      'INSERT INTO family_members (owner_id, member_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [ownerId, memberId]
    );
  }

  async removeFamilyMember(ownerId: string, memberId: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM family_members WHERE owner_id = $1 AND member_id = $2', [
      ownerId,
      memberId,
    ]);
    return (result.rowCount ?? 0) > 0;
  }

  async listFamilyMembers(ownerId: string): Promise<FamilyMember[]> {
    const result = await this.pool.query('SELECT * FROM family_members WHERE owner_id = $1 ORDER BY created_at', [ownerId]);
    return result.rows.map(toFamily);
  }

  async findFamilyOfMember(memberId: string): Promise<FamilyMember | null> {
    const result = await this.pool.query('SELECT * FROM family_members WHERE member_id = $1', [memberId]);
    return result.rows[0] ? toFamily(result.rows[0]) : null;
  }

  async listAllFamilyMembers(): Promise<FamilyMember[]> {
    const result = await this.pool.query('SELECT * FROM family_members');
    return result.rows.map(toFamily);
  }

  async createLead(input: NewLead): Promise<BusinessLead> {
    const result = await this.pool.query(
      `INSERT INTO business_leads (id, name, organization, email, phone, service, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [randomUUID(), input.name, input.organization, input.email, input.phone, input.service, input.message]
    );
    return toLead(result.rows[0]);
  }

  async listLeads(limit: number): Promise<BusinessLead[]> {
    const result = await this.pool.query('SELECT * FROM business_leads ORDER BY created_at DESC LIMIT $1', [limit]);
    return result.rows.map(toLead);
  }

  async setLeadStatus(id: string, status: LeadStatus): Promise<boolean> {
    const result = await this.pool.query('UPDATE business_leads SET status = $2 WHERE id = $1', [id, status]);
    return (result.rowCount ?? 0) > 0;
  }
}
