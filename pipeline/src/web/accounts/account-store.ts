import { BusinessServiceId, PaidPlanId, PlanId } from './plans';

/** Storage of accounts, sessions, daily counters, orders, families and business requests. */

export interface Account {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  /** The plan bought by this account; what the account can use also depends on families. */
  plan: PlanId;
  plan_expires_at: string | null;
  created_at: string;
  last_login_at: string | null;
}

export type NewAccount = Pick<Account, 'email' | 'name' | 'password_hash'>;

export type OrderStatus = 'pending' | 'paid' | 'cancelled';

export interface PaymentOrder {
  id: string;
  /** Short code the buyer writes in the bank transfer, e.g. VNS7K2QXM. */
  code: string;
  account_id: string;
  plan: PaidPlanId;
  months: number;
  /** VND. */
  amount: number;
  status: OrderStatus;
  created_at: string;
  paid_at: string | null;
  /** "admin" or "demo": who marked the order paid. */
  confirmed_by: string | null;
}

export type NewOrder = Pick<PaymentOrder, 'code' | 'account_id' | 'plan' | 'months' | 'amount'>;

export interface FamilyMember {
  owner_id: string;
  member_id: string;
  created_at: string;
}

export type LeadStatus = 'new' | 'contacted' | 'closed';

export interface BusinessLead {
  id: string;
  created_at: string;
  name: string;
  organization: string;
  email: string;
  phone: string;
  service: BusinessServiceId;
  message: string;
  status: LeadStatus;
}

export type NewLead = Omit<BusinessLead, 'id' | 'created_at' | 'status'>;

export class EmailTakenError extends Error {
  constructor() {
    super('Email already registered');
    this.name = 'EmailTakenError';
  }
}

export interface AccountStore {
  init(): Promise<void>;
  close(): Promise<void>;

  /** Throws EmailTakenError when the email is already used. Emails are stored lowercase. */
  createAccount(account: NewAccount): Promise<Account>;
  findAccountByEmail(email: string): Promise<Account | null>;
  findAccountById(id: string): Promise<Account | null>;
  listAccounts(limit: number): Promise<Account[]>;
  countAccounts(): Promise<number>;
  setPassword(accountId: string, passwordHash: string): Promise<void>;
  setPlan(accountId: string, plan: PlanId, expiresAt: string | null): Promise<void>;
  touchLogin(accountId: string): Promise<void>;

  createSession(tokenHash: string, accountId: string, expiresAt: string): Promise<void>;
  /** The account of a session that has not expired. */
  findSessionAccount(tokenHash: string): Promise<Account | null>;
  deleteSession(tokenHash: string): Promise<void>;
  /** Sign the account out everywhere, except the session given. */
  deleteAccountSessions(accountId: string, exceptTokenHash?: string): Promise<void>;

  /**
   * Count one use for `subject` on `day`, only if that keeps the count within
   * `limit` (null = no limit). Returns the new count, or null when the limit
   * was already reached. Must be atomic: two requests at once cannot both
   * take the last use.
   */
  reserveUsage(subject: string, day: string, limit: number | null): Promise<number | null>;
  /** Give back a use taken by reserveUsage (the analysis did not happen). */
  releaseUsage(subject: string, day: string): Promise<void>;
  getUsage(subject: string, day: string): Promise<number>;
  /** Counts of many subjects on one day, for the admin page. */
  getUsageMany(subjects: string[], day: string): Promise<Record<string, number>>;

  createOrder(order: NewOrder): Promise<PaymentOrder>;
  findOrderByCode(code: string): Promise<PaymentOrder | null>;
  listOrdersByAccount(accountId: string): Promise<PaymentOrder[]>;
  listOrders(limit: number): Promise<PaymentOrder[]>;
  /**
   * Move a pending order to `status`. Returns the updated order, or null when
   * the order is not pending any more (so it is never paid twice).
   */
  settleOrder(id: string, status: 'paid' | 'cancelled', confirmedBy: string | null): Promise<PaymentOrder | null>;

  addFamilyMember(ownerId: string, memberId: string): Promise<void>;
  removeFamilyMember(ownerId: string, memberId: string): Promise<boolean>;
  listFamilyMembers(ownerId: string): Promise<FamilyMember[]>;
  /** The family this account belongs to as a member, if any. */
  findFamilyOfMember(memberId: string): Promise<FamilyMember | null>;
  listAllFamilyMembers(): Promise<FamilyMember[]>;

  createLead(lead: NewLead): Promise<BusinessLead>;
  listLeads(limit: number): Promise<BusinessLead[]>;
  setLeadStatus(id: string, status: LeadStatus): Promise<boolean>;
}
