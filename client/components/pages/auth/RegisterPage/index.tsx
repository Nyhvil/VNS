import Link from "next/link";

import { registerFormChips } from "@/components/pages/auth/content";
import RegisterForm from "@/components/pages/auth/forms/RegisterForm";
import RegisterSecurityArt from "@/components/pages/auth/illustrations/RegisterSecurityArt";
import AuthFeatureChips from "@/components/pages/auth/shared/AuthFeatureChips";
import AuthFormCard from "@/components/pages/auth/shared/AuthFormCard";
import AuthShell from "@/components/pages/auth/shared/AuthShell";
import AuthVisualPanel from "@/components/pages/auth/shared/AuthVisualPanel";

export default function RegisterPage() {
  return (
    <AuthShell
      visual={
        <AuthVisualPanel
          variant="register"
          title="MailGuard - An toàn trực tuyến, được bảo vệ bởi AI. Hãy tham gia cộng đồng ngay hôm nay."
          illustration={<RegisterSecurityArt />}
        />
      }
      formCard={
        <AuthFormCard
          badge="Join MailGuard • Tạo tài khoản miễn phí"
          title="Tạo tài khoản MailGuard"
          description="Bắt đầu với một không gian kiểm tra email, tin nhắn và nội dung đáng ngờ theo phong cách chuyên nghiệp và an toàn với sự hỗ trợ của AI."
        >
          <div className="space-y-7">
            <AuthFeatureChips items={registerFormChips} />

            <RegisterForm />

            <div className="space-y-3 text-center text-[1rem] text-[#202020]">
              <p>
                Đã có tài khoản?{" "}
                <Link href="/login" className="underline underline-offset-4">
                  Đăng nhập
                </Link>
              </p>
              <p>
                <Link href="/" className="underline underline-offset-4">
                  Về trang chủ
                </Link>
              </p>
            </div>
          </div>
        </AuthFormCard>
      }
    />
  );
}
