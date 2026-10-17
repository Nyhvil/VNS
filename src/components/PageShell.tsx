import { ReactNode } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import { useAccount } from "@/hooks/useAccount";

/** Header and centred column shared by the account pages. */
export const PageShell = ({ children, width = "max-w-3xl" }: { children: ReactNode; width?: string }) => (
  <div className="min-h-screen bg-background">
    <SiteHeader />
    <main className={`container mx-auto ${width} px-4 py-8 space-y-6`}>{children}</main>
  </div>
);

/** Account pages only work when this app is served by the VNS server. */
export const AccountsOnly = ({ children }: { children: ReactNode }) => {
  const { enabled } = useAccount();
  if (enabled) return <>{children}</>;
  return (
    <PageShell>
      <div className="rounded-lg border border-border bg-card p-6 text-center space-y-2">
        <p className="font-medium">Tính năng tài khoản chỉ có ở bản máy chủ VNS.</p>
        <p className="text-sm text-muted-foreground">
          Bản này chạy trên Supabase, chưa có đăng nhập. <Link className="text-brand underline" to="/">Về trang chủ</Link>
        </p>
      </div>
    </PageShell>
  );
};
