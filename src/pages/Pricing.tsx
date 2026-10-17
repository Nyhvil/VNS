import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Building2, Loader2, Users, User, Bot, Globe, Boxes } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AccountsOnly, PageShell } from "@/components/PageShell";
import { useAccount } from "@/hooks/useAccount";
import { api, errorMessage, formatDate, formatVnd, Order, PaidPlanId, Plan, PLAN_NAMES, PlansResponse } from "@/lib/api";

const SERVICE_ICONS: Record<string, typeof Bot> = { ai_agent: Bot, website: Globe, erp: Boxes };

/** Form for organisations: the team calls back with a quotation. */
const BusinessDialog = ({
  open,
  onOpenChange,
  services,
  initialService,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: PlansResponse["business"];
  initialService: string;
}) => {
  const [form, setForm] = useState({ name: "", organization: "", email: "", phone: "", service: initialService, message: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(f => ({ ...f, service: initialService }));
      setSent(false);
      setError("");
    }
  }, [open, initialService]);

  const set = (key: keyof typeof form) => (value: string) => setForm(f => ({ ...f, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/business-leads", { body: form });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Liên hệ tư vấn gói doanh nghiệp</DialogTitle>
          <DialogDescription>Nhóm VnS sẽ liên hệ lại để báo giá theo nhu cầu của đơn vị bạn.</DialogDescription>
        </DialogHeader>
        {sent ? (
          <p className="rounded-md bg-green-500/10 p-4 text-sm text-green-700">
            Đã gửi yêu cầu. Cảm ơn bạn, nhóm sẽ liên hệ qua email hoặc số điện thoại đã để lại.
          </p>
        ) : (
          <form className="space-y-3" onSubmit={submit} noValidate>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="lead-name">Họ tên</Label>
                <Input id="lead-name" value={form.name} onChange={e => set("name")(e.target.value)} maxLength={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-org">Đơn vị</Label>
                <Input id="lead-org" value={form.organization} onChange={e => set("organization")(e.target.value)} maxLength={160} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-email">Email</Label>
                <Input id="lead-email" type="email" value={form.email} onChange={e => set("email")(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-phone">Số điện thoại</Label>
                <Input id="lead-phone" type="tel" value={form.phone} onChange={e => set("phone")(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Dịch vụ quan tâm</Label>
              <Select value={form.service} onValueChange={set("service")}>
                <SelectTrigger aria-label="Dịch vụ quan tâm">
                  <SelectValue placeholder="Chọn dịch vụ" />
                </SelectTrigger>
                <SelectContent>
                  {services.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-message">Nhu cầu</Label>
              <Textarea id="lead-message" value={form.message} onChange={e => set("message")(e.target.value)} maxLength={2000} rows={3} />
            </div>
            {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full bg-brand text-brand-foreground hover:bg-brand-hover">
              {busy && <Loader2 className="animate-spin" />} Gửi yêu cầu
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

const Pricing = () => {
  const { account } = useAccount();
  const navigate = useNavigate();
  const [data, setData] = useState<PlansResponse | null>(null);
  const [months, setMonths] = useState(1);
  const [busyPlan, setBusyPlan] = useState<PaidPlanId | null>(null);
  const [error, setError] = useState("");
  const [leadService, setLeadService] = useState<string | null>(null);

  useEffect(() => {
    api<PlansResponse>("/api/plans").then(setData).catch(err => setError(errorMessage(err)));
  }, []);

  const own = account?.ownPlan;
  const ownActive = !!own && own.plan !== "free" && (!own.expiresAt || Date.parse(own.expiresAt) > Date.now());

  const buy = async (plan: PaidPlanId) => {
    if (!account) {
      navigate(`/dang-nhap?next=${encodeURIComponent("/bang-gia")}`);
      return;
    }
    setBusyPlan(plan);
    setError("");
    try {
      const { order } = await api<{ order: Order }>("/api/account/orders", { body: { plan, months } });
      navigate(`/thanh-toan/${order.code}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyPlan(null);
    }
  };

  const planIcon = (plan: Plan) => (plan.id === "family" ? Users : User);

  return (
    <AccountsOnly>
      <PageShell width="max-w-5xl">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold text-foreground">Bảng giá VnS</h2>
          <p className="text-sm text-muted-foreground">Gói miễn phí, gói nâng cao cho cá nhân và giải pháp cho tổ chức.</p>
        </div>

        {error && <p role="alert" className="text-center text-sm text-red-500">{error}</p>}
        {!data && !error && <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />}

        {data && (
          <>
            <section className="space-y-4">
              <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                <div>
                  <h3 className="text-lg font-semibold">Gói cá nhân</h3>
                  <p className="text-sm text-muted-foreground">Dành cho sinh viên, nhân viên văn phòng, người cao tuổi và gia đình.</p>
                </div>
                <div className="flex items-center gap-1 rounded-md bg-muted p-1" role="group" aria-label="Thời hạn">
                  {data.allowedMonths.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMonths(m)}
                      aria-pressed={months === m}
                      className={`rounded px-3 py-1.5 text-sm ${months === m ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}
                    >
                      {m} tháng
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {data.plans.map(plan => {
                  const Icon = planIcon(plan);
                  const isPaid = plan.id !== "free";
                  const isCurrent = account?.entitlement.plan === plan.id;
                  const renew = isPaid && ownActive && own?.plan === plan.id;
                  const replaces = isPaid && ownActive && own?.plan !== plan.id;
                  return (
                    <Card key={plan.id} className={`flex flex-col ${plan.id === "premium" ? "border-brand shadow-md" : ""}`}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Icon className="h-5 w-5 text-brand" /> {plan.name}
                          </CardTitle>
                          {isCurrent && <Badge variant="secondary">Đang dùng</Badge>}
                        </div>
                        <CardDescription>
                          {plan.id === "free"
                            ? `${plan.dailyLimit} nội dung mỗi ngày khi có tài khoản`
                            : plan.id === "family"
                              ? `Cho bạn và tối đa ${plan.extraMembers} người thân`
                              : "Kiểm tra không giới hạn mỗi ngày"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 space-y-4">
                        <div>
                          <span className="text-3xl font-bold">{plan.pricePerMonth === 0 ? "0" : plan.pricePerMonth.toLocaleString("vi-VN")}</span>
                          <span className="text-sm text-muted-foreground"> VND / tháng</span>
                          {isPaid && months > 1 && (
                            <p className="text-sm text-muted-foreground">
                              {months} tháng: <b>{formatVnd(plan.pricePerMonth * months)}</b>
                            </p>
                          )}
                        </div>
                        <ul className="space-y-2 text-sm">
                          {plan.features.map(f => (
                            <li key={f} className="flex gap-2">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /> {f}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                      <CardFooter className="flex-col items-stretch gap-2">
                        {plan.id === "free" ? (
                          account ? (
                            <Button variant="outline" disabled>
                              {account.entitlement.plan === "free" ? "Gói hiện tại" : "Đã có trong gói của bạn"}
                            </Button>
                          ) : (
                            <Button variant="outline" onClick={() => navigate("/dang-ky")}>
                              Đăng ký miễn phí
                            </Button>
                          )
                        ) : (
                          <Button
                            className="bg-brand text-brand-foreground hover:bg-brand-hover"
                            disabled={busyPlan !== null}
                            onClick={() => buy(plan.id as PaidPlanId)}
                          >
                            {busyPlan === plan.id && <Loader2 className="animate-spin" />}
                            {renew ? `Gia hạn ${months} tháng` : `Mua ${months} tháng`}
                          </Button>
                        )}
                        {renew && own?.expiresAt && (
                          <p className="text-xs text-muted-foreground">Cộng thêm vào sau ngày hết hạn {formatDate(own.expiresAt)}.</p>
                        )}
                        {replaces && own && (
                          <p className="text-xs text-muted-foreground">
                            Gói {PLAN_NAMES[own.plan]} hiện tại sẽ được thay bằng gói này khi thanh toán xong.
                          </p>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Chưa đăng nhập: {data.guestDailyLimit} lượt kiểm tra mỗi ngày. Lượt được làm mới lúc 00:00 giờ Việt Nam.
              </p>
            </section>

            <section className="space-y-4">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <Building2 className="h-5 w-5 text-brand" /> Gói doanh nghiệp
                </h3>
                <p className="text-sm text-muted-foreground">
                  Dành cho doanh nghiệp SME, trường học, đại học và tổ chức đào tạo. Báo giá theo nhu cầu.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {data.business
                  .filter(s => s.id !== "other")
                  .map(service => {
                    const Icon = SERVICE_ICONS[service.id] ?? Building2;
                    return (
                      <Card key={service.id} className="flex flex-col">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Icon className="h-5 w-5 text-brand" /> {service.name}
                          </CardTitle>
                          <CardDescription className="text-base font-semibold text-foreground">{service.priceLabel}</CardDescription>
                        </CardHeader>
                        <CardFooter className="mt-auto">
                          <Button variant="outline" className="w-full" onClick={() => setLeadService(service.id)}>
                            Liên hệ tư vấn
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
              </div>
            </section>

            <BusinessDialog
              open={leadService !== null}
              onOpenChange={open => !open && setLeadService(null)}
              services={data.business}
              initialService={leadService ?? "other"}
            />
          </>
        )}
      </PageShell>
    </AccountsOnly>
  );
};

export default Pricing;
