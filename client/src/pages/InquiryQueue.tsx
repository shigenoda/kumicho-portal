import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, MessageSquare, AlertCircle, Send } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";


export default function InquiryQueue() {
  const [, navigate] = useLocation();
  const { data: user } = trpc.auth.me.useQuery();
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [replyContent, setReplyContent] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: pendingInquiries, refetch } = trpc.inquiry.getPending.useQuery({ year });
  const { data: inquiryDetail } = trpc.inquiry.getDetail.useQuery(
    { id: selectedInquiry?.id },
    { enabled: !!selectedInquiry }
  );

  const replyMutation = trpc.inquiry.reply.useMutation({
    onSuccess: () => {
      toast.success("返信を送信しました");
      setReplyContent("");
      setSelectedInquiry(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const categoryLabels: Record<string, string> = {
    participation: "参加確認",
    opinion: "意見募集",
    repair: "修繕依頼",
    other: "その他",
  };

  const handleReply = () => {
    if (!selectedInquiry || !replyContent.trim()) return;

    replyMutation.mutate({
      inquiryId: selectedInquiry.id,
      repliedByHouseholdId: user?.name || "admin",
      replyContent,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/member")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>
            <div>
              <h1 className="text-xl font-semibold">返信待ちキュー</h1>
              <p className="text-sm text-muted-foreground">未返信の問い合わせを一覧で管理</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 問い合わせ一覧 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>未返信の問い合わせ</CardTitle>
                    <CardDescription>
                      {pendingInquiries?.length || 0}件の未返信問い合わせ
                    </CardDescription>
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {pendingInquiries?.length || 0}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(!pendingInquiries || pendingInquiries.length === 0) ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">未返信の問い合わせはありません</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingInquiries.map((inquiry: any) => (
                      <button
                        key={inquiry.id}
                        onClick={() => setSelectedInquiry(inquiry)}
                        className={`w-full text-left p-4 rounded-lg border transition-colors ${
                          selectedInquiry?.id === inquiry.id
                            ? "bg-blue-50 border-blue-300"
                            : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{inquiry.householdId}号室</span>
                              <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                                {categoryLabels[inquiry.category]}
                              </span>
                            </div>
                            <p className="font-semibold text-sm truncate">{inquiry.title}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(inquiry.createdAt).toLocaleDateString("ja-JP")}
                            </p>
                          </div>
                          <div className="text-xs text-red-600 font-medium">未返信</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 問い合わせ詳細・返信フォーム */}
          <div className="lg:col-span-1">
            {selectedInquiry ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">問い合わせ詳細</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 問い合わせ情報 */}
                  <div className="space-y-3 pb-4 border-b">
                    <div>
                      <Label className="text-xs text-muted-foreground">住戸</Label>
                      <p className="font-semibold">{selectedInquiry.householdId}号室</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">年度</Label>
                      <p className="font-semibold">{selectedInquiry.year}年度</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">カテゴリ</Label>
                      <p className="font-semibold">
                        {categoryLabels[selectedInquiry.category]}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">タイトル</Label>
                      <p className="font-semibold text-sm">{selectedInquiry.title}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">内容</Label>
                      <p className="text-sm whitespace-pre-wrap">{selectedInquiry.content}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">送信日時</Label>
                      <p className="text-sm">
                        {new Date(selectedInquiry.createdAt).toLocaleString("ja-JP")}
                      </p>
                    </div>
                  </div>

                  {/* 返信フォーム */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">返信内容</Label>
                    <Textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="返信内容を入力してください"
                      rows={4}
                      className="text-sm"
                    />
                    <Button
                      onClick={handleReply}
                      disabled={!replyContent.trim() || replyMutation.isPending}
                      className="w-full"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {replyMutation.isPending ? "送信中..." : "返信を送信"}
                    </Button>
                  </div>

                  {/* 注意事項 */}
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-700">
                        返信を送信すると、問い合わせ元の住戸にメール通知が届きます。
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground text-sm">
                    左側から問い合わせを選択してください
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* 返信確認ダイアログ */}
      <Dialog open={!!selectedInquiry && replyMutation.isPending} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>返信を送信中...</DialogTitle>
          </DialogHeader>
          <p>しばらくお待ちください。</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
