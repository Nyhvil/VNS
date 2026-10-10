import { describe, expect, it } from "vitest";
import { getFunctionErrorStatus } from "@/lib/functionError";
import { describeAdminError } from "@/lib/adminError";

describe("getFunctionErrorStatus", () => {
  it("reads the HTTP status of a failed function call", () => {
    const error = { context: new Response("{}", { status: 401 }) };
    expect(getFunctionErrorStatus(error)).toBe(401);
  });

  it("returns null when the function was never reached", () => {
    expect(getFunctionErrorStatus(new Error("Failed to fetch"))).toBeNull();
    expect(getFunctionErrorStatus(null)).toBeNull();
  });
});

describe("describeAdminError", () => {
  it("says the password is wrong only for 401", () => {
    expect(describeAdminError(401)).toBe("Sai mật khẩu.");
  });

  it("does not blame the password for a server error", () => {
    expect(describeAdminError(500)).toContain("không phải do mật khẩu");
    expect(describeAdminError(500)).toContain("500");
  });

  it("names a connection problem when there is no status", () => {
    expect(describeAdminError(null)).toContain("Không kết nối được");
  });

  it("names rate limiting", () => {
    expect(describeAdminError(429)).toContain("quá nhiều lần");
  });
});
