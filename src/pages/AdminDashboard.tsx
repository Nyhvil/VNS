import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Users, BarChart3, Loader2 } from "lucide-react";

interface AnalysisRow {
  id: string;
  created_at: string;
  session_id: string;
  email_content: string;
  risk_percentage: number;
  explanation: string;
  feedback?: string;
}

const AdminDashboard = () => {
  const [data, setData] = useState<AnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: responseData, error } = await supabase.functions.invoke(
          "get-analyses"
        );
        if (error) throw error;
        setData(responseData || []);
      } catch (err) {
        console.error("Failed to fetch analyses");
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const uniqueSessions = new Set(data.map((d) => d.session_id)).size;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <Shield className="h-6 w-6 text-brand" />
          <h1 className="text-xl font-bold text-foreground">
            VnS Admin
          </h1>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <Users className="h-10 w-10 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Tổng phiên</p>
                <p className="text-3xl font-bold text-foreground">
                  {uniqueSessions}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <BarChart3 className="h-10 w-10 text-brand" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Tổng lượt phân tích
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {data.length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <Shield className="h-10 w-10 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Rủi ro cao (≥80%)
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {data.filter((d) => d.risk_percentage >= 80).length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Tất cả lượt phân tích</CardTitle>
          </CardHeader>
          <CardContent>
            {data.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                Chưa có dữ liệu
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Session ID</TableHead>
                    <TableHead>Nội dung email</TableHead>
                    <TableHead className="text-right">Rủi ro</TableHead>
                    <TableHead className="text-center">Phản hồi người dùng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(row.created_at).toLocaleString("vi-VN")}
                      </TableCell>
                      <TableCell className="text-xs font-mono max-w-[100px] truncate">
                        {row.session_id?.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-sm">
                        {row.email_content}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            row.risk_percentage >= 80
                              ? "bg-red-500/20 text-red-500"
                              : row.risk_percentage >= 50
                              ? "bg-orange-500/20 text-orange-500"
                              : "bg-green-500/20 text-green-500"
                          }
                        >
                          {row.risk_percentage}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {row.feedback ? (
                          <Badge
                            variant="outline"
                            className={
                              row.feedback === "correct"
                                ? "bg-green-500/20 text-green-500 border-green-500/30"
                                : "bg-red-500/20 text-red-500 border-red-500/30"
                            }
                          >
                            {row.feedback === "correct" ? "Thích" : "Không thích"}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Chưa phản hồi</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;
