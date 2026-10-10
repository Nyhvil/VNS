import AnalyzeResultDetailPage from "@/components/pages/analyze_result_detail";

export default async function AnalyzeResultDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AnalyzeResultDetailPage analyzeResultId={id} />;
}
