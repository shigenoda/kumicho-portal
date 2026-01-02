import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, HelpCircle, Pencil, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function FAQ() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { data: faqData = [], refetch } = trpc.data.getFAQ.useQuery();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<{ question: string; answer: string } | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const updateFAQMutation = trpc.data.updateFAQ.useMutation();
  const deleteFAQMutation = trpc.data.deleteFAQ.useMutation();

  if (!isAuthenticated) {
    return (
      <div className="page-container flex items-center justify-center min-h-screen">
        ログインが必要です
      </div>
    );
  }

  const handleEditClick = (item: any) => {
    setEditingId(item.id);
    setEditingData({ question: item.question, answer: item.answer });
    setShowDialog(true);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editingData) return;

    updateFAQMutation.mutate(
      {
        id: editingId,
        question: editingData.question,
        answer: editingData.answer,
      },
      {
        onSuccess: () => {
          setShowDialog(false);
          setEditingId(null);
          setEditingData(null);
          refetch();
        },
        onError: (error: any) => {
          alert("更新に失敗しました: " + error.message);
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("このFAQを削除しますか？")) {
      deleteFAQMutation.mutate(
        { id },
        {
          onSuccess: () => {
            refetch();
          },
          onError: (error: any) => {
            alert("削除に失敗しました: " + error.message);
          },
        }
      );
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <header
        className="bg-cover bg-center text-white py-6 relative"
        style={{ backgroundImage: "url('/greenpia-yaizu.jpg')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50" />
        <div className="container flex items-center gap-4 relative">
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
            <p className="text-white/70">よくある質問</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {faqData.length > 0 ? (
          <div className="space-y-3">
            {faqData.map((item: any) => (
              <Card key={item.id} className="overflow-hidden relative">
                <div className="flex items-start justify-between p-4 sm:p-6 hover:bg-muted/50 transition-colors">
                  <button
                    onClick={() =>
                      setExpandedId(expandedId === item.id ? null : item.id)
                    }
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{item.question}</h3>
                      <span
                        className={`text-xl transition-transform ml-4 flex-shrink-0 ${
                          expandedId === item.id ? "rotate-180" : ""
                        }`}
                      >
                        ▼
                      </span>
                    </div>
                  </button>
                  <div className="flex gap-2 ml-4 flex-shrink-0">
                    <button
                      onClick={() => handleEditClick(item)}
                      className="p-2 hover:bg-gray-100 rounded transition-colors text-blue-600"
                      title="編集"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 hover:bg-gray-100 rounded transition-colors text-red-600"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {expandedId === item.id && (
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-border bg-muted/30">
                    <div className="text-muted-foreground whitespace-pre-wrap mb-4">
                      {item.answer}
                    </div>
                    {(item.relatedRuleIds?.length > 0 ||
                      item.relatedPostIds?.length > 0) && (
                      <div className="pt-4 border-t border-border">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          根拠:
                        </p>
                        <ul className="space-y-1 text-xs text-blue-600">
                          {item.relatedRuleIds?.map((id: number) => (
                            <li key={`rule-${id}`}>
                              <a
                                href={`/rules#rule-${id}`}
                                className="hover:underline"
                              >
                                • ルール #{id}
                              </a>
                            </li>
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
            <p className="text-muted-foreground">
              FAQがまだ登録されていません
            </p>
          </Card>
        )}
      </main>

      {/* Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>FAQ を編集</DialogTitle>
          </DialogHeader>
          {editingData && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">質問</label>
                <Input
                  value={editingData.question}
                  onChange={(e) =>
                    setEditingData({
                      ...editingData,
                      question: e.target.value,
                    })
                  }
                  placeholder="質問を入力"
                />
              </div>
              <div>
                <label className="text-sm font-medium">回答</label>
                <Textarea
                  value={editingData.answer}
                  onChange={(e) =>
                    setEditingData({
                      ...editingData,
                      answer: e.target.value,
                    })
                  }
                  placeholder="回答を入力"
                  rows={6}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSaveEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
