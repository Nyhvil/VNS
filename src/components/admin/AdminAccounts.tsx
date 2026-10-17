import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatVnd, PLAN_NAMES, PlanId } from "@/lib/api";

export interface AdminAccountRow {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastLoginAt: string | null;
  plan: PlanId;
  planSource: "own" | "family" | "none";
  planExpiresAt: string | null;
  familyOwnerEmail: string | null;
  usageToday: number;
  dailyLimit: number | null;
}

export interface AdminOrderRow {
  id: string;
  code: string;
  accountEmail: string | null;
  plan: "premium" | "family";
  months: number;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  createdAt: string;
  paidAt: string | null;
  confirmedBy: string | null;
}

export interface AdminLeadRow {
  id: string;
  created_at: string;
  name: string;
  organization: string;
  email: string;
  phone: string;
  service: string;
  message: string;
  status: "new" | "contacted" | "closed";
}

export interface AccountStats {
  totalAccounts: number;
  activePaid: number;
  pendingOrders: number;
  revenue: number;
  newLeads: number;
}

export type AdminAct = (action: string, payload: Record<string, unknown>) => Promise<void>;

const SERVICE_NAMES: Record<string, string> = { ai_agent: "AI Agent", website: "Thiết kế Website", erp: "ERP", other: "Khác" };
const LEAD_STATUS: Record<AdminLeadRow["status"], string> = { new: "Mới", contacted: "Đã liên hệ", closed: "Đã xong" };

export const AccountStatsRow = ({ stats }: { stats: AccountStats }) => (
  <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
    {[
      ["Tài khoản", stats.totalAccounts],
      ["Gói trả phí đang chạy", stats.activePaid],
      ["Đơn chờ xác nhận", stats.pendingOrders],
      ["Doanh thu đã nhận", formatVnd(stats.revenue)],
      ["Yêu cầu DN mới", stats.newLeads],
    ].map(([label, value]) => (
      <Card key={label as string}>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
        </CardContent>
      </Card>
    ))}
  </div>
);

