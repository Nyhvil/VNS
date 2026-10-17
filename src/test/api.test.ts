import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, formatDate, formatVnd, safeNextPath } from "@/lib/api";

describe("safeNextPath", () => {
  it("keeps paths on this site", () => {
    expect(safeNextPath("/bang-gia")).toBe("/bang-gia");
    expect(safeNextPath("/thanh-toan/VNS7K2QXM")).toBe("/thanh-toan/VNS7K2QXM");
  });

  it("refuses anything that could leave the site", () => {
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
  });
});

describe("formatting", () => {
  it("writes money the Vietnamese way", () => {
    expect(formatVnd(109000)).toBe("109.000 VND");
  });

  it("shows dates in Vietnam time", () => {
    // 17:30 UTC is already the next day in Vietnam.
    expect(formatDate("2026-10-17T17:30:00Z")).toBe("18/10/2026");
    expect(formatDate(null)).toBe("—");
  });
});

describe("api", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends JSON and returns the answer", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(api("/api/x", { body: { a: 1 } })).resolves.toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledWith("/api/x", expect.objectContaining({ method: "POST", body: '{"a":1}', credentials: "same-origin" }));
  });

  it("turns an error answer into an ApiError with the server's message and code", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Hết lượt", code: "QUOTA_EXCEEDED" }), { status: 429 })));
    const error = await api("/api/x").catch(e => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: "Hết lượt", status: 429, code: "QUOTA_EXCEEDED" });
  });

  it("explains a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(api("/api/x")).rejects.toMatchObject({ status: 0, message: expect.stringContaining("Không kết nối") });
  });
});
