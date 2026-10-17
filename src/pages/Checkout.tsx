import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Copy, Check, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccountsOnly, PageShell } from "@/components/PageShell";
import { useAccount } from "@/hooks/useAccount";
import { api, errorMessage, formatDate, formatVnd, Order, PaymentInfo } from "@/lib/api";

const CopyRow = ({ label, value }: { label: string; value: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono font-semibold">{value}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label={`Sao chép ${label}`}
          onClick={async () => {
            await navigator.clipboard?.writeText(value).catch(() => undefined);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        </Button>
      </span>
    </div>
  );
};

export const OrderStatusBadge = ({ status }: { status: Order["status"] }) =>
  status === "paid" ? (
    <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/15">Đã thanh toán</Badge>
  ) : status === "cancelled" ? (
    <Badge variant="secondary">Đã huỷ</Badge>
  ) : (
    <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15">Chờ thanh toán</Badge>
  );

const Checkout = () => {
  const { code = "" } = useParams();
  const { account, loading, refresh } = useAccount();
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ order: Order; payment: PaymentInfo }>(`/api/account/orders/${encodeURIComponent(code)}`);
      setOrder(data.order);
      setPayment(data.payment);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [code]);

  useEffect(() => {
    if (account) void load();
  }, [account, load]);

  // While waiting for the transfer to be confirmed, look again every 10 seconds.
  useEffect(() => {
    if (order?.status !== "pending") return;
    const timer = setInterval(() => void load(), 10_000);
    return () => clearInterval(timer);
  }, [order?.status, load]);

  useEffect(() => {
    if (order?.status === "paid") void refresh();
  }, [order?.status, refresh]);

  if (!loading && !account) return <Navigate to={`/dang-nhap?next=${encodeURIComponent(`/thanh-toan/${code}`)}`} replace />;

  const act = async (path: string) => {
    setBusy(true);
    setError("");
    try {
      const data = await api<{ order: Order }>(path, { body: {} });
      setOrder(data.order);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountsOnly>
      <PageShell width="max-w-xl">
        {error && <p role="alert" className="text-center text-sm text-red-500">{error}</p>}
        {!order && !error && <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />}

        {order && payment && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Đơn {order.code}</CardTitle>
                <OrderStatusBadge status={order.status} />
              </div>
              <CardDescription>
                Gói {order.planName}, {order.months} tháng · {formatVnd(order.amount)} · tạo lúc {formatDate(order.createdAt, true)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.status === "paid" && (
                <div className="flex gap-3 rounded-md bg-green-500/10 p-4 text-sm">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                  <div>
                    Thanh toán thành công. Gói {order.planName} đã được kích hoạt.{" "}
                    <Link to="/tai-khoan" className="text-brand underline">Xem tài khoản</Link>
                  </div>
                </div>
              )}

              {order.status === "cancelled" && (
                <div className="flex gap-3 rounded-md bg-muted p-4 text-sm">
                  <XCircle className="h-5 w-5 shrink-0" /> Đơn đã huỷ. <Link to="/bang-gia" className="text-brand underline">Chọn gói khác</Link>
                </div>
              )}

              {order.status === "pending" && (
                <>
                  {payment.configured ? (
                    <div className="space-y-3">
                      <p className="text-sm">Chuyển khoản theo thông tin dưới đây. Ghi <b>đúng nội dung</b> để nhóm khớp đơn của bạn.</p>
                      <div className="rounded-md border border-border px-4">
                        <CopyRow label="Ngân hàng" value={payment.bankName ?? ""} />
                        <CopyRow label="Số tài khoản" value={payment.accountNumber ?? ""} />
                        <CopyRow label="Chủ tài khoản" value={payment.accountName ?? ""} />
                        <CopyRow label="Số tiền" value={String(order.amount)} />
                        <CopyRow label="Nội dung" value={order.code} />
                      </div>
                      <p className="flex gap-2 text-sm text-muted-foreground">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                        Sau khi nhận được tiền, nhóm xác nhận đơn và gói tự kích hoạt. Trang này tự cập nhật.
                      </p>
                    </div>
                  ) : (
                    <p className="rounded-md bg-amber-500/10 p-4 text-sm">
                      Máy chủ chưa có thông tin tài khoản nhận tiền. Vui lòng liên hệ nhóm VnS và gửi kèm mã đơn <b>{order.code}</b>.
                    </p>
                  )}

                  {payment.mode === "demo" && (
                    <div className="space-y-2 rounded-md border border-dashed border-brand p-4">
                      <p className="text-sm">
                        <b>Chế độ thanh toán thử:</b> bấm để giả lập đã chuyển khoản, không có tiền thật nào được trừ.
                      </p>
                      <Button disabled={busy} onClick={() => act(`/api/account/orders/${order.code}/demo-pay`)} className="bg-brand text-brand-foreground hover:bg-brand-hover">
                        {busy && <Loader2 className="animate-spin" />} Thanh toán thử
                      </Button>
                    </div>
                  )}

                  <Button variant="ghost" className="text-muted-foreground" disabled={busy} onClick={() => act(`/api/account/orders/${order.code}/cancel`)}>
                    Huỷ đơn này
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </PageShell>
    </AccountsOnly>
  );
};

export default Checkout;
