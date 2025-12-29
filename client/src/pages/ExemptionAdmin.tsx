import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, FileText, Clock, CheckCircle, XCircle, Shield, AlertTriangle, User } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

/**
 * 免除申請管理ページ（Admin専用）
 * 申請の承認・却下を行う
 */
export default function ExemptionAdmin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // ダイアログの状態
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<{
    id: number;
    householdId: string;
    year: number;
    reason: string | null;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // フィルター
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  // API からデータ取得
  const { data: applications = [], isLoading } = trpc.exemption.getApplications.useQuery(
    statusFilter === "all" ? {} : { status: statusFilter as "pending" | "approved" | "rejected" }
  );
  const { data: pendingCount = 0 } = trpc.exemption.getPendingCount.useQuery();

  // 承認 Mutation
  const approveMutation = trpc.exemption.approveApplication.useMutation({
    onSuccess: () => {
      toast.success("申請を承認しました");
      utils.exemption.getApplications.invalidate();
      utils.exemption.getPendingCount.invalidate();
    },
    onError: (error) => {
      toast.error(`承認に失敗しました: ${error.message}`);
    },
  });

  // 却下 Mutation
  const rejectMutation = trpc.exemption.rejectApplication.useMutation({
    onSuccess: () => {
      toast.success("申請を却下しました");
      utils.exemption.getApplications.invalidate();
      utils.exemption.getPendingCount.invalidate();
      setRejectDialogOpen(false);
      setSelectedApplication(null);
      setRejectReason("");
    },
    onError: (error) => {
      toast.error(`却下に失敗しました: ${error.message}`);
    },
  });

  // Admin チェック
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-light text-gray-900 mb-2">アクセス権限がありません</h1>
          <p className="text-gray-500 mb-4">このページは管理者専用です</p>
          <Button onClick={() => setLocation("/")}>トップに戻る</Button>
        </div>
      </div>
    );
  }

  // ステータスバッジ
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
            <CheckCircle className="w-3 h-3" />
            承認済み
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
            <XCircle className="w-3 h-3" />
            却下
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded">
            <Clock className="w-3 h-3" />
            審査中
          </span>
        );
    }
  };

  // 却下ダイアログを開く
  const openRejectDialog = (app: typeof selectedApplication) => {
    setSelectedApplication(app);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  // 却下を実行
  const handleReject = () => {
    if (!selectedApplication || !rejectReason.trim()) {
      toast.error("却下理由を入力してください");
      return;
    }

    rejectMutation.mutate({
      id: selectedApplication.id,
      rejectReason: rejectReason.trim(),
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setLocation("/")}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              戻る
            </Button>
            <div>
              <h1 className="text-xl font-light text-gray-900">免除申請管理</h1>
              <p className="text-sm text-gray-500">申請の承認・却下</p>
            </div>
          </div>
          {pendingCount > 0 && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-full">
              {pendingCount}件の審査待ち
            </span>
          )}
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="pt-24 pb-16 max-w-4xl mx-auto px-6">
        {/* タブ */}
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)} className="mb-6">
          <TabsList>
            <TabsTrigger value="pending" className="relative">
              審査待ち
              {pendingCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-yellow-500 text-white rounded-full">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">承認済み</TabsTrigger>
            <TabsTrigger value="rejected">却下</TabsTrigger>
            <TabsTrigger value="all">すべて</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" />
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {statusFilter === "pending" ? "審査待ちの申請はありません" : "該当する申請はありません"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <Card key={app.id} className={`border-gray-200 ${app.status === "pending" ? "border-l-4 border-l-yellow-400" : ""}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-medium flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        {app.householdId}号室 - {app.year}年度
                      </CardTitle>
                      <CardDescription>
                        申請日: {new Date(app.createdAt).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {app.version > 1 && ` (v${app.version})`}
                      </CardDescription>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">申請理由</p>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                        {app.reason || "（理由なし）"}
                      </p>
                    </div>

                    {app.status === "pending" && (
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate({ id: app.id })}
                          disabled={approveMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          承認
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openRejectDialog({
                            id: app.id,
                            householdId: app.householdId,
                            year: app.year,
                            reason: app.reason,
                          })}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          却下
                        </Button>
                      </div>
                    )}

                    {app.status === "approved" && app.approvedAt && (
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-green-600">
                          ✓ {new Date(app.approvedAt).toLocaleDateString("ja-JP")} に承認
                        </p>
                      </div>
                    )}

                    {app.status === "rejected" && app.approvedAt && (
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-red-600">
                          ✗ {new Date(app.approvedAt).toLocaleDateString("ja-JP")} に却下
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* 却下ダイアログ */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              申請を却下
            </DialogTitle>
            <DialogDescription>
              {selectedApplication?.householdId}号室の{selectedApplication?.year}年度免除申請を却下します
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-sm font-medium text-gray-600 mb-1">申請理由</p>
              <p className="text-sm text-gray-900">{selectedApplication?.reason || "（理由なし）"}</p>
            </div>

            <div className="space-y-2">
              <Label>却下理由 *</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="却下の理由を記入してください"
                rows={3}
              />
            </div>

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-700">
                  却下すると、申請者は該当年度のローテーション対象となります。
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
            >
              {rejectMutation.isPending ? "処理中..." : "却下する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
