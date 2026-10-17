import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateSessionId, getUserId } from "@/lib/scamAnalyzer";
import ImageUpload from "@/components/ImageUpload";
import AnalysisResult from "@/components/AnalysisResult";
import { useToast } from "@/hooks/use-toast";
import { getFunctionErrorBody, getFunctionErrorMessage } from "@/lib/functionError";
import SiteHeader, { UsageText } from "@/components/SiteHeader";
import QuotaDialog from "@/components/QuotaDialog";
import { useAccount } from "@/hooks/useAccount";
import type { Usage } from "@/lib/api";
import type { PipelineInfo } from "@/components/LayerBreakdown";

interface AnalysisResponse {
  riskLevel: string;
  scamPercent: number;
  explanation: string;
  dangerousPhrases: string[];
  advice: string;
  extractedText?: string;
  verificationSummary?: string;
  urlsChecked?: number;
  suspiciousUrls?: { url: string; reasons: string[] }[];
  entitiesMentioned?: { found: string[]; category: string; verified: boolean }[];
  scamPatternsMatched?: { name: string; risk: number; keywords: string[] }[];
  engine?: "pipeline" | "builtin";
  pipeline?: PipelineInfo;
  /** Today's allowance after this analysis (VNS server only). */
  usage?: Usage;
}

const Index = () => {
  const [emailContent, setEmailContent] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [analyzedText, setAnalyzedText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const { enabled: accountsEnabled, account, setUsage, refresh } = useAccount();
  const [quotaMessage, setQuotaMessage] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!emailContent.trim() && !imageBase64) return;
    setIsAnalyzing(true);
    setResult(null);

    try {
      const sessionId = generateSessionId();
      const userId = getUserId();
      const { data, error } = await supabase.functions.invoke("analyze-content", {
        body: {
          text: emailContent.trim() || null,
          imageBase64: imageBase64 || null,
          sessionId,
          userId,
        },
      });

      if (error) throw error;
      setAnalyzedText(emailContent.trim());
      setResult(data as AnalysisResponse);
      if ((data as AnalysisResponse).usage) setUsage((data as AnalysisResponse).usage as Usage);
    } catch (err: unknown) {
      const body = await getFunctionErrorBody(err);
      if (body?.code === "QUOTA_EXCEEDED") {
        setQuotaMessage(body.error ?? "Bạn đã dùng hết lượt kiểm tra hôm nay.");
        void refresh();
        return;
      }
      console.error("Analysis error:", err);
      toast({
        title: "Lỗi phân tích",
        description: await getFunctionErrorMessage(err, "Đã xảy ra lỗi, vui lòng thử lại."),
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
      <SiteHeader />

      <main className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-foreground">BẢO VỆ NIỀM TIN TRÊN KHÔNG GIAN SỐ</h2>
          <p className="text-muted-foreground text-sm">Dán nội dung thông tin hoặc tải ảnh chụp màn hình để kiểm tra mức độ rủi ro</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <Textarea
              placeholder="Dán nội dung thông tin/ tin nhắn cần kiểm tra vào đây"
              className="min-h-[140px] resize-none text-sm"
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
            />
            <ImageUpload
              onImageSelected={(base64, preview) => { setImageBase64(base64); setImagePreview(preview); }}
              onImageRemoved={() => { setImageBase64(null); setImagePreview(null); }}
              previewUrl={imagePreview}
              disabled={isAnalyzing}
            />
            <div className="flex gap-2">
              <Button onClick={handleAnalyze} disabled={!hasInput || isAnalyzing}
                className="flex-1 bg-brand text-brand-foreground font-semibold hover:bg-brand-hover transition-colors h-12 text-base">
                {isAnalyzing ? (<><Loader2 className="animate-spin" />Đang phân tích...</>) : (<><Shield className="h-5 w-5" />Phân Tích Ngay</>)}
              </Button>
              {(emailContent || imageBase64 || result) && (
                <Button variant="outline" onClick={handleReset} disabled={isAnalyzing} className="h-12">Xóa</Button>
              )}
            </div>
            {accountsEnabled && (
              <p className="text-center text-xs text-muted-foreground">
                <UsageText />
                {!account && (
                  <>
                    {" "}· <Link to="/dang-ky" className="text-brand underline">Đăng ký miễn phí</Link> để có 10 lượt mỗi ngày
                  </>
                )}
              </p>
            )}
          </CardContent>
        </Card>

        <QuotaDialog open={quotaMessage !== null} onOpenChange={open => !open && setQuotaMessage(null)} message={quotaMessage ?? ""} />

        {result && (
          <AnalysisResult
            riskLevel={result.riskLevel}
            scamPercent={result.scamPercent}
            explanation={result.explanation}
            dangerousPhrases={result.dangerousPhrases || []}
            advice={result.advice || ""}
            extractedText={result.extractedText}
            verificationSummary={result.verificationSummary}
            urlsChecked={result.urlsChecked}
            suspiciousUrls={result.suspiciousUrls}
            entitiesMentioned={result.entitiesMentioned}
            scamPatternsMatched={result.scamPatternsMatched}
            pipeline={result.pipeline}
            analyzedText={analyzedText}
          />
        )}

        <p className="text-center text-xs text-muted-foreground pb-8">
          VnS – VIETNAM SAFE
        </p>
      </main>
    </div>
  );
};

export default Index;
