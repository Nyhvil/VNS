import { randomBytes } from 'crypto';
import { NextFunction, Request, Response, Router } from 'express';
import { getClientIp, rateLimit, RateLimiter } from '../rate-limit';
import { DataStore } from '../store';
import { Account } from './account-store';
import { AccountError, AccountService, Identity, isOrderCode, normalizeEmail } from './account-service';
import { clearCookie, GUEST_COOKIE, isSecureRequest, readCookie, SESSION_COOKIE, setCookie } from './cookies';
import { ALLOWED_MONTHS, BUSINESS_SERVICES, GUEST_DAILY_LIMIT, PAID_PLAN_IDS, PLANS } from './plans';

/**
 * Accounts, plans and payments: /api/*.
 *
 * Signing in sets an HttpOnly cookie, so the same cookie also reaches
 * /functions/v1/analyze-content and decides the daily allowance there.
 */

export interface PaymentSettings {
  /**
   * manual: the buyer transfers money; an admin confirms the order on the
   * admin page. demo: the buyer can mark the order paid right away (for
   * presentations; never on a site that takes real money).
   */
  mode: 'manual' | 'demo';
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
}

export interface AccountRouterSettings {
  trustedProxyHops: number;
  payment: PaymentSettings;
}

export interface AccountRouterDeps {
  accounts: AccountService;
  store: DataStore;
  settings: AccountRouterSettings;
  logError: (event: string, error: unknown) => void;
}

const GUEST_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const GUEST_COOKIE_DAYS = 400;
/** Wrong passwords for one email before it is locked for a while. */
const LOGIN_MAX_FAILURES = 10;
const LOGIN_FAILURE_WINDOW_MS = 15 * 60_000;

type AuthedRequest = Request & { account?: Account; tokenHash?: string };

/** Work out who is asking, giving a new visitor a guest id cookie. */
export function createIdentify(accounts: AccountService, trustedProxyHops: number) {
  return async function identify(req: Request, res: Response): Promise<Identity> {
    const session = await accounts.accountForToken(readCookie(req, SESSION_COOKIE));
    if (session) return { kind: 'account', ...session };

    let guestId = readCookie(req, GUEST_COOKIE);
    if (!guestId || !GUEST_ID_PATTERN.test(guestId)) {
      guestId = randomBytes(18).toString('base64url');
      setCookie(res, GUEST_COOKIE, guestId, {
        maxAgeSeconds: GUEST_COOKIE_DAYS * 86_400,
        secure: isSecureRequest(req, trustedProxyHops),
      });
    }
    return { kind: 'guest', guestId, ip: getClientIp(req, trustedProxyHops) || 'unknown' };
  };
}

/**
 * Refuse requests that a page on another site makes the browser send. The
 * SameSite=Lax cookie already keeps the session out of such requests; this
 * is a second lock on every request that changes something.
 */
export function sameOriginOnly(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const origin = req.headers.origin;
  if (!origin) return next();
  try {
    if (new URL(origin).host === req.headers.host) return next();
  } catch {
    // fall through
  }
  res.status(403).json({ error: 'Yêu cầu không hợp lệ.' });
}

export function sendAccountError(res: Response, error: unknown, logError: AccountRouterDeps['logError'], event: string): void {
  if (error instanceof AccountError) {
    res.status(error.status).json({ error: error.message, code: error.code });
    return;
  }
  logError(event, error);
  res.status(500).json({ error: 'Đã xảy ra lỗi, vui lòng thử lại.' });
}

