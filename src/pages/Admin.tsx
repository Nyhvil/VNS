import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, Users, BarChart3, Loader2, ImageIcon, FileText, Lock, UserCheck, RefreshCw,
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
      if (data?.error) {
        setError("Sai mật khẩu");
        setLoading(false);
        return;
      }
      setStats(data.stats);
      setScans(data.scans || []);
      setAuthenticated(true);
    } catch {
      setError("Sai mật khẩu hoặc lỗi hệ thống");
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
            <Lock className="h-10 w-10 mx-auto text-yellow-500 mb-2" />
            <CardTitle>Admin Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Nhập mật khẩu admin..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              onClick={handleLogin}
              disabled={!password || loading}
              className="w-full bg-yellow-500 text-foreground hover:bg-yellow-400"
            >
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
          <Shield className="h-6 w-6 text-yellow-500" />
          <h1 className="text-xl font-bold text-foreground">MailGuard Admin</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Stats */}
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
              <BarChart3 className="h-8 w-8 text-yellow-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Tổng lượt kiểm tra</p>
                <p className="text-2xl font-bold text-foreground">{stats?.totalScans ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <FileText className="h-8 w-8 text-blue-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Kiểm tra text</p>
                <p className="text-2xl font-bold text-foreground">{stats?.textScans ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <ImageIcon className="h-8 w-8 text-purple-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Kiểm tra ảnh</p>
                <p className="text-2xl font-bold text-foreground">{stats?.imageScans ?? 0}</p>
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
              <p className="text-muted-foreground text-sm text-center py-8">
                Chưa có dữ liệu
              </p>
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
                            <a
                              href={row.image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary underline"
                            >
                              Xem ảnh
                            </a>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {getRiskBadge(row.risk_level)}
                        </TableCell>
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
