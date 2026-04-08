import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, ShieldX, AlertTriangle } from "lucide-react";

interface AnalysisResultProps {
  riskLevel: string;
  extractedText?: string;
  explanation: string;
  dangerousPhrases: string[];
  advice: string;
}

const AnalysisResult = ({ riskLevel, explanation, dangerousPhrases, advice, extractedText }: AnalysisResultProps) => {
  const getConfig = (level: string) => {
    switch (level) {
      case "SCAM":
        return {
          icon: ShieldX,
          color: "text-red-500",
          bg: "bg-red-500/10 border-red-500/30",
          badge: "bg-red-500/20 text-red-500 border-red-500/30",
          label: "LỪA ĐẢO",
        };
      case "SUSPICIOUS":
        return {
          icon: ShieldAlert,
          color: "text-orange-500",
          bg: "bg-orange-500/10 border-orange-500/30",
          badge: "bg-orange-500/20 text-orange-500 border-orange-500/30",
          label: "ĐÁNG NGHI",
        };
      default:
        return {
          icon: ShieldCheck,
          color: "text-green-500",
          bg: "bg-green-500/10 border-green-500/30",
          badge: "bg-green-500/20 text-green-500 border-green-500/30",
          label: "AN TOÀN",
        };
    }
  };

  const config = getConfig(riskLevel);
  const Icon = config.icon;

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
        <div className="flex items-center gap-3">
          <Icon className={`h-12 w-12 ${config.color}`} />
          <p className="text-sm text-foreground leading-relaxed flex-1">
            {explanation}
          </p>
        </div>

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
              💡 <span className="font-medium text-foreground">Lời khuyên:</span>{" "}
              {advice}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AnalysisResult;
