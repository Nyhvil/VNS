import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateSessionId } from "@/lib/scamAnalyzer";
import ImageUpload from "@/components/ImageUpload";
import AnalysisResult from "@/components/AnalysisResult";
import { useToast } from "@/hooks/use-toast";

interface AnalysisResponse {
  riskLevel: string;
  explanation: string;
  dangerousPhrases: string[];
  advice: string;
  extractedText?: string;
}

const Index = () => {
  const [emailContent, setEmailContent] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!emailContent.trim() && !imageBase64) return;
    setIsAnalyzing(true);
    setResult(null);

    try {
      const sessionId = generateSessionId();
      const { data, error } = await supabase.functions.invoke("analyze-content", {
        body: {
          text: emailContent.trim() || null,
          imageBase64: imageBase64 || null,
          sessionId,
        },
      });

      if (error) throw error;
      setResult(data as AnalysisResponse);
    } catch (err: any) {
      console.error("Analysis error:", err);
      toast({
        title: "Lỗi phân tích",
        description: err?.message || "Đã xảy ra lỗi, vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setEmailContent("");
    setImageBase64(null);
    setImagePreview(null);
    setResult(null);
  };

  const hasInput = emailContent.trim() || imageBase64;

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
            Phát hiện lừa đảo bằng AI
          </h2>
          <p className="text-muted-foreground text-sm">
            Dán nội dung email hoặc tải ảnh chụp màn hình để kiểm tra mức độ rủi ro
          </p>
        </div>

        {/* Input area */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Textarea
              placeholder="Dán nội dung email/tin nhắn cần kiểm tra vào đây..."
              className="min-h-[140px] resize-none text-sm"
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
            />

            <ImageUpload
              onImageSelected={(base64, preview) => {
                setImageBase64(base64);
                setImagePreview(preview);
              }}
              onImageRemoved={() => {
                setImageBase64(null);
                setImagePreview(null);
              }}
              previewUrl={imagePreview}
              disabled={isAnalyzing}
            />

            <div className="flex gap-2">
              <Button
                onClick={handleAnalyze}
                disabled={!hasInput || isAnalyzing}
                className="flex-1 bg-yellow-500 text-foreground font-semibold hover:bg-yellow-400 transition-colors h-12 text-base"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Đang phân tích...
                  </>
                ) : (
                  <>
                    <Shield className="h-5 w-5" />
                    Phân Tích Ngay
                  </>
                )}
              </Button>
              {(emailContent || imageBase64 || result) && (
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isAnalyzing}
                  className="h-12"
                >
                  Xóa
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Result */}
        {result && (
          <AnalysisResult
            riskLevel={result.riskLevel}
            explanation={result.explanation}
            dangerousPhrases={result.dangerousPhrases || []}
            advice={result.advice || ""}
          />
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground pb-8">
          © 2026 MailGuard — Công cụ phát hiện lừa đảo cho người Việt
        </p>
      </main>
    </div>
  );
};

export default Index;
