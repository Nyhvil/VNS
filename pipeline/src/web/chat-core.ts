/**
 * Logic of the scam-chat function, kept free of Deno-specific code so it can
 * be unit-tested with Vitest.
 */

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatInput {
  question: string;
  content?: string;
  verdict?: { riskLevel?: string; scamPercent?: number; explanation?: string };
  history: ChatTurn[];
}

export const MAX_QUESTION_LENGTH = 500;
export const MAX_CONTENT_LENGTH = 6000;
export const MAX_HISTORY_TURNS = 6;

/** Returns the cleaned-up input, or a message (in Vietnamese) saying what is wrong. */
export function parseChatInput(body: unknown): { ok: true; input: ChatInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Yêu cầu không hợp lệ." };
  const raw = body as Record<string, unknown>;

  const question = typeof raw.question === "string" ? raw.question.trim() : "";
  if (!question) return { ok: false, error: "Hãy nhập câu hỏi." };
  if (question.length > MAX_QUESTION_LENGTH) {
    return { ok: false, error: `Câu hỏi dài quá ${MAX_QUESTION_LENGTH} ký tự.` };
  }

  const content = typeof raw.content === "string" ? raw.content.slice(0, MAX_CONTENT_LENGTH) : undefined;

  let verdict: ChatInput["verdict"];
  if (raw.verdict && typeof raw.verdict === "object") {
    const v = raw.verdict as Record<string, unknown>;
    verdict = {
      riskLevel: typeof v.riskLevel === "string" ? v.riskLevel.slice(0, 20) : undefined,
      scamPercent: typeof v.scamPercent === "number" && Number.isFinite(v.scamPercent)
        ? Math.min(100, Math.max(0, v.scamPercent))
        : undefined,
      explanation: typeof v.explanation === "string" ? v.explanation.slice(0, 3000) : undefined,
    };
  }

  const history: ChatTurn[] = Array.isArray(raw.history)
    ? raw.history
      .filter((turn): turn is ChatTurn =>
        !!turn && typeof turn === "object" &&
        ((turn as ChatTurn).role === "user" || (turn as ChatTurn).role === "assistant") &&
        typeof (turn as ChatTurn).content === "string"
      )
      .slice(-MAX_HISTORY_TURNS)
      .map((turn) => ({ role: turn.role, content: turn.content.slice(0, 2000) }))
    : [];

  return { ok: true, input: { question, content, verdict, history } };
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const VN_ID_REGEX = /(?<!\d)\d{12}(?!\d)/g;
const VN_PHONE_REGEX = /(?<!\d)(?:\+?84|0)(?:[\s.-]?\d){9}(?!\d)/g;

/** Mask personal data before text is sent to an external model. */
export function maskPersonalData(text: string): string {
  return text
    .replace(EMAIL_REGEX, "[EMAIL]")
    .replace(VN_ID_REGEX, "[SỐ GIẤY TỜ]")
    .replace(VN_PHONE_REGEX, "[SỐ ĐIỆN THOẠI]");
}

/** Request body for POST /pipeline/chat. */
export function toPipelineChatRequest(input: ChatInput) {
  return {
    question: input.question,
    ...(input.content ? { content: input.content } : {}),
    ...(input.verdict
      ? {
        verdict: {
          ...(input.verdict.riskLevel ? { risk_level: input.verdict.riskLevel } : {}),
          ...(typeof input.verdict.scamPercent === "number" ? { scam_percent: input.verdict.scamPercent } : {}),
          ...(input.verdict.explanation ? { explanation: input.verdict.explanation } : {}),
        },
      }
      : {}),
    ...(input.history.length > 0 ? { history: input.history } : {}),
  };
}

export const SYSTEM_PROMPT = `Bạn là trợ lý an toàn số của VNS – VIỆT NAM SAFE, giúp người dùng Việt Nam nhận biết và phòng tránh lừa đảo trực tuyến.

Quy tắc:
- Trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu với người không rành công nghệ.
- Dựa vào phần "Ngữ cảnh" được cung cấp. Nếu ngữ cảnh không đủ để trả lời, hãy nói rõ là bạn không chắc.
- Chỉ trả lời về an toàn số và phòng chống lừa đảo. Với câu hỏi ngoài phạm vi, hãy từ chối lịch sự.
- Không bao giờ yêu cầu người dùng cung cấp mật khẩu, mã OTP, số thẻ hay giấy tờ tùy thân.
- Khi người dùng có thể đã bị lừa, hướng dẫn họ liên hệ ngân hàng qua số tổng đài chính thức và trình báo cơ quan công an.`;

/** Messages for the built-in chatbot (no pipeline): the analysis itself is the context. */
export function buildFallbackMessages(input: ChatInput) {
  const context: string[] = [];

  if (input.content) {
    context.push(`Nội dung người dùng đã kiểm tra:\n"""\n${maskPersonalData(input.content).slice(0, 2000)}\n"""`);
  }
  if (input.verdict) {
    const parts = [
      input.verdict.riskLevel ? `mức ${input.verdict.riskLevel}` : null,
      typeof input.verdict.scamPercent === "number" ? `điểm lừa đảo ${input.verdict.scamPercent}/100` : null,
    ].filter(Boolean);
    context.push(
      `Kết quả phân tích của hệ thống: ${parts.join(", ") || "không có"}.` +
        (input.verdict.explanation ? `\nGiải thích: ${maskPersonalData(input.verdict.explanation)}` : ""),
    );
  }

  return [
    { role: "system", content: SYSTEM_PROMPT },
    ...input.history.map((turn) => ({ role: turn.role, content: maskPersonalData(turn.content) })),
    {
      role: "user",
      content: `Ngữ cảnh:\n${context.join("\n\n") || "Không có ngữ cảnh bổ sung."}\n\nCâu hỏi: ${maskPersonalData(input.question)}`,
    },
  ];
}
