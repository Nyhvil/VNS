import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Crown, Loader2, Trash2, UserPlus, LogOut } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { AccountsOnly, PageShell } from "@/components/PageShell";
import { OrderStatusBadge } from "@/pages/Checkout";
import { useAccount } from "@/hooks/useAccount";
import { api, errorMessage, formatDate, formatVnd, Order, PLAN_NAMES } from "@/lib/api";

interface HistoryItem {
  id: string;
  createdAt: string;
  type: "text" | "image";
  content: string | null;
  riskLevel: string;
  explanation: string;
}

interface Family {
  maxMembers: number;
  members: { id: string; email: string; name: string }[];
}

const RISK_LABELS: Record<string, { label: string; className: string }> = {
  SCAM: { label: "Lừa đảo", className: "bg-red-500/15 text-red-600 hover:bg-red-500/15" },
  SUSPICIOUS: { label: "Đáng nghi", className: "bg-orange-500/15 text-orange-600 hover:bg-orange-500/15" },
  SAFE: { label: "An toàn", className: "bg-green-500/15 text-green-700 hover:bg-green-500/15" },
};

const Overview = () => {
  const { account, usage } = useAccount();
  if (!account || !usage) return null;
  const { entitlement } = account;
  const percent = usage.limit ? Math.min(100, (usage.used / usage.limit) * 100) : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardDescription>Gói đang dùng</CardDescription>
          <CardTitle className="flex items-center gap-2">
            {entitlement.plan !== "free" && <Crown className="h-5 w-5 text-amber-500" />}
            {PLAN_NAMES[entitlement.plan]}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {entitlement.plan === "free" ? (
            <p className="text-muted-foreground">Nâng cấp để kiểm tra không giới hạn mỗi ngày.</p>
          ) : (
            <p>
              Hết hạn: <b>{formatDate(entitlement.expiresAt)}</b>
            </p>
          )}
          {entitlement.source === "family" && entitlement.familyOwner && (
            <p className="text-muted-foreground">
              Bạn là thành viên gói Gia đình của {entitlement.familyOwner.name} ({entitlement.familyOwner.email}).
            </p>
          )}
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand-hover">
            <Link to="/bang-gia">{entitlement.plan === "free" ? "Nâng cấp gói" : "Gia hạn hoặc đổi gói"}</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Lượt kiểm tra hôm nay</CardDescription>
          <CardTitle>{usage.limit === null ? `${usage.used} lượt · không giới hạn` : `${usage.used} / ${usage.limit} lượt`}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {usage.limit !== null && <Progress value={percent} aria-label="Lượt đã dùng hôm nay" />}
          <p>Làm mới lúc 00:00 ngày {formatDate(usage.resetsAt)} (giờ Việt Nam).</p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardDescription>Thông tin tài khoản</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <div className="text-muted-foreground">Họ tên</div>
            <div className="font-medium">{account.name}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Email</div>
            <div className="font-medium break-all">{account.email}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Ngày tạo</div>
            <div className="font-medium">{formatDate(account.createdAt)}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const History = () => {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ scans: HistoryItem[] }>("/api/account/history")
      .then(data => setItems(data.scans))
      .catch(err => setError(errorMessage(err)));
  }, []);

  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (!items) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />;
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Chưa có lượt kiểm tra nào. <Link to="/" className="text-brand underline">Kiểm tra ngay</Link></p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">50 lượt kiểm tra gần nhất.</p>
      {items.map(item => {
        const risk = RISK_LABELS[item.riskLevel] ?? RISK_LABELS.SAFE;
        return (
          <Card key={item.id}>
            <CardContent className="space-y-2 pt-4">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {formatDate(item.createdAt, true)} · {item.type === "image" ? "Ảnh" : "Văn bản"}
                </span>
                <Badge className={risk.className}>{risk.label}</Badge>
              </div>
              <p className="line-clamp-2 text-sm">{item.content || "—"}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{item.explanation}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

const FamilyTab = () => {
  const { account, refresh } = useAccount();
  const [family, setFamily] = useState<Family | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isOwner =
    !!account &&
    account.ownPlan.plan === "family" &&
    (!account.ownPlan.expiresAt || Date.parse(account.ownPlan.expiresAt) > Date.now());
  const isMember = account?.entitlement.source === "family";

  const load = useCallback(async () => {
    try {
      setFamily(await api<Family>("/api/account/family"));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    if (isOwner) void load();
  }, [isOwner, load]);

  const run = async (action: () => Promise<Family | unknown>) => {
    setBusy(true);
    setError("");
    try {
      const result = await action();
      if (result && typeof result === "object" && "members" in result) setFamily(result as Family);
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (isMember && account?.entitlement.familyOwner) {
    return (
      <Card>
        <CardContent className="space-y-3 pt-6 text-sm">
          <p>
            Bạn đang dùng gói Gia đình của <b>{account.entitlement.familyOwner.name}</b> ({account.entitlement.familyOwner.email}).
          </p>
          {error && <p className="text-red-500">{error}</p>}
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              if (await run(() => api("/api/account/family/leave", { body: {} }))) await refresh();
            }}
          >
            <LogOut className="h-4 w-4" /> Rời gói Gia đình
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isOwner) {
    return (
      <Card>
        <CardContent className="space-y-3 pt-6 text-sm">
          <p>Gói Gia đình cho bạn và tối đa 4 người thân kiểm tra không giới hạn, với một lần thanh toán.</p>
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand-hover">
            <Link to="/bang-gia">Xem gói Gia đình</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (await run(() => api<Family>("/api/account/family", { body: { email } }))) setEmail("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Thành viên gia đình</CardTitle>
        <CardDescription>
          {family ? `${family.members.length}/${family.maxMembers} thành viên. ` : ""}
          Người được thêm cần có tài khoản VnS trước.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={add} className="flex gap-2">
          <Label htmlFor="member-email" className="sr-only">Email thành viên</Label>
          <Input id="member-email" type="email" placeholder="Email của người thân" value={email} onChange={e => setEmail(e.target.value)} />
          <Button type="submit" disabled={busy || !email.trim()}>
            <UserPlus className="h-4 w-4" /> Thêm
          </Button>
        </form>
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        <ul className="divide-y divide-border">
          {family?.members.map(member => (
            <li key={member.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                <b>{member.name}</b> <span className="text-muted-foreground">{member.email}</span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Bỏ ${member.email}`}
                disabled={busy}
                onClick={() => run(() => api<Family>(`/api/account/family/${member.id}`, { method: "DELETE" }))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

const Orders = () => {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ orders: Order[] }>("/api/account/orders")
      .then(data => setOrders(data.orders))
      .catch(err => setError(errorMessage(err)));
  }, []);

  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (!orders) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />;
  if (orders.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">Chưa có đơn nào.</p>;

  return (
    <div className="divide-y divide-border rounded-md border border-border bg-card">
      {orders.map(order => (
        <Link key={order.code} to={`/thanh-toan/${order.code}`} className="flex items-center justify-between gap-3 p-4 text-sm hover:bg-muted/50">
          <div>
            <div className="font-mono font-semibold">{order.code}</div>
            <div className="text-muted-foreground">
              Gói {order.planName}, {order.months} tháng · {formatDate(order.createdAt, true)}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="font-medium">{formatVnd(order.amount)}</span>
            <OrderStatusBadge status={order.status} />
          </div>
        </Link>
      ))}
    </div>
  );
};

const Security = () => {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api("/api/account/password", { body: { currentPassword: current, newPassword: next } });
      setCurrent("");
      setNext("");
      setMessage({ ok: true, text: "Đã đổi mật khẩu. Các thiết bị khác đã được đăng xuất." });
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Đổi mật khẩu</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="max-w-sm space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Mật khẩu hiện tại</Label>
            <Input id="current-password" type="password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">Mật khẩu mới (ít nhất 8 ký tự)</Label>
            <Input id="new-password" type="password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} />
          </div>
          {message && <p role="status" className={`text-sm ${message.ok ? "text-green-700" : "text-red-500"}`}>{message.text}</p>}
          <Button type="submit" disabled={busy || !current || !next}>
            {busy && <Loader2 className="animate-spin" />} Đổi mật khẩu
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const Account = () => {
  const { account, loading } = useAccount();
  if (!loading && !account) return <Navigate to="/dang-nhap?next=%2Ftai-khoan" replace />;

  return (
    <AccountsOnly>
      <PageShell width="max-w-4xl">
        <h2 className="text-2xl font-bold">Tài khoản của tôi</h2>
        {!account ? (
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
        ) : (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="flex h-auto flex-wrap justify-start">
              <TabsTrigger value="overview">Tổng quan</TabsTrigger>
              <TabsTrigger value="history">Lịch sử kiểm tra</TabsTrigger>
              <TabsTrigger value="family">Gia đình</TabsTrigger>
              <TabsTrigger value="orders">Đơn thanh toán</TabsTrigger>
              <TabsTrigger value="security">Bảo mật</TabsTrigger>
            </TabsList>
            <TabsContent value="overview"><Overview /></TabsContent>
            <TabsContent value="history"><History /></TabsContent>
            <TabsContent value="family"><FamilyTab /></TabsContent>
            <TabsContent value="orders"><Orders /></TabsContent>
            <TabsContent value="security"><Security /></TabsContent>
          </Tabs>
        )}
      </PageShell>
    </AccountsOnly>
  );
};

export default Account;