const PlanEditor = ({ row, act, busy }: { row: AdminAccountRow; act: AdminAct; busy: boolean }) => {
  const [plan, setPlan] = useState<PlanId>("premium");
  const [days, setDays] = useState("30");
  return (
    <div className="flex items-center gap-1">
      <Select value={plan} onValueChange={v => setPlan(v as PlanId)}>
        <SelectTrigger className="h-8 w-28" aria-label={`Gói cho ${row.email}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="free">Miễn phí</SelectItem>
          <SelectItem value="premium">Nâng cao</SelectItem>
          <SelectItem value="family">Gia đình</SelectItem>
        </SelectContent>
      </Select>
      {plan !== "free" && (
        <Input className="h-8 w-16" type="number" min={1} value={days} onChange={e => setDays(e.target.value)} aria-label="Số ngày" />
      )}
      <Button
        size="sm"
        variant="outline"
        className="h-8"
        disabled={busy}
        onClick={() => act("set_plan", { accountId: row.id, plan, days: Number(days) })}
      >
        Đặt
      </Button>
    </div>
  );
};

export const AccountsTable = ({ rows, act, busy }: { rows: AdminAccountRow[]; act: AdminAct; busy: boolean }) => {
  const [query, setQuery] = useState("");
  const shown = rows.filter(r => `${r.email} ${r.name}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>Người dùng</CardTitle>
        <Input className="max-w-xs" placeholder="Tìm theo email hoặc tên" value={query} onChange={e => setQuery(e.target.value)} />
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tài khoản</TableHead>
              <TableHead>Gói</TableHead>
              <TableHead>Hết hạn</TableHead>
              <TableHead>Hôm nay</TableHead>
              <TableHead>Đăng ký / đăng nhập</TableHead>
              <TableHead>Đổi gói</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map(row => (
              <TableRow key={row.id}>
                <TableCell className="text-xs">
                  <div className="font-medium">{row.name}</div>
                  <div className="text-muted-foreground">{row.email}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={row.plan === "free" ? "secondary" : "default"}>{PLAN_NAMES[row.plan]}</Badge>
                  {row.planSource === "family" && <div className="mt-1 text-xs text-muted-foreground">của {row.familyOwnerEmail}</div>}
                </TableCell>
                <TableCell className="text-xs">{formatDate(row.planExpiresAt)}</TableCell>
                <TableCell className="text-xs">
                  {row.usageToday}
                  {row.dailyLimit !== null ? `/${row.dailyLimit}` : ""}
                </TableCell>
                <TableCell className="text-xs">
                  {formatDate(row.createdAt)}
                  <div className="text-muted-foreground">{formatDate(row.lastLoginAt, true)}</div>
                </TableCell>
                <TableCell>
                  <PlanEditor row={row} act={act} busy={busy} />
                </TableCell>
              </TableRow>
            ))}
            {shown.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Chưa có tài khoản nào.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export const OrdersTable = ({ rows, act, busy }: { rows: AdminOrderRow[]; act: AdminAct; busy: boolean }) => (
  <Card>
    <CardHeader>
      <CardTitle>Đơn thanh toán</CardTitle>
      <p className="text-sm text-muted-foreground">
        Đối chiếu nội dung chuyển khoản với mã đơn, rồi bấm Xác nhận để kích hoạt gói cho người mua.
      </p>
    </CardHeader>
    <CardContent className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã đơn</TableHead>
            <TableHead>Người mua</TableHead>
            <TableHead>Gói</TableHead>
            <TableHead className="text-right">Số tiền</TableHead>
            <TableHead>Tạo lúc</TableHead>
            <TableHead>Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.id}>
              <TableCell className="font-mono text-xs font-semibold">{row.code}</TableCell>
              <TableCell className="text-xs">{row.accountEmail ?? "—"}</TableCell>
              <TableCell className="text-xs">
                {PLAN_NAMES[row.plan]}, {row.months} tháng
              </TableCell>
              <TableCell className="text-right text-xs">{formatVnd(row.amount)}</TableCell>
              <TableCell className="text-xs">{formatDate(row.createdAt, true)}</TableCell>
              <TableCell>
                {row.status === "pending" ? (
                  <div className="flex gap-1">
                    <Button size="sm" className="h-8 bg-brand text-brand-foreground hover:bg-brand-hover" disabled={busy} onClick={() => act("confirm_order", { code: row.code })}>
                      Xác nhận
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8" disabled={busy} onClick={() => act("cancel_order", { code: row.code })}>
                      Huỷ
                    </Button>
                  </div>
                ) : row.status === "paid" ? (
                  <span className="text-xs text-green-700">
                    Đã nhận {formatDate(row.paidAt, true)}
                    {row.confirmedBy === "demo" ? " (thử)" : ""}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Đã huỷ</span>
                )}
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Chưa có đơn nào.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

export const LeadsTable = ({ rows, act, busy }: { rows: AdminLeadRow[]; act: AdminAct; busy: boolean }) => (
  <Card>
    <CardHeader>
      <CardTitle>Yêu cầu tư vấn doanh nghiệp</CardTitle>
    </CardHeader>
    <CardContent className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Thời gian</TableHead>
            <TableHead>Liên hệ</TableHead>
            <TableHead>Dịch vụ</TableHead>
            <TableHead>Nhu cầu</TableHead>
            <TableHead>Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.id}>
              <TableCell className="whitespace-nowrap text-xs">{formatDate(row.created_at, true)}</TableCell>
              <TableCell className="text-xs">
                <div className="font-medium">{row.name} · {row.organization}</div>
                <div className="text-muted-foreground">{row.email} {row.phone && `· ${row.phone}`}</div>
              </TableCell>
              <TableCell className="text-xs">{SERVICE_NAMES[row.service] ?? row.service}</TableCell>
              <TableCell className="max-w-[260px] text-xs">{row.message || "—"}</TableCell>
              <TableCell>
                <Select value={row.status} onValueChange={status => act("set_lead_status", { leadId: row.id, status })} disabled={busy}>
                  <SelectTrigger className="h-8 w-32" aria-label={`Trạng thái yêu cầu của ${row.organization}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(LEAD_STATUS) as AdminLeadRow["status"][]).map(s => (
                      <SelectItem key={s} value={s}>{LEAD_STATUS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Chưa có yêu cầu nào.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);
