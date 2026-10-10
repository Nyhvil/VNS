import Link from "next/link";

import { loginVisualBullets } from "@/components/pages/auth/content";
import LoginForm from "@/components/pages/auth/forms/LoginForm";
import LoginShieldArt from "@/components/pages/auth/illustrations/LoginShieldArt";
import AuthFormCard from "@/components/pages/auth/shared/AuthFormCard";
import AuthShell from "@/components/pages/auth/shared/AuthShell";
import AuthVisualChecklist from "@/components/pages/auth/shared/AuthVisualChecklist";
import AuthVisualPanel from "@/components/pages/auth/shared/AuthVisualPanel";

export default function LoginPage() {
  return (
    <AuthShell
      visual={
        <AuthVisualPanel
          variant="login"
          title="Chào mừng trở lại với MailGuard"
          illustration={<LoginShieldArt />}
          bottomContent={<AuthVisualChecklist items={loginVisualBullets} />}
        />
      }
      formCard={
        <AuthFormCard
          tone="soft"
          badge="Welcome back • Đăng nhập MailGuard"
          title="Đăng nhập vào MailGuard"
        >
          <div className="space-y-6">
            <LoginForm />

            <div className="pt-1 text-right">
              <Link
                href="/"
                className="text-[0.98rem] text-[#232323] underline underline-offset-4"
              >
                Về trang chủ
              </Link>
            </div>
          </div>
        </AuthFormCard>
      }
    />
  );
}
