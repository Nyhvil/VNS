import { describe, it, expect } from "vitest";
import {
  buildFallbackMessages,
  maskPersonalData,
  parseChatInput,
  toPipelineChatRequest,
} from "../../supabase/functions/scam-chat/chat-core";

describe("parseChatInput", () => {
  it("requires a question", () => {
    expect(parseChatInput(null)).toEqual({ ok: false, error: "Yêu cầu không hợp lệ." });
    expect(parseChatInput({ question: "   " })).toEqual({ ok: false, error: "Hãy nhập câu hỏi." });
    expect(parseChatInput({ question: "a".repeat(501) }).ok).toBe(false);
  });

  it("cleans up the input", () => {
    const parsed = parseChatInput({
      question: "  Vì sao?  ",
      content: "x".repeat(7000),
      verdict: { riskLevel: "SCAM", scamPercent: 150, explanation: "Giải thích", extra: "bỏ" },
      history: [
        { role: "user", content: "1" },
        { role: "system", content: "bị bỏ" },
        "rác",
        ...Array.from({ length: 8 }, (_, i) => ({ role: "assistant", content: `trả lời ${i}` })),
      ],
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.input.question).toBe("Vì sao?");
    expect(parsed.input.content).toHaveLength(6000);
    expect(parsed.input.verdict).toEqual({ riskLevel: "SCAM", scamPercent: 100, explanation: "Giải thích" });
    expect(parsed.input.history).toHaveLength(6);
    expect(parsed.input.history.every((turn) => turn.role !== ("system" as string))).toBe(true);
  });
});

describe("maskPersonalData", () => {
  it("masks emails, phone numbers and citizen IDs", () => {
    expect(maskPersonalData("Gọi 0912 345 678, mail a.b@example.com, CCCD 079203001234")).toBe(
      "Gọi [SỐ ĐIỆN THOẠI], mail [EMAIL], CCCD [SỐ GIẤY TỜ]",
    );
  });

  it("leaves amounts of money alone", () => {
    expect(maskPersonalData("Chuyển 2.000.000đ trước 17h")).toBe("Chuyển 2.000.000đ trước 17h");
  });
});

describe("toPipelineChatRequest", () => {
  it("uses the field names of the pipeline API", () => {
    expect(
      toPipelineChatRequest({
        question: "Vì sao?",
        content: "Nội dung",
        verdict: { riskLevel: "SCAM", scamPercent: 90, explanation: "Giải thích" },
        history: [{ role: "user", content: "trước đó" }],
      }),
    ).toEqual({
      question: "Vì sao?",
      content: "Nội dung",
      verdict: { risk_level: "SCAM", scam_percent: 90, explanation: "Giải thích" },
      history: [{ role: "user", content: "trước đó" }],
    });
  });

  it("omits what was not given", () => {
    expect(toPipelineChatRequest({ question: "Vì sao?", history: [] })).toEqual({ question: "Vì sao?" });
  });
});

describe("buildFallbackMessages", () => {
  it("gives the model the analysis as context, without personal data", () => {
    const messages = buildFallbackMessages({
      question: "Số 0912345678 có phải lừa đảo không?",
      content: "Liên hệ a.b@example.com để nhận thưởng",
      verdict: { riskLevel: "SCAM", scamPercent: 92, explanation: "Trúng thưởng giả" },
      history: [{ role: "user", content: "Tôi vừa nhận tin này" }],
    });

    expect(messages[0].role).toBe("system");
    expect(messages[1]).toEqual({ role: "user", content: "Tôi vừa nhận tin này" });

    const last = messages[messages.length - 1].content;
    expect(last).toContain("mức SCAM, điểm lừa đảo 92/100");
    expect(last).toContain("Trúng thưởng giả");
    expect(last).toContain("[EMAIL]");
    expect(last).toContain("[SỐ ĐIỆN THOẠI]");
    expect(last).not.toContain("0912345678");
  });
});
