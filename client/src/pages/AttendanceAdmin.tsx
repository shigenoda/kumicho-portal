import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Check, X, HelpCircle, Bell, Mail } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

export default function AttendanceAdmin() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const eventId = parseInt(params.id || "0");
  const { user } = useAuth();

  const { data: event, isLoading: eventLoading } = trpc.attendance.getEvent.useQuery({ id: eventId });
  const { data: responses } = trpc.attendance.getResponses.useQuery({ eventId });
  const { data: stats } = trpc.attendance.getResponseStats.useQuery({ eventId });
  const { data: notResponded } = trpc.attendance.getNotResponded.useQuery({ eventId });
  const { data: households } = trpc.leaderRotation.getHouseholds.useQuery();
  const { data: emails } = trpc.householdEmail.list.useQuery();

  const sendReminders = trpc.attendance.sendReminders.useMutation({
    onSuccess: (data) => {
      toast.success(`リマインダーを送信しました（${data.sentCount}件成功、${data.failedCount}件メール未登録）`);
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">この機能は管理者のみ利用できます</div>
      </div>
    );
  }

  if (eventLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">イベントが見つかりません</div>
      </div>
    );
  }

  const emailMap = new Map(emails?.map((e) => [e.householdId, e.email]) || []);
  const responseMap = new Map(responses?.map((r) => [r.householdId, r]) || []);

  const responseIcon = (response: string) => {
    switch (response) {
      case "attend":
        return <Check className="h-4 w-4 text-green-600" />;
      case "absent":
        return <X className="h-4 w-4 text-red-600" />;
      case "undecided":
        return <HelpCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const responseLabel = (response: string) => {
    switch (response) {
      case "attend":
        return "参加";
      case "absent":
        return "欠席";
      case "undecided":
        return "未定";
      default:
        return response;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/attendance")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                戻る
              </Button>
              <div>
                <h1 className="text-xl font-semibold">{event.title} - 回答一覧</h1>
                <p className="text-sm text-muted-foreground">管理者用</p>
              </div>
            </div>
            <Button
              onClick={() => sendReminders.mutate({ eventId })}
              disabled={sendReminders.isPending || !notResponded?.length}
            >
              <Bell className="h-4 w-4 mr-2" />
              未回答者にリマインダー送信
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* 統計 */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">全住戸</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold">{stats.responded}</div>
                <div className="text-sm text-muted-foreground">回答済み</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-green-600">{stats.attend}</div>
                <div className="text-sm text-muted-foreground">参加</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-red-600">{stats.absent}</div>
                <div className="text-sm text-muted-foreground">欠席</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-orange-600">{stats.notResponded}</div>
                <div className="text-sm text-muted-foreground">未回答</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 回答一覧テーブル */}
        <Card>
          <CardHeader>
            <CardTitle>全住戸の回答状況</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>住戸</TableHead>
                  <TableHead>回答</TableHead>
                  <TableHead>回答者</TableHead>
                  <TableHead>備考</TableHead>
                  <TableHead>回答日時</TableHead>
                  <TableHead>メール</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {households?.map((h: { householdId: string }) => {
                  const response = responseMap.get(h.householdId);
                  const email = emailMap.get(h.householdId);
                  return (
                    <TableRow key={h.householdId}>
                      <TableCell className="font-medium">{h.householdId}号室</TableCell>
                      <TableCell>
                        {response ? (
                          <div className="flex items-center gap-2">
                            {responseIcon(response.response)}
                            <span>{responseLabel(response.response)}</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-orange-600">未回答</Badge>
                        )}
                      </TableCell>
                      <TableCell>{response?.respondentName || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">{response?.notes || "-"}</TableCell>
                      <TableCell>
                        {response?.respondedAt
                          ? new Date(response.respondedAt).toLocaleString("ja-JP")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {email ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <Mail className="h-3 w-3" />
                            <span className="text-xs">登録済み</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">未登録</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
