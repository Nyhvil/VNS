/**
 * Plans and daily limits.
 *
 * Prices come from the team's business model slide. The daily limits of the
 * paid plans and the family size are this codebase's own choice and live only
 * here, so they are easy to change.
 */

export type PlanId = 'free' | 'premium' | 'family';
/** Plans that can be bought. */
export type PaidPlanId = Exclude<PlanId, 'free'>;

export interface PlanDefinition {
  id: PlanId;
  name: string;
  /** VND per month; 0 for the free plan. */
  pricePerMonth: number;
  /** Analyses per day; null = no daily limit (the anti-spam rate limit still applies). */
  dailyLimit: number | null;
  /** People who share the plan besides its owner. */
  extraMembers: number;
  features: string[];
}

/** Analyses per day for a visitor without an account. */
export const GUEST_DAILY_LIMIT = 5;

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Miễn phí',
    pricePerMonth: 0,
    dailyLimit: 10,
    extraMembers: 0,
    features: ['10 lượt kiểm tra mỗi ngày', 'Lưu lịch sử kiểm tra trong tài khoản', 'Hỏi thêm trợ lý AI về kết quả'],
  },
  premium: {
    id: 'premium',
    name: 'Nâng cao',
    pricePerMonth: 29_000,
    dailyLimit: null,
    extraMembers: 0,
    features: ['Không giới hạn lượt kiểm tra mỗi ngày', 'Mọi tính năng của gói Miễn phí'],
  },
  family: {
    id: 'family',
    name: 'Gia đình',
    pricePerMonth: 109_000,
    dailyLimit: null,
    extraMembers: 4,
    features: [
      'Không giới hạn lượt kiểm tra cho cả nhà',
      'Dùng chung cho chủ gói và tối đa 4 thành viên',
      'Thêm, bớt thành viên trong trang tài khoản',
    ],
  },
};

export const PAID_PLAN_IDS: PaidPlanId[] = ['premium', 'family'];
export const ALLOWED_MONTHS = [1, 3, 6, 12];
/** One month of a paid plan, for working out expiry dates. */
export const DAYS_PER_MONTH = 30;

/** Services for organisations, sold by quotation. */
export const BUSINESS_SERVICES = [
  { id: 'ai_agent', name: 'AI Agent', priceLabel: 'từ 4.500.000 VND' },
  { id: 'website', name: 'Thiết kế Website', priceLabel: '2.000.000 VND' },
  { id: 'erp', name: 'ERP', priceLabel: 'từ 10.000.000 VND' },
  { id: 'other', name: 'Khác', priceLabel: '' },
] as const;
export type BusinessServiceId = (typeof BUSINESS_SERVICES)[number]['id'];

export function isPaidPlan(value: unknown): value is PaidPlanId {
  return value === 'premium' || value === 'family';
}

// ─── Vietnamese calendar day ───────────────────────────────────────────────
// Vietnam is UTC+7 all year (no daylight saving time).

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Day in Vietnam, as YYYY-MM-DD. Daily limits are counted per such day. */
export function vnDayKey(now: Date = new Date()): string {
  return new Date(now.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

/** When the daily counters start again: the next 00:00 in Vietnam. */
export function nextVnMidnight(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + VN_OFFSET_MS);
  const nextShiftedMidnight = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() + 1);
  return new Date(nextShiftedMidnight - VN_OFFSET_MS);
}