export function createAccountRouter(deps: AccountRouterDeps): Router {
  const { accounts, store, settings } = deps;
  const router = Router();
  const identify = createIdentify(accounts, settings.trustedProxyHops);
  const secure = (req: Request) => isSecureRequest(req, settings.trustedProxyHops);
  const fail = (res: Response, error: unknown, event: string) => sendAccountError(res, error, deps.logError, event);

  const authLimit = rateLimit({
    trustedProxyHops: settings.trustedProxyHops,
    perIp: 20,
    windowMs: 10 * 60_000,
    message: 'Thử quá nhiều lần. Vui lòng đợi vài phút rồi thử lại.',
  });
  const leadLimit = rateLimit({
    trustedProxyHops: settings.trustedProxyHops,
    perIp: 5,
    windowMs: 60 * 60_000,
    message: 'Bạn đã gửi nhiều yêu cầu. Vui lòng thử lại sau.',
  });
  const loginFailures = new RateLimiter(LOGIN_MAX_FAILURES, LOGIN_FAILURE_WINDOW_MS);

  router.use('/api', sameOriginOnly);
  // Answers about one person must never be cached by a proxy.
  router.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  const startSession = (req: Request, res: Response, token: string) =>
    setCookie(res, SESSION_COOKIE, token, { maxAgeSeconds: accounts.sessionDays * 86_400, secure: secure(req) });

  const requireAccount = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const session = await accounts.accountForToken(readCookie(req, SESSION_COOKIE));
      if (!session) {
        res.status(401).json({ error: 'Vui lòng đăng nhập.', code: 'NOT_SIGNED_IN' });
        return;
      }
      req.account = session.account;
      req.tokenHash = session.tokenHash;
      next();
    } catch (error) {
      fail(res, error, 'web.auth_failed');
    }
  };

  const paymentInfo = () => {
    const { mode, bankName, accountNumber, accountName } = settings.payment;
    return {
      mode,
      configured: !!(bankName && accountNumber && accountName),
      bankName: bankName ?? null,
      accountNumber: accountNumber ?? null,
      accountName: accountName ?? null,
    };
  };

  // ─── public ────────────────────────────────────────────────────────────
  router.get('/api/plans', (_req, res) => {
    res.json({
      guestDailyLimit: GUEST_DAILY_LIMIT,
      plans: Object.values(PLANS),
      paidPlans: PAID_PLAN_IDS,
      allowedMonths: ALLOWED_MONTHS,
      business: BUSINESS_SERVICES,
      payment: paymentInfo(),
    });
  });

  router.get('/api/me', async (req, res) => {
    try {
      const identity = await identify(req, res);
      res.json({
        account: identity.kind === 'account' ? await accounts.publicAccount(identity.account) : null,
        usage: await accounts.usage(identity),
      });
    } catch (error) {
      fail(res, error, 'web.me_failed');
    }
  });

  router.post('/api/auth/register', authLimit, async (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const { account, token } = await accounts.register({ email: body.email, name: body.name, password: body.password });
      startSession(req, res, token);
      res.status(201).json({ account: await accounts.publicAccount(account) });
    } catch (error) {
      fail(res, error, 'web.register_failed');
    }
  });

  router.post('/api/auth/login', authLimit, async (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const emailKey = normalizeEmail(body.email) ?? '';

      const result = await accounts.login({ email: body.email, password: body.password });
      if (!result) {
        if (loginFailures.hit(emailKey) > 0) {
          res.status(429).json({ error: 'Nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.', code: 'LOCKED' });
          return;
        }
        res.status(401).json({ error: 'Email hoặc mật khẩu không đúng.', code: 'BAD_CREDENTIALS' });
        return;
      }
      startSession(req, res, result.token);
      res.json({ account: await accounts.publicAccount(result.account) });
    } catch (error) {
      fail(res, error, 'web.login_failed');
    }
  });

  router.post('/api/auth/logout', async (req, res) => {
    try {
      const session = await accounts.accountForToken(readCookie(req, SESSION_COOKIE));
      if (session) await accounts.logout(session.tokenHash);
      clearCookie(res, SESSION_COOKIE, secure(req));
      res.json({ success: true });
    } catch (error) {
      fail(res, error, 'web.logout_failed');
    }
  });

  router.post('/api/business-leads', leadLimit, async (req, res) => {
    try {
      await accounts.createLead((req.body ?? {}) as Record<string, unknown>);
      res.status(201).json({ success: true });
    } catch (error) {
      fail(res, error, 'web.lead_failed');
    }
  });

  // ─── signed in ─────────────────────────────────────────────────────────
  router.post('/api/account/password', requireAccount, async (req: AuthedRequest, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      await accounts.changePassword(req.account as Account, req.tokenHash as string, body.currentPassword, body.newPassword);
      res.json({ success: true });
    } catch (error) {
      fail(res, error, 'web.password_failed');
    }
  });

  router.get('/api/account/history', requireAccount, async (req: AuthedRequest, res) => {
    try {
      const scans = await store.listScansByAccount((req.account as Account).id, 50);
      res.json({
        scans: scans.map(s => ({
          id: s.id,
          createdAt: s.created_at,
          type: s.type,
          content: s.content_text,
          riskLevel: s.risk_level,
          explanation: s.ai_result,
        })),
      });
    } catch (error) {
      fail(res, error, 'web.history_failed');
    }
  });

  router.get('/api/account/orders', requireAccount, async (req: AuthedRequest, res) => {
    try {
      const orders = await accounts.store.listOrdersByAccount((req.account as Account).id);
      res.json({ orders: orders.map(o => accounts.toPublicOrder(o)), payment: paymentInfo() });
    } catch (error) {
      fail(res, error, 'web.orders_failed');
    }
  });

  router.post('/api/account/orders', requireAccount, async (req: AuthedRequest, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const order = await accounts.createOrder(req.account as Account, body.plan, body.months);
      res.status(201).json({ order: accounts.toPublicOrder(order), payment: paymentInfo() });
    } catch (error) {
      fail(res, error, 'web.order_create_failed');
    }
  });

  /** The order with this code, if it belongs to the signed-in account. */
  const ownOrder = async (req: AuthedRequest) => {
    const code = String(req.params['code'] ?? '').toUpperCase();
    const order = isOrderCode(code) ? await accounts.store.findOrderByCode(code) : null;
    if (!order || order.account_id !== (req.account as Account).id) {
      throw new AccountError('Không tìm thấy đơn này.', 404, 'ORDER_NOT_FOUND');
    }
    return order;
  };

  router.get('/api/account/orders/:code', requireAccount, async (req: AuthedRequest, res) => {
    try {
      res.json({ order: accounts.toPublicOrder(await ownOrder(req)), payment: paymentInfo() });
    } catch (error) {
      fail(res, error, 'web.order_failed');
    }
  });

  router.post('/api/account/orders/:code/cancel', requireAccount, async (req: AuthedRequest, res) => {
    try {
      const order = await accounts.cancelOrder(await ownOrder(req));
      res.json({ order: accounts.toPublicOrder(order) });
    } catch (error) {
      fail(res, error, 'web.order_cancel_failed');
    }
  });

  router.post('/api/account/orders/:code/demo-pay', requireAccount, async (req: AuthedRequest, res) => {
    try {
      if (settings.payment.mode !== 'demo') {
        throw new AccountError('Máy chủ không ở chế độ thanh toán thử.', 403, 'DEMO_DISABLED');
      }
      const order = await accounts.confirmOrder(await ownOrder(req), 'demo');
      const account = await accounts.store.findAccountById(order.account_id);
      res.json({
        order: accounts.toPublicOrder(order),
        account: account ? await accounts.publicAccount(account) : null,
      });
    } catch (error) {
      fail(res, error, 'web.order_demo_failed');
    }
  });

  router.get('/api/account/family', requireAccount, async (req: AuthedRequest, res) => {
    try {
      res.json(await accounts.family(req.account as Account));
    } catch (error) {
      fail(res, error, 'web.family_failed');
    }
  });

  router.post('/api/account/family', requireAccount, async (req: AuthedRequest, res) => {
    try {
      await accounts.addFamilyMember(req.account as Account, (req.body as Record<string, unknown> | undefined)?.email);
      res.status(201).json(await accounts.family(req.account as Account));
    } catch (error) {
      fail(res, error, 'web.family_add_failed');
    }
  });

  router.delete('/api/account/family/:memberId', requireAccount, async (req: AuthedRequest, res) => {
    try {
      await accounts.removeFamilyMember(req.account as Account, req.params['memberId']);
      res.json(await accounts.family(req.account as Account));
    } catch (error) {
      fail(res, error, 'web.family_remove_failed');
    }
  });

  router.post('/api/account/family/leave', requireAccount, async (req: AuthedRequest, res) => {
    try {
      await accounts.leaveFamily(req.account as Account);
      res.json({ success: true });
    } catch (error) {
      fail(res, error, 'web.family_leave_failed');
    }
  });

  return router;
}
