import { Badge } from "@/components/ui/badge";

export interface LayerScore {
  id: string;
  label: string;
  weight: number;
  score: number;
  applied: boolean;
}

export interface PipelineInfo {
  path: "fast_ml" | "deep";
  layers: LayerScore[];
  formulaScore: number | null;
  llmFloorApplied: boolean;
  ml: { label: "scam" | "safe"; confidence: number; scamProbability: number; model: string } | null;
  similarSamples: { snippet: string; similarity: number }[];
  qrCodes: string[];
  findings: { ruleId: string; severity: string; description: string }[];
}

const barColor = (score: number) =>
  score > 70 ? "bg-red-500" : score > 30 ? "bg-orange-500" : "bg-green-500";

/** Per-layer scores behind the verdict, shown when the multi-layer pipeline produced it. */
const LayerBreakdown = ({ pipeline, finalScore }: { pipeline: PipelineInfo; finalScore: number }) => {
  const { path, layers, formulaScore, llmFloorApplied, ml, similarSamples, qrCodes } = pipeline;

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">🧩 Điểm theo từng lớp phân tích:</p>
        <Badge variant="outline" className="text-[10px]">
          {path === "fast_ml" ? "Kết luận nhanh từ mô hình phân loại" : "Phân tích sâu"}
        </Badge>
      </div>

      {layers.length > 0 && (
        <div className="space-y-2">
          {layers.map((layer) => (
            <div key={layer.id} className={layer.applied ? "" : "opacity-50"}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground">
                  {layer.label}{" "}
                  <span className="text-muted-foreground">({Math.round(layer.weight * 100)}%)</span>
                </span>
                <span className="text-muted-foreground">
                  {layer.applied ? `${layer.score}/100` : "không có tín hiệu"}
                </span>
              </div>
              <div className="h-1.5 w-full rounded bg-muted/50 overflow-hidden">
                <div
                  className={`h-full rounded ${layer.applied ? barColor(layer.score) : "bg-muted"}`}
                  style={{ width: `${layer.applied ? layer.score : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {path === "deep" && formulaScore !== null && (
        <p className="text-xs text-muted-foreground">
          Điểm theo công thức: <span className="font-medium text-foreground">{formulaScore}</span>.{" "}
          {llmFloorApplied
            ? `Điểm cuối là ${finalScore}, lấy theo đánh giá của mô hình ngôn ngữ vì cao hơn.`
            : `Điểm cuối là ${finalScore}.`}
        </p>
      )}

      {ml && (
        <p className="text-xs text-muted-foreground">
          🤖 Mô hình phân loại ({ml.model}):{" "}
          <span className="font-medium text-foreground">{ml.label === "scam" ? "lừa đảo" : "an toàn"}</span>, xác suất
          lừa đảo {Math.round(ml.scamProbability * 100)}%.
        </p>
      )}

      {qrCodes.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">🔳 Mã QR trong ảnh:</p>
          {qrCodes.map((code, i) => (
            <p key={i} className="bg-muted/50 rounded p-2 text-xs font-mono break-all text-muted-foreground">{code}</p>
          ))}
        </div>
      )}

      {similarSamples.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">📚 Mẫu lừa đảo tương tự trong cơ sở dữ liệu:</p>
          {similarSamples.map((sample, i) => (
            <div key={i} className="bg-orange-500/5 rounded p-2 text-xs">
              <p className="font-medium text-orange-400">Giống {Math.round(sample.similarity * 100)}%</p>
              <p className="text-muted-foreground">{sample.snippet}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LayerBreakdown;
