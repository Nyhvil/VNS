export type AuthFieldErrorMap = Partial<
  Record<"fullName" | "email" | "password", string>
>;

export type MockAuthSuccess = {
  ok: true;
  message: string;
  redirectTo: string;
  user: {
    name: string;
    email: string;
  };
};

export type MockAuthFailure = {
  ok: false;
  message: string;
  fieldErrors?: AuthFieldErrorMap;
};

export type MockAuthResponse = MockAuthSuccess | MockAuthFailure;

type LoginPayload = {
  email?: string;
  password?: string;
  provider?: "google" | "microsoft";
};

type RegisterPayload = {
  fullName?: string;
  email?: string;
  password?: string;
};

export async function delayMockAuth(ms = 650) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildLoginResponse(payload: LoginPayload): MockAuthResponse {
  if (payload.provider) {
    return {
      ok: true,
      message: `Đăng nhập thử với ${capitalize(payload.provider)} thành công.`,
      redirectTo: "/dashboard",
      user: {
        name: "MailGuard Demo",
        email: `demo@${payload.provider}.mailguard.dev`,
      },
    };
  }

  const email = payload.email?.trim() ?? "";
  const password = payload.password ?? "";
  const fieldErrors: AuthFieldErrorMap = {};

  if (!email) {
    fieldErrors.email = "Vui lòng nhập email.";
  } else if (!isValidEmail(email)) {
    fieldErrors.email = "Email chưa đúng định dạng.";
  }

  if (!password) {
    fieldErrors.password = "Vui lòng nhập mật khẩu.";
  } else if (password.length < 8) {
    fieldErrors.password = "Mật khẩu cần ít nhất 8 ký tự.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Thông tin đăng nhập chưa hợp lệ.",
      fieldErrors,
    };
  }

  if (email.includes("blocked")) {
    return {
      ok: false,
      message: "Tài khoản mock này đang bị khóa để thử luồng lỗi.",
    };
  }

  return {
    ok: true,
    message: "Đăng nhập mock thành công. Đang chuyển vào dashboard...",
    redirectTo: "/dashboard",
    user: {
      name: "Người dùng MailGuard",
      email,
    },
  };
}

export function buildRegisterResponse(payload: RegisterPayload): MockAuthResponse {
  const fullName = payload.fullName?.trim() ?? "";
  const email = payload.email?.trim() ?? "";
  const password = payload.password ?? "";
  const fieldErrors: AuthFieldErrorMap = {};

  if (!fullName) {
    fieldErrors.fullName = "Vui lòng nhập họ và tên.";
  } else if (fullName.length < 3) {
    fieldErrors.fullName = "Họ và tên cần ít nhất 3 ký tự.";
  }

  if (!email) {
    fieldErrors.email = "Vui lòng nhập email.";
  } else if (!isValidEmail(email)) {
    fieldErrors.email = "Email chưa đúng định dạng.";
  }

  if (!password) {
    fieldErrors.password = "Vui lòng nhập mật khẩu.";
  } else if (password.length < 8) {
    fieldErrors.password = "Mật khẩu cần ít nhất 8 ký tự.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Thông tin đăng ký chưa hợp lệ.",
      fieldErrors,
    };
  }

  if (email.includes("exists") || email.endsWith("@taken.mailguard.dev")) {
    return {
      ok: false,
      message: "Email này đã tồn tại trong môi trường mock.",
      fieldErrors: {
        email: "Email đã được dùng cho một tài khoản mock khác.",
      },
    };
  }

  return {
    ok: true,
    message: "Tạo tài khoản mock thành công. Đang chuyển vào dashboard...",
    redirectTo: "/dashboard",
    user: {
      name: fullName,
      email,
    },
  };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
