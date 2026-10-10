import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { getFunctionErrorMessage, getFunctionErrorStatus } from "@/lib/functionError";
import { describeAdminError } from "@/lib/adminError";
import {
  Shield, Users, BarChart3, Loader2, ImageIcon, FileText, Lock, UserCheck, RefreshCw,
  Hash, Percent, Type, ThumbsUp, ThumbsDown,
} from "lucide-react";

interface ScanRow {
  id: string;
  created_at: string;
  session_id: string;
  type: string;
  content_text: string | null;
  image_url: string | null;
  risk_level: string;
  ai_result: string;
}

interface Stats {
  uniqueSessions: number;
  totalScans: number;
  textScans: number;
  imageScans: number;
  uniqueUsers: number;
  returnUsers: number;
  totalAnalyses: number;
  avgScamPercent: number;
  totalCharsAnalyzed: number;
  returningSessions: number;
  correctFeedback: number;
  incorrectFeedback: number;
}

const Admin = () => {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [scans, setScans] = useState<ScanRow[]>([]);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("admin-data", {
        body: { password },
      });
      if (fnError) throw fnError;
      if (!data?.stats) {
        setError("Máy chủ trả về dữ liệu không đúng định dạng.");
        setLoading(false);
        return;
      }
      setStats(data.stats);
      setScans(data.scans || []);
      setAuthenticated(true);
    } catch (err) {
      const status = getFunctionErrorStatus(err);
      // 503 comes with the reason (for example: no admin password set on the server).
      setError(status === 503 ? await getFunctionErrorMessage(err, describeAdminError(status)) : describeAdminError(status));
    }
    setLoading(false);
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "SCAM":
        return <Badge variant="outline" className="bg-red-500/20 text-red-500">SCAM</Badge>;
      case "SUSPICIOUS":
        return <Badge variant="outline" className="bg-orange-500/20 text-orange-500">SUSPICIOUS</Badge>;
      default:
        return <Badge variant="outline" className="bg-green-500/20 text-green-500">SAFE</Badge>;
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <Lock className="h-10 w-10 mx-auto text-brand mb-2" />
            <CardTitle>Admin Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input type="password" placeholder="Nhập mật khẩu admin..."
              value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleLogin} disabled={!password || loading}
              className="w-full bg-brand text-brand-foreground hover:bg-brand-hover">
              {loading ? <Loader2 className="animate-spin" /> : "Đăng nhập"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <Shield className="h-6 w-6 text-brand" />
          <h1 className="text-xl font-bold text-foreground">VnS Admin</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Stats row 1 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <UserCheck className="h-8 w-8 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Người dùng</p>
                <p className="text-2xl font-bold text-foreground">{stats?.uniqueUsers ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <RefreshCw className="h-8 w-8 text-teal-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Quay lại</p>
                <p className="text-2xl font-bold text-foreground">{stats?.returnUsers ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <BarChart3 className="h-8 w-8 text-brand shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Tổng lượt</p>
                <p className="text-2xl font-bold text-foreground">{stats?.totalAnalyses ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Percent className="h-8 w-8 text-orange-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">TB Scam %</p>
                <p className="text-2xl font-bold text-foreground">{stats?.avgScamPercent ?? 0}%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Type className="h-8 w-8 text-blue-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Tổng ký tự</p>
                <p className="text-2xl font-bold text-foreground">{(stats?.totalCharsAnalyzed ?? 0).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Hash className="h-8 w-8 text-purple-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Returning Sessions</p>
                <p className="text-2xl font-bold text-foreground">{stats?.returningSessions ?? 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feedback stats */}
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <ThumbsUp className="h-8 w-8 text-green-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Chính xác</p>
                <p className="text-2xl font-bold text-foreground">{stats?.correctFeedback ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <ThumbsDown className="h-8 w-8 text-red-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Không chính xác</p>
                <p className="text-2xl font-bold text-foreground">{stats?.incorrectFeedback ?? 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scans table */}
        <Card>
          <CardHeader>
            <CardTitle>Log kiểm tra</CardTitle>
          </CardHeader>
          <CardContent>
            {scans.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Chưa có dữ liệu</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Session</TableHead>
                      <TableHead>Nội dung</TableHead>
                      <TableHead>Ảnh</TableHead>
                      <TableHead className="text-right">Kết quả</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scans.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {new Date(row.created_at).toLocaleString("vi-VN")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {row.type === "image" ? "🖼️ Ảnh" : "📝 Text"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono max-w-[80px] truncate">
                          {row.session_id?.substring(0, 8)}
                        </TableCell>
                        <TableCell className="max-w-[250px] truncate text-xs">
                          {row.content_text || "—"}
                        </TableCell>
                        <TableCell>
                          {row.image_url ? (
                            <a href={row.image_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-primary underline">Xem ảnh</a>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right">{getRiskBadge(row.risk_level)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
