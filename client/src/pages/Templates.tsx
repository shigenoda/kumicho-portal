import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Copy, Download, Plus, Pencil, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "通知", label: "通知" },
  { value: "依頼", label: "依頼" },
  { value: "案内", label: "案内" },
  { value: "報告", label: "報告" },
  { value: "その他", label: "その他" },
];

export default function Templates() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: templates = [], refetch } = trpc.templates.list.useQuery();
  const [copiedId, setCopiedId] = useState<number | null>(null);
  
  // ダイアログ状態
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  
  // フォーム状態
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [body, setBody] = useState("");
  const [editorName, setEditorName] = useState("");

  // Mutations
  const createMutation = trpc.edit.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("テンプレートを追加しました");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    },
  });

  const updateMutation = trpc.edit.updateTemplate.useMutation({
    onSuccess: () => {
      toast.success("テンプレートを更新しました");
      setEditingItem(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    },
  });

  const deleteMutation = trpc.edit.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("テンプレートを削除しました");
      setDeleteConfirmId(null);
      refetch();
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    },
  });

  const resetForm = () => {
    setTitle("");
    setCategory("");
    setBody("");
    setEditorName("");
  };

  const openEditDialog = (item: any) => {
    setTitle(item.title);
    setCategory(item.category);
    setBody(item.body);
    setEditingItem(item);
  };

  const handleCreate = () => {
    if (!title.trim() || !category || !body.trim()) {
      toast.error("タイトル、カテゴリ、本文を入力してください");
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      category,
      body: body.trim(),
      editorName: editorName.trim() || user?.name || "匿名",
    });
  };

  const handleUpdate = () => {
    if (!title.trim() || !category || !body.trim()) {
      toast.error("タイトル、カテゴリ、本文を入力してください");
      return;
    }
    updateMutation.mutate({
      id: editingItem.id,
      title: title.trim(),
      category,
      body: body.trim(),
      editorName: editorName.trim() || user?.name || "匿名",
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({
      id,
      editorName: user?.name || "匿名",
    });
  };

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("コピーしました");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (template: any) => {
    const blob = new Blob([template.body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("ダウンロードしました");
  };

  if (!isAuthenticated) {
    return <div className="page-container flex items-center justify-center min-h-screen">ログインが必要です</div>;
  }

  const categories = Array.from(new Set(templates.map((t: any) => t.category)));

  return (
    <div className="page-container">
      {/* Header */}
      <header className="bg-background border-b border-border sticky top-0 z-50">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground">テンプレ置き場</h1>
              <p className="text-sm text-muted-foreground">文書テンプレ・通知文</p>
            </div>
          </div>
          
          {/* 追加ボタン */}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="gap-2">
                <Plus className="w-4 h-4" />
                テンプレを追加
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>テンプレートを追加</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">タイトル</label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="テンプレート名..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">カテゴリ</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="カテゴリを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">本文</label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="テンプレート本文を入力..."
                    rows={10}
                    className="mt-1 font-mono text-sm"
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
        {categories.length > 0 ? (
          <div className="space-y-8">
            {categories.map((categoryName) => {
              const categoryTemplates = templates.filter((t) => t.category === categoryName);
              return (
                <section key={categoryName}>
                  <h2 className="text-xl font-semibold mb-4 capitalize">{categoryName}</h2>
                  <div className="space-y-3">
                    {categoryTemplates.map((template) => (
                      <Card key={template.id} className="p-4 sm:p-6">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold">{template.title}</h3>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(template)}
                              className="h-8 w-8"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteConfirmId(template.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="bg-muted p-4 rounded text-sm text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto mb-3 font-mono">
                          {template.body}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopy(template.body, template.id)}
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            {copiedId === template.id ? "コピーしました" : "コピー"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(template)}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            ダウンロード
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">テンプレがまだ登録されていません</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              最初のテンプレを追加
            </Button>
          </Card>
        )}
      </main>

      {/* 編集ダイアログ */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>テンプレートを編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">タイトル</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="テンプレート名..."
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">カテゴリ</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="カテゴリを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">本文</label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="テンプレート本文を入力..."
                rows={10}
                className="mt-1 font-mono text-sm"
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
            <DialogTitle>テンプレートを削除</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">このテンプレートを削除してもよろしいですか？この操作は取り消せません。</p>
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
