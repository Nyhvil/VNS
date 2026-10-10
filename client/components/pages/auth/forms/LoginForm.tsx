"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import AuthDivider from "@/components/pages/auth/shared/AuthDivider";
import AuthField from "@/components/pages/auth/shared/AuthField";
import AuthLinkRow from "@/components/pages/auth/shared/AuthLinkRow";
import AuthPrimaryButton from "@/components/pages/auth/shared/AuthPrimaryButton";
import AuthSecondaryButton from "@/components/pages/auth/shared/AuthSecondaryButton";
import AuthStatusMessage from "@/components/pages/auth/shared/AuthStatusMessage";
import { useAuthDispatch } from "@/store/authStore";

import { requestServerAuth, type AuthFieldErrorMap } from "./authClient";

type LoginValues = {
  email: string;
  password: string;
};

export default function LoginForm() {
  const router = useRouter();
  const dispatch = useAuthDispatch();
  const [values, setValues] = useState<LoginValues>({
    email: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrorMap>({});
  const [status, setStatus] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<
    null | "credentials" | "google" | "microsoft"
  >(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("credentials");
    setFieldErrors({});
    setStatus(null);

    const result = await requestServerAuth("/api/auth/login", values);

    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {});
      setStatus({
        tone: "error",
        message: result.message,
      });
      setPendingAction(null);
      return;
    }

    setStatus({
      tone: "success",
      message: result.message,
    });
    dispatch({
      type: "SET_USER",
      payload: {
        id: result.user?.id ?? "usr-00000000-0000-0000-0000-000000000000",
        name: result.user?.name ?? null,
        email: result.user?.email ?? values.email,
      },
    });
    dispatch({ type: "SET_LOADING", payload: false });
    router.push(result.redirectTo ?? "/dashboard");
    router.refresh();
  }

  async function handleProviderLogin(provider: "google" | "microsoft") {
    setPendingAction(provider);
    setFieldErrors({});
    setStatus(null);

    const result = await requestServerAuth("/api/auth/login", {
      provider,
    });

    if (!result.ok) {
      setStatus({
        tone: "error",
        message: result.message,
      });
      setPendingAction(null);
      return;
    }

    setStatus({
      tone: "success",
      message: result.message,
    });
    dispatch({
      type: "SET_USER",
      payload: {
        id: result.user?.id ?? "usr-00000000-0000-0000-0000-000000000000",
        name: result.user?.name ?? null,
        email: result.user?.email ?? "",
      },
    });
    dispatch({ type: "SET_LOADING", payload: false });
    router.push(result.redirectTo ?? "/dashboard");
    router.refresh();
  }

  const isPending = pendingAction !== null;

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {status ? (
        <AuthStatusMessage tone={status.tone} message={status.message} />
      ) : null}

      <AuthField
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="nhập email của bạn"
        value={values.email}
        onChange={(event) =>
          setValues((current) => ({ ...current, email: event.target.value }))
        }
        error={fieldErrors.email}
        disabled={isPending}
      />
      <AuthField
        label="Mật khẩu"
        type="password"
        name="password"
        autoComplete="current-password"
        placeholder="••••••••"
        value={values.password}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            password: event.target.value,
          }))
        }
        error={fieldErrors.password}
        disabled={isPending}
      />

      <AuthPrimaryButton
        label="Đăng nhập"
        pendingLabel="Đang đăng nhập..."
        isPending={pendingAction === "credentials"}
        disabled={isPending}
      />

      <AuthLinkRow
        leftLabel="Quên mật khẩu?"
        leftHref="/login"
        rightText="Chưa có tài khoản?"
        rightLabel="Tạo tài khoản"
        rightHref="/register"
      />

      <AuthDivider label="OR" />

      <div className="space-y-3">
        <AuthSecondaryButton
          label="Đăng nhập với Google"
          pendingLabel="Đang kết nối Google..."
          isPending={pendingAction === "google"}
          disabled={isPending}
          onClick={() => handleProviderLogin("google")}
        />
        <AuthSecondaryButton
          label="Đăng nhập với Microsoft"
          pendingLabel="Đang kết nối Microsoft..."
          isPending={pendingAction === "microsoft"}
          disabled={isPending}
          onClick={() => handleProviderLogin("microsoft")}
        />
      </div>
    </form>
  );
}
