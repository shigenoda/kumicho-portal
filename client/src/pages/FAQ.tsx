import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, HelpCircle, Plus, Pencil, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

export default function FAQ() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: faqData = [], refetch } = trpc.faq.list.useQuery();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  // ダイアログ状態
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  
  // フォーム状態
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [editorName, setEditorName] = useState("");

  // Mutations
  const createMutation = trpc.edit.createFaq.useMutation({
    onSuccess: () => {
      toast.success("FAQを追加しました");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    },
  });

  const updateMutation = trpc.edit.updateFaq.useMutation({
    onSuccess: () => {
      toast.success("FAQを更新しました");
      setEditingItem(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    },
  });

  const deleteMutation = trpc.edit.deleteFaq.useMutation({
    onSuccess: () => {
      toast.success("FAQを削除しました");
      setDeleteConfirmId(null);
      refetch();
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    },
  });

  const resetForm = () => {
    setQuestion("");
    setAnswer("");
    setEditorName("");
  };

  const openEditDialog = (item: any) => {
    setQuestion(item.question);
    setAnswer(item.answer);
    setEditingItem(item);
  };

  const handleCreate = () => {
    if (!question.trim() || !answer.trim()) {
      toast.error("質問と回答を入力してください");
      return;
    }
    createMutation.mutate({
      question: question.trim(),
      answer: answer.trim(),
      editorName: editorName.trim() || user?.name || "匿名",
    });
  };

  const handleUpdate = () => {
    if (!question.trim() || !answer.trim()) {
      toast.error("質問と回答を入力してください");
      return;
    }
    updateMutation.mutate({
      id: editingItem.id,
      question: question.trim(),
      answer: answer.trim(),
      editorName: editorName.trim() || user?.name || "匿名",
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({
      id,
      editorName: user?.name || "匿名",
    });
  };

  if (!isAuthenticated) {
    return <div className="page-container flex items-center justify-center min-h-screen">ログインが必要です</div>;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <header className="bg-gradient-to-r from-pink-600 to-pink-700 text-white py-6">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <HelpCircle className="w-6 h-6" />
                FAQ
              </h1>
              <p className="text-pink-100">よくある質問</p>
            </div>
          </div>
          
          {/* 追加ボタン */}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="gap-2">
                <Plus className="w-4 h-4" />
                FAQを追加
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>FAQを追加</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium">質問</label>
                  <Input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="質問を入力..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">回答</label>
                  <Textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="回答を入力..."
                    rows={5}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">編集者名（任意）</label>
                  <Input
                    value={editorName}
                    onChange={(e) => setEditorName(e.target.value)}
                    placeholder={user?.name || "匿名"}
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="w-full"
                >
                  {createMutation.isPending ? "追加中..." : "追加する"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {faqData.length > 0 ? (
          <div className="space-y-3">
            {faqData.map((item: any) => (
              <Card
                key={item.id}
                className="overflow-hidden"
              >
                <div className="flex items-start">
                  <button
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="flex-1 p-4 sm:p-6 text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
                  >
                    <h3 className="font-semibold">{item.question}</h3>
                    <span className={`text-xl transition-transform ${expandedId === item.id ? "rotate-180" : ""}`}>
                      ▼
                    </span>
                  </button>
                  <div className="p-4 flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(item)}
                      className="h-8 w-8"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirmId(item.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {expandedId === item.id && (
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-border bg-muted/30">
                    <div className="text-muted-foreground whitespace-pre-wrap mb-4 pt-4">
                      {item.answer}
                    </div>
                    {(item.relatedRuleIds?.length > 0 || item.relatedPostIds?.length > 0) && (
                      <div className="pt-4 border-t border-border">
                        <p className="text-xs font-medium text-muted-foreground mb-2">根拠:</p>
                        <ul className="space-y-1 text-xs text-blue-600">
                          {item.relatedRuleIds?.map((id: number) => (
                            <li key={`rule-${id}`}>• ルール #{id}</li>
                          ))}
                          {item.relatedPostIds?.map((id: number) => (
                            <li key={`post-${id}`}>• 年度ログ #{id}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">FAQがまだ登録されていません</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              最初のFAQを追加
            </Button>
          </Card>
        )}
      </main>

      {/* 編集ダイアログ */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>FAQを編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">質問</label>
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="質問を入力..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">回答</label>
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="回答を入力..."
                rows={5}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">編集者名（任意）</label>
              <Input
                value={editorName}
                onChange={(e) => setEditorName(e.target.value)}
                placeholder={user?.name || "匿名"}
                className="mt-1"
              />
            </div>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
              className="w-full"
            >
              {updateMutation.isPending ? "更新中..." : "更新を保存"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>FAQを削除</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">このFAQを削除してもよろしいですか？この操作は取り消せません。</p>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              className="flex-1"
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deleteMutation.isPending}
              className="flex-1"
            >
              {deleteMutation.isPending ? "削除中..." : "削除する"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
