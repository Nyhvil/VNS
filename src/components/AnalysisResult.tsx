import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateSessionId } from "@/lib/scamAnalyzer";

interface AnalysisResultProps {
  riskLevel: string;
  scamPercent?: number;
  extractedText?: string;
  explanation: string;
  dangerousPhrases: string[];
  advice: string;
}

const AnalysisResult = ({ riskLevel, scamPercent, explanation, dangerousPhrases, advice, extractedText }: AnalysisResultProps) => {
  const [feedbackSent, setFeedbackSent] = useState(false);

  const getConfig = (level: string) => {
    switch (level) {
      case "SCAM":
        return {
          icon: ShieldX, color: "text-red-500",
          bg: "bg-red-500/10 border-red-500/30",
          badge: "bg-red-500/20 text-red-500 border-red-500/30",
          label: "LỪA ĐẢO", riskLabel: "High Risk Scam",
        };
      case "SUSPICIOUS":
        return {
          icon: ShieldAlert, color: "text-orange-500",
          bg: "bg-orange-500/10 border-orange-500/30",
          badge: "bg-orange-500/20 text-orange-500 border-orange-500/30",
          label: "ĐÁNG NGHI", riskLabel: "Suspicious",
        };
      default:
        return {
          icon: ShieldCheck, color: "text-green-500",
          bg: "bg-green-500/10 border-green-500/30",
          badge: "bg-green-500/20 text-green-500 border-green-500/30",
          label: "AN TOÀN", riskLabel: "Safe",
        };
    }
  };

  const config = getConfig(riskLevel);
  const Icon = config.icon;
  const percent = scamPercent ?? (riskLevel === "SCAM" ? 85 : riskLevel === "SUSPICIOUS" ? 55 : 15);

  const handleFeedback = async (feedback: "correct" | "incorrect") => {
    try {
      const sessionId = generateSessionId();
      await supabase.functions.invoke("submit-feedback", {
        body: { sessionId, feedback },
      });
      setFeedbackSent(true);
    } catch (err) {
      console.error("Feedback error:", err);
    }
  };

  return (
    <Card className={`border ${config.bg} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Kết quả phân tích</CardTitle>
          <Badge variant="outline" className={config.badge}>
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Percentage display */}
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="6" />
              <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" className={config.color}
                strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${(percent / 100) * 220} 220`}
              />
            </svg>
            <span className={`absolute text-xl font-bold ${config.color}`}>{percent}%</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Xác suất lừa đảo: <span className={`font-bold ${config.color}`}>{percent}%</span></p>
            <p className="text-xs text-muted-foreground">Mức độ rủi ro: {config.riskLabel}</p>
          </div>
          <Icon className={`h-12 w-12 ${config.color}`} />
        </div>

        <p className="text-sm text-foreground leading-relaxed">{explanation}</p>

        {extractedText && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">📝 Văn bản trích xuất từ ảnh (đã chuẩn hóa):</p>
            <div className="bg-muted/50 rounded-lg p-3 border border-border max-h-32 overflow-y-auto">
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{extractedText}</p>
            </div>
          </div>
        )}

        {dangerousPhrases.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Cụm từ nguy hiểm phát hiện:
            </div>
            <div className="flex flex-wrap gap-2">
              {dangerousPhrases.map((phrase, i) => (
                <Badge key={i} variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">
                  {phrase}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {advice && (
          <div className="bg-muted/50 rounded-lg p-3 border border-border">
            <p className="text-sm text-muted-foreground">
              💡 <span className="font-medium text-foreground">Lời khuyên:</span> {advice}
            </p>
          </div>
        )}

        {/* Feedback */}
        <div className="border-t border-border pt-4">
          {feedbackSent ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-green-500" />
              Cảm ơn phản hồi của bạn!
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Kết quả phân tích có chính xác không?</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleFeedback("correct")}
                  className="gap-1.5">
                  <ThumbsUp className="h-4 w-4" /> Chính xác
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleFeedback("incorrect")}
                  className="gap-1.5">
                  <ThumbsDown className="h-4 w-4" /> Không chính xác
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalysisResult;
