/**
 * Calls to the VNS server's own API (/api/*): accounts, plans, payments.
 *
 * Accounts exist only in the standalone build (npm run build:standalone),
 * where the VNS server serves this app. The Lovable build talks to Supabase
 * Edge Functions, which have no accounts, so account features are hidden there.
 */

export const ACCOUNTS_ENABLED =
  import.meta.env.MODE === "standalone" || import.meta.env.VITE_ACCOUNTS === "true";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? (options.body === undefined ? "GET" : "POST"),
      credentials: "same-origin",
      headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError("Không kết nối được tới máy chủ. Kiểm tra mạng rồi thử lại.", 0);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data && typeof data.error === "string" ? data.error : `Máy chủ báo lỗi (mã ${response.status}).`;
    throw new ApiError(message, response.status, data?.code);
  }
  return data as T;
}

export const errorMessage = (error: unknown, fallback = "Đã xảy ra lỗi, vui lòng thử lại.") =>
  error instanceof Error && error.message ? error.message : fallback;

/** Only paths inside this site, so a link cannot send the user elsewhere after signing in. */
export function safeNextPath(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/";
}

// ─── shapes of the server's answers ──────────────────────────────────────

export type PlanId = "free" | "premium" | "family";
export type PaidPlanId = Exclude<PlanId, "free">;

export interface Usage {
  used: number;
  limit: number | null;
  resetsAt: string;
}

export interface Entitlement {
  plan: PlanId;
  source: "own" | "family" | "none";
  expiresAt: string | null;
  dailyLimit: number | null;
  familyOwner?: { id: string; email: string; name: string };
}

export interface AccountInfo {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  entitlement: Entitlement;
  ownPlan: { plan: PlanId; expiresAt: string | null };
}

export interface MeResponse {
  account: AccountInfo | null;
  usage: Usage;
}

export interface Plan {
  id: PlanId;
  name: string;
  pricePerMonth: number;
  dailyLimit: number | null;
  extraMembers: number;
  features: string[];
}

export interface PaymentInfo {
  mode: "manual" | "demo";
  configured: boolean;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
}

export interface PlansResponse {
  guestDailyLimit: number;
  plans: Plan[];
  paidPlans: PaidPlanId[];
  allowedMonths: number[];
  business: { id: string; name: string; priceLabel: string }[];
  payment: PaymentInfo;
}

export interface Order {
  code: string;
  plan: PaidPlanId;
  planName: string;
  months: number;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  createdAt: string;
  paidAt: string | null;
}

// ─── formatting ──────────────────────────────────────────────────────────

export const formatVnd = (amount: number) => `${amount.toLocaleString("vi-VN")} VND`;

export function formatDate(iso: string | null, withTime = false): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export const PLAN_NAMES: Record<PlanId, string> = { free: "Miễn phí", premium: "Nâng cao", family: "Gia đình" };
