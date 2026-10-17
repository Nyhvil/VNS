import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { renderChatText } from "@/lib/chatText";

const show = (text: string) => render(<div data-testid="out">{renderChatText(text)}</div>).getByTestId("out");

describe("renderChatText", () => {
  it("turns **bold** into bold text without the stars", () => {
    const out = show("Đây là tin nhắn **lừa đảo giả mạo ngân hàng**. Bạn hãy xử lý");
    expect(out.textContent).toBe("Đây là tin nhắn lừa đảo giả mạo ngân hàng. Bạn hãy xử lý");
    expect(out.querySelector("strong")?.textContent).toBe("lừa đảo giả mạo ngân hàng");
  });

  it("makes bullets and drops heading marks", () => {
    expect(show("## Việc cần làm\n* Gọi ngân hàng\n- Đổi mật khẩu").textContent).toBe(
      "Việc cần làm\n• Gọi ngân hàng\n• Đổi mật khẩu",
    );
  });

  it("never turns the text into HTML", () => {
    const out = show("<img src=x onerror=alert(1)> **<b>đậm</b>**");
    expect(out.querySelector("img")).toBeNull();
    expect(out.querySelector("b")).toBeNull();
    expect(out.textContent).toContain("<img src=x onerror=alert(1)>");
  });

  it("removes a stray unmatched pair of stars", () => {
    expect(show("Cẩn thận ** nhé").textContent).toBe("Cẩn thận  nhé");
  });
});
