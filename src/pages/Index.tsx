import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Mail, Trash2, Loader2 } from "lucide-react";
import { analyzeEmail, generateSessionId } from "@/lib/scamAnalyzer";
import { supabase } from "@/integrations/supabase/client";

interface HistoryItem {
  id: number;
  emailSnippet: string;
  riskPercentage: number;
  timestamp: Date;
}

const Index = () => {
  const [emailContent, setEmailContent] = useState("");
  const [result, setResult] = useState<{
    riskPercentage: number;
    explanation: string;
  } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!emailContent.trim()) return;
    setIsAnalyzing(true);

    // Simulate processing delay
    await new Promise((r) => setTimeout(r, 1200));

    const analysis = analyzeEmail(emailContent);
    setResult(analysis);

    const newItem: HistoryItem = {
      id: Date.now(),
      emailSnippet:
        emailContent.length > 80
          ? emailContent.substring(0, 80) + "..."
          : emailContent,
      riskPercentage: analysis.riskPercentage,
      timestamp: new Date(),
    };
    setHistory((prev) => [newItem, ...prev]);

    // Save to database silently
    try {
      const sessionId = generateSessionId();
      await supabase.from("analyses").insert({
        session_id: sessionId,
        email_content: emailContent,
        risk_percentage: analysis.riskPercentage,
        explanation: analysis.explanation,
        detected_keywords: analysis.detectedKeywords,
      });
    } catch {
      // Silent fail
    }

    setIsAnalyzing(false);
  };

  const getRiskColor = (pct: number) => {
    if (pct >= 80) return "text-red-500";
    if (pct >= 50) return "text-orange-500";
    if (pct >= 20) return "text-yellow-500";
    return "text-green-500";
  };

  const getRiskBg = (pct: number) => {
    if (pct >= 80) return "bg-red-500/10 border-red-500/30";
    if (pct >= 50) return "bg-orange-500/10 border-orange-500/30";
    if (pct >= 20) return "bg-yellow-500/10 border-yellow-500/30";
    return "bg-green-500/10 border-green-500/30";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <div className="relative">
            <Shield className="h-8 w-8 text-yellow-500" />
            <Mail className="absolute -bottom-1 -right-1 h-4 w-4 text-foreground" />
          </div>
          <h1 className="text-2xl font-bold">
            <span className="text-foreground">Mail</span>
            <span className="text-yellow-500">Guard</span>
          </h1>
          <Badge variant="secondary" className="ml-2 text-xs">
            AI-Powered
          </Badge>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Hero */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Phát hiện email lừa đảo bằng AI
          </h2>
          <p className="text-muted-foreground text-sm">
            Dán nội dung email đáng ngờ vào bên dưới để kiểm tra mức độ rủi ro
          </p>
        </div>

        {/* Input area */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Textarea
              placeholder="Dán nội dung email cần kiểm tra vào đây..."
              className="min-h-[180px] resize-none text-sm"
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
            />
            <Button
              onClick={handleAnalyze}
              disabled={!emailContent.trim() || isAnalyzing}
              className="w-full bg-yellow-500 text-foreground font-semibold hover:bg-yellow-400 transition-colors h-12 text-base"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="animate-spin" />
                  Đang phân tích...
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5" />
                  Phân Tích Email
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Result */}
        {result && (
          <Card className={`border ${getRiskBg(result.riskPercentage)} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Kết quả phân tích</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={`text-5xl font-bold ${getRiskColor(result.riskPercentage)}`}>
                  {result.riskPercentage}%
                </div>
                <div className="text-sm text-muted-foreground">
                  Mức độ rủi ro lừa đảo
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    result.riskPercentage >= 80
                      ? "bg-red-500"
                      : result.riskPercentage >= 50
                      ? "bg-orange-500"
                      : result.riskPercentage >= 20
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${result.riskPercentage}%` }}
                />
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {result.explanation}
              </p>
            </CardContent>
          </Card>
        )}

        {/* History */}
        {history.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Lịch sử phân tích</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHistory([])}
                className="text-muted-foreground"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Xóa
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm text-foreground truncate">
                        {item.emailSnippet}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.timestamp.toLocaleTimeString("vi-VN")}
                      </p>
                    </div>
                    <Badge
                      className={`shrink-0 ${
                        item.riskPercentage >= 80
                          ? "bg-red-500/20 text-red-500 border-red-500/30"
                          : item.riskPercentage >= 50
                          ? "bg-orange-500/20 text-orange-500 border-orange-500/30"
                          : item.riskPercentage >= 20
                          ? "bg-yellow-500/20 text-yellow-600 border-yellow-500/30"
                          : "bg-green-500/20 text-green-500 border-green-500/30"
                      }`}
                      variant="outline"
                    >
                      {item.riskPercentage}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground pb-8">
          © 2026 MailGuard — Công cụ phát hiện email lừa đảo cho sinh viên
        </p>
      </main>
    </div>
  );
};

export default Index;
