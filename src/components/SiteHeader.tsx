import { Link, useNavigate } from "react-router-dom";
import { LogOut, User, Crown, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAccount } from "@/hooks/useAccount";
import { PLAN_NAMES } from "@/lib/api";
import vnsLogo from "@/assets/vns-logo.png";

/** Remaining analyses today, e.g. "Còn 3/5 lượt hôm nay". */
export function UsageText({ className = "" }: { className?: string }) {
  const { usage } = useAccount();
  if (!usage) return null;
  if (usage.limit === null) return <span className={className}>Không giới hạn lượt kiểm tra</span>;
  const left = Math.max(0, usage.limit - usage.used);
  return (
    <span className={className}>
      Còn <b>{left}</b>/{usage.limit} lượt hôm nay
    </span>
  );
}

const SiteHeader = () => {
  const { enabled, account, logout } = useAccount();
  const navigate = useNavigate();

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto flex items-center gap-3 px-4 py-3">
        <Link to="/" aria-label="Trang chủ VnS">
          <img src={vnsLogo} alt="VnS – Vietnam Safe" className="h-12 w-auto" />
        </Link>
        <Badge variant="secondary" className="ml-1 hidden text-xs sm:inline-flex">AI-Powered</Badge>

        {enabled && (
          <nav className="ml-auto flex items-center gap-2 text-sm">
            <span className="hidden items-center gap-1 text-muted-foreground md:flex">
              <Gauge className="h-4 w-4" />
              <UsageText />
            </span>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/bang-gia">Bảng giá</Link>
            </Button>

            {account ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    {account.entitlement.plan === "free" ? <User className="h-4 w-4" /> : <Crown className="h-4 w-4 text-amber-500" />}
                    <span className="max-w-[9rem] truncate">{account.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="truncate text-sm font-medium">{account.email}</div>
                    <div className="text-xs text-muted-foreground">Gói {PLAN_NAMES[account.entitlement.plan]}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate("/tai-khoan")}>
                    <User className="h-4 w-4" /> Tài khoản của tôi
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate("/bang-gia")}>
                    <Crown className="h-4 w-4" /> Nâng cấp gói
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={async () => {
                      await logout();
                      navigate("/");
                    }}
                  >
                    <LogOut className="h-4 w-4" /> Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/dang-nhap">Đăng nhập</Link>
                </Button>
                <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand-hover" asChild>
                  <Link to="/dang-ky">Đăng ký</Link>
                </Button>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};

export default SiteHeader;
