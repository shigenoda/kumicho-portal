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
import { trpc } from "@/lib/trpc";
import { ArrowLeft, FileText, Clock, CheckCircle, XCircle, Plus, AlertTriangle, Info } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

/**
 * 免除申請ページ
 * 住民が組長就任の免除を申請できる
 */
export default function ExemptionApplication() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // ダイアログの状態
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedHousehold, setSelectedHousehold] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [reason, setReason] = useState("");

  // API からデータ取得
  const { data: applications = [], isLoading: applicationsLoading } = trpc.exemption.getApplications.useQuery({});
  const { data: households = [], isLoading: householdsLoading } = trpc.leaderRotation.getHouseholds.useQuery();

  // 申請作成 Mutation
  const createMutation = trpc.exemption.createApplication.useMutation({
    onSuccess: () => {
      toast.success("免除申請を送信しました。管理者の承認をお待ちください。");
      utils.exemption.getApplications.invalidate();
      setCreateDialogOpen(false);
      setSelectedHousehold("");
      setSelectedYear("");
      setReason("");
    },
    onError: (error) => {
      toast.error(`申請に失敗しました: ${error.message}`);
    },
  });

  const isLoading = applicationsLoading || householdsLoading;

  // 現在の年度と来年度
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1, currentYear + 2];

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

  // 申請を送信
  const handleSubmit = () => {
    if (!selectedHousehold || !selectedYear || !reason.trim()) {
      toast.error("すべての項目を入力してください");
      return;
    }

    createMutation.mutate({
      householdId: selectedHousehold,
      year: parseInt(selectedYear),
      reason: reason.trim(),
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
              <h1 className="text-xl font-light text-gray-900">免除申請</h1>
              <p className="text-sm text-gray-500">組長就任の免除を申請</p>
            </div>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新規申請
          </Button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="pt-24 pb-16 max-w-4xl mx-auto px-6">
        {/* 説明 */}
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">免除申請について</p>
              <ul className="space-y-1 leading-relaxed">
                <li>• 健康上の理由や家庭の事情により組長就任が困難な場合に申請できます</li>
                <li>• 申請は管理者（現組長）が審査し、承認または却下されます</li>
                <li>• 承認された場合、該当年度の組長ローテーションから免除されます</li>
                <li>• 免除は年度ごとに申請が必要です（毎年度末に見直し）</li>
              </ul>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" />
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">まだ免除申請はありません</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              新規申請を作成
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-light text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-900" />
              申請履歴
            </h2>
            {applications.map((app) => (
              <Card key={app.id} className="border-gray-200">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-medium">
                        {app.householdId}号室 - {app.year}年度
                      </CardTitle>
                      <CardDescription>
                        申請日: {new Date(app.createdAt).toLocaleDateString("ja-JP")}
                        {app.version > 1 && ` (v${app.version})`}
                      </CardDescription>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-600">申請理由</p>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{app.reason}</p>
                    </div>
                    {app.status === "approved" && app.approvedAt && (
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-green-600">
                          ✓ {new Date(app.approvedAt).toLocaleDateString("ja-JP")} に承認されました
                        </p>
                      </div>
                    )}
                    {app.status === "rejected" && app.approvedAt && (
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-red-600">
                          ✗ {new Date(app.approvedAt).toLocaleDateString("ja-JP")} に却下されました
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

      {/* 新規申請ダイアログ */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>免除申請</DialogTitle>
            <DialogDescription>
              組長就任の免除を申請します。申請は管理者が審査します。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>住戸番号 *</Label>
              <Select value={selectedHousehold} onValueChange={setSelectedHousehold}>
                <SelectTrigger>
                  <SelectValue placeholder="住戸を選択" />
                </SelectTrigger>
                <SelectContent>
                  {households.map((h) => (
                    <SelectItem key={h.householdId} value={h.householdId}>
                      {h.householdId}号室
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>申請年度 *</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="年度を選択" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}年度
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>申請理由 *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="免除を希望する理由を記入してください（例：健康上の理由、転勤予定、家庭の事情など）"
                rows={4}
              />
              <p className="text-xs text-gray-500">
                ※ 個人情報は記載しないでください。詳細は管理者に直接お伝えください。
              </p>
            </div>

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-700">
                  申請は管理者（現組長）が審査します。承認されると、該当年度のローテーションから免除されます。
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || !selectedHousehold || !selectedYear || !reason.trim()}
            >
              {createMutation.isPending ? "送信中..." : "申請を送信"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
