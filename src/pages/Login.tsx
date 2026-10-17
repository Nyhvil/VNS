import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AccountsOnly, PageShell } from "@/components/PageShell";
import { useAccount } from "@/hooks/useAccount";
import { AccountInfo, api, errorMessage, safeNextPath } from "@/lib/api";

/** Sign-in and sign-up share one form; `mode` picks which. */
const AuthPage = ({ mode }: { mode: "login" | "register" }) => {
  const [params] = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const navigate = useNavigate();
  const { refresh } = useAccount();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (isRegister && password !== confirm) {
      setError("Hai lần nhập mật khẩu không giống nhau.");
      return;
    }
    setBusy(true);
    try {
      await api<{ account: AccountInfo }>(isRegister ? "/api/auth/register" : "/api/auth/login", {
        body: isRegister ? { name, email, password } : { email, password },
      });
      await refresh();
      navigate(next, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const otherLink = `${isRegister ? "/dang-nhap" : "/dang-ky"}${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <AccountsOnly>
      <PageShell width="max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{isRegister ? "Tạo tài khoản VnS" : "Đăng nhập"}</CardTitle>
            <CardDescription>
              {isRegister
                ? "Miễn phí. Có ngay 10 lượt kiểm tra mỗi ngày và lưu lịch sử kiểm tra."
                : "Đăng nhập để dùng lượt kiểm tra và gói của bạn."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit} noValidate>
              {isRegister && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Họ tên</Label>
                  <Input id="name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} required maxLength={80} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Mật khẩu</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={isRegister ? 8 : undefined}
                />
                {isRegister && <p className="text-xs text-muted-foreground">Ít nhất 8 ký tự.</p>}
              </div>
              {isRegister && (
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Nhập lại mật khẩu</Label>
                  <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
                </div>
              )}

              {error && <p role="alert" className="text-sm text-red-500">{error}</p>}

              <Button type="submit" disabled={busy} className="w-full bg-brand text-brand-foreground hover:bg-brand-hover">
                {busy && <Loader2 className="animate-spin" />}
                {isRegister ? "Đăng ký" : "Đăng nhập"}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              {isRegister ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
              <Link className="text-brand underline" to={otherLink}>
                {isRegister ? "Đăng nhập" : "Đăng ký miễn phí"}
              </Link>
            </p>
            {!isRegister && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Quên mật khẩu? Hiện chưa có đặt lại qua email; hãy liên hệ nhóm VnS.
              </p>
            )}
          </CardContent>
        </Card>
      </PageShell>
    </AccountsOnly>
  );
};

export const LoginPage = () => <AuthPage mode="login" />;
export const RegisterPage = () => <AuthPage mode="register" />;
