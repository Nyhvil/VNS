"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import AuthField from "@/components/pages/auth/shared/AuthField";
import AuthPrimaryButton from "@/components/pages/auth/shared/AuthPrimaryButton";
import AuthStatusMessage from "@/components/pages/auth/shared/AuthStatusMessage";
import { useAuthDispatch } from "@/store/authStore";

import { requestServerAuth, type AuthFieldErrorMap } from "./authClient";

type RegisterValues = {
  fullName: string;
  email: string;
  password: string;
};

export default function RegisterForm() {
  const router = useRouter();
  const dispatch = useAuthDispatch();
  const [values, setValues] = useState<RegisterValues>({
    fullName: "",
    email: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrorMap>({});
  const [status, setStatus] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setFieldErrors({});
    setStatus(null);

    const result = await requestServerAuth("/api/auth/register", values);

    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {});
      setStatus({
        tone: "error",
        message: result.message,
      });
      setIsPending(false);
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
        name: result.user?.name ?? values.fullName,
        email: result.user?.email ?? values.email,
      },
    });
    dispatch({ type: "SET_LOADING", payload: false });
    router.push(result.redirectTo ?? "/dashboard");
    router.refresh();
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {status ? (
        <AuthStatusMessage tone={status.tone} message={status.message} />
      ) : null}

      <AuthField
        label="Họ và tên"
        type="text"
        name="fullName"
        autoComplete="name"
        placeholder="Nguyễn Văn A"
        value={values.fullName}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            fullName: event.target.value,
          }))
        }
        error={fieldErrors.fullName}
        disabled={isPending}
      />
      <AuthField
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="example@mail.com"
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
        autoComplete="new-password"
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
        label="Tạo tài khoản"
        pendingLabel="Đang tạo tài khoản..."
        isPending={isPending}
        disabled={isPending}
      />
    </form>
  );
}
