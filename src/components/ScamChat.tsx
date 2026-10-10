import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageCircleQuestion, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getFunctionErrorMessage } from "@/lib/functionError";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sourceCount?: number;
}

interface ScamChatProps {
  /** The content that was analysed, when it is text. */
  content?: string;
  verdict: { riskLevel: string; scamPercent: number; explanation: string };
}

const SUGGESTED_QUESTIONS = [
  "Vì sao nội dung này bị đánh giá như vậy?",
  "Tôi nên làm gì bây giờ?",
  "Tôi lỡ bấm vào link rồi thì phải làm sao?",
];

const MAX_QUESTION_LENGTH = 500;

/** Lets the user ask follow-up questions about the analysis result. */
const ScamChat = ({ content, verdict }: ScamChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, { role: "user", content: trimmed }]);
    setQuestion("");
    setError(null);
    setIsSending(true);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("scam-chat", {
        body: { question: trimmed, content, verdict, history },
      });
      if (invokeError) throw invokeError;

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.answer,
          sourceCount: Array.isArray(data.sources) ? data.sources.length : 0,
        },
      ]);
    } catch (err) {
      console.error("Chat error:", err);
      setError(await getFunctionErrorMessage(err, "Chưa trả lời được, vui lòng thử lại."));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="border-t border-border pt-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <MessageCircleQuestion className="h-4 w-4 text-brand" />
        Hỏi thêm về kết quả này
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((suggestion) => (
            <Button key={suggestion} variant="outline" size="sm" className="h-auto py-1.5 text-xs whitespace-normal text-left"
              disabled={isSending} onClick={() => ask(suggestion)}>
              {suggestion}
            </Button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div className="space-y-2" aria-live="polite">
          {messages.map((message, i) => (
            <div key={i}
              className={`rounded-lg p-3 text-sm whitespace-pre-wrap ${
                message.role === "user"
                  ? "bg-brand/10 text-foreground ml-8"
                  : "bg-muted/50 text-foreground mr-8 border border-border"
              }`}>
              {message.content}
              {message.role === "assistant" && !!message.sourceCount && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Dựa trên {message.sourceCount} mẫu lừa đảo tương tự trong cơ sở dữ liệu.
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {isSending && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Đang trả lời...
        </p>
      )}
      {error && <p className="text-xs text-red-500" role="alert">{error}</p>}

      <div className="flex gap-2 items-end">
        <Textarea
          placeholder="Nhập câu hỏi của bạn"
          aria-label="Câu hỏi về kết quả phân tích"
          className="min-h-[44px] h-[44px] resize-none text-sm"
          maxLength={MAX_QUESTION_LENGTH}
          value={question}
          disabled={isSending}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(question);
            }
          }}
        />
        <Button size="icon" className="h-[44px] w-[44px] shrink-0" aria-label="Gửi câu hỏi"
          disabled={isSending || !question.trim()} onClick={() => ask(question)}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Trợ lý dùng AI, câu trả lời chỉ mang tính tham khảo. Đừng nhập mật khẩu, mã OTP hay số thẻ vào đây.
      </p>
    </div>
  );
};

export default ScamChat;
