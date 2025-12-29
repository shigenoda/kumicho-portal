import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Copy, Eye, EyeOff, Lock, Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "連絡先", label: "連絡先" },
  { value: "鍵・保管", label: "鍵・保管" },
  { value: "重要書類", label: "重要書類" },
  { value: "金銭関連", label: "金銭関連" },
  { value: "その他", label: "その他" },
];

/**
 * Private Vault ページ - Admin限定秘匿情報管理
 * マスキング表示がデフォルト、チェックボックスで一時表示
 * 監査ログに記録
 */
export default function Vault() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [revealed, setRevealed] = useState<Record<number, string | null>>({});
  const [copied, setCopied] = useState<Record<number, boolean>>({});
  
  // ダイアログ状態
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  
  // フォーム状態
  const [category, setCategory] = useState("");
  const [key, setKey] = useState("");
  const [maskedValue, setMaskedValue] = useState("");
  const [actualValue, setActualValue] = useState("");
  const [classification, setClassification] = useState<"internal" | "confidential">("confidential");

  // API からデータ取得
  const { data: vaultEntries = [], isLoading, refetch } = trpc.vault.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  // Reveal mutation
  const revealMutation = trpc.vault.reveal.useMutation({
    onSuccess: (data: { actualValue: string }, variables: { id: number }) => {
      setRevealed({ ...revealed, [variables.id]: data.actualValue });
    },
  });

  // Copy mutation
  const copyMutation = trpc.vault.copy.useMutation();

  // Create mutation
  const createMutation = trpc.vault.create.useMutation({
    onSuccess: () => {
      toast.success("エントリを追加しました");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    },
  });

  // Update mutation
  const updateMutation = trpc.vault.update.useMutation({
    onSuccess: () => {
      toast.success("エントリを更新しました");
      setEditingEntry(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = trpc.vault.delete.useMutation({
    onSuccess: () => {
      toast.success("エントリを削除しました");
      setDeleteConfirmId(null);
      refetch();
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    },
  });

  const resetForm = () => {
    setCategory("");
    setKey("");
    setMaskedValue("");
    setActualValue("");
    setClassification("confidential");
  };

  const openEditDialog = (entry: any) => {
    setCategory(entry.category);
    setKey(entry.key);
    setMaskedValue(entry.maskedValue);
    setActualValue(""); // 実際の値は空で開始（セキュリティのため）
    setClassification(entry.classification);
    setEditingEntry(entry);
  };

  const handleCreate = () => {
    if (!category || !key.trim() || !maskedValue.trim() || !actualValue.trim()) {
      toast.error("すべての項目を入力してください");
      return;
    }
    createMutation.mutate({
      category,
      key: key.trim(),
      maskedValue: maskedValue.trim(),
      actualValue: actualValue.trim(),
      classification,
    });
  };

  const handleUpdate = () => {
    if (!category || !key.trim() || !maskedValue.trim()) {
      toast.error("カテゴリ、キー、マスク値を入力してください");
      return;
    }
    const updateData: any = {
      id: editingEntry.id,
      category,
      key: key.trim(),
      maskedValue: maskedValue.trim(),
      classification,
    };
    // 実際の値が入力されている場合のみ更新
    if (actualValue.trim()) {
      updateData.actualValue = actualValue.trim();
    }
    updateMutation.mutate(updateData);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id });
  };

  // Admin限定チェック
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-light text-gray-900 mb-2">アクセス拒否</h1>
          <p className="text-gray-600 mb-6">
            Private Vault は Admin のみアクセス可能です
          </p>
          <Button
            onClick={() => setLocation("/")}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white"
          >
            トップに戻る
          </Button>
        </div>
      </div>
    );
  }

  const handleReveal = (id: number) => {
    if (revealed[id]) {
      // 既に表示中なら隠す
      setRevealed({ ...revealed, [id]: null });
    } else {
      // API を呼んで実際の値を取得
      revealMutation.mutate({ id });
    }
  };

  const handleCopy = async (id: number, maskedVal: string) => {
    // 表示中の値があればそれをコピー、なければ API を呼んで取得
    let valueToCopy = revealed[id];
    if (!valueToCopy) {
      const result = await copyMutation.mutateAsync({ id });
      valueToCopy = result.actualValue;
    }
    
    navigator.clipboard.writeText(valueToCopy || maskedVal);
    setCopied({ ...copied, [id]: true });
    setTimeout(() => setCopied({ ...copied, [id]: false }), 2000);
  };

  // カテゴリ一覧を動的に取得
  const categories = Array.from(new Set(vaultEntries.map((e) => e.category)));

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-light text-gray-900">Private Vault</h1>
          <div className="flex items-center gap-4">
            {/* 追加ボタン */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button variant="default" className="gap-2">
                  <Plus className="w-4 h-4" />
                  エントリを追加
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>秘匿情報を追加</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium">カテゴリ</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="選択..." />
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
                  <div>
                    <label className="text-sm font-medium">キー（項目名）</label>
                    <Input
                      value={key}
                      onChange={(e) => setKey(e.target.value)}
                      placeholder="例：管理会社電話番号"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">マスク値（表示用）</label>
                    <Input
                      value={maskedValue}
                      onChange={(e) => setMaskedValue(e.target.value)}
                      placeholder="例：****-****-****"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">通常表示される値（マスキング）</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">実際の値</label>
                    <Textarea
                      value={actualValue}
                      onChange={(e) => setActualValue(e.target.value)}
                      placeholder="例：03-1234-5678"
                      rows={3}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">「表示」ボタンで確認できる実際の値</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">機密レベル</label>
                    <Select value={classification} onValueChange={(v) => setClassification(v as "internal" | "confidential")}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">内部情報</SelectItem>
                        <SelectItem value="confidential">機密情報</SelectItem>
                      </SelectContent>
                    </Select>
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
            
            <Button
              onClick={() => setLocation("/")}
              variant="ghost"
              className="text-gray-600 hover:text-gray-900"
            >
              ← トップに戻る
            </Button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="pt-24 pb-16 max-w-7xl mx-auto px-6">
        {/* 警告 */}
        <div className="mb-8 p-4 border border-red-200 bg-red-50 rounded">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">
              <p className="font-medium mb-1">秘匿情報の取扱注意</p>
              <p className="leading-relaxed">
                このセクションの情報は Admin
                限定です。アクセスと操作はすべて監査ログに記録されます。個人情報の取扱に注意してください。
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : vaultEntries.length === 0 ? (
          <div className="text-center py-12">
            <Lock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">秘匿情報がまだ登録されていません</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              最初のエントリを追加
            </Button>
          </div>
        ) : (
          /* カテゴリ別表示 */
          <div className="space-y-12">
            {categories.map((categoryName) => {
              const items = vaultEntries.filter((item) => item.category === categoryName);
              if (items.length === 0) return null;

              return (
                <section key={categoryName}>
                  <h2 className="text-xl font-light text-gray-900 mb-6">{categoryName}</h2>
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 border border-gray-200 rounded hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-sm font-medium text-gray-900">
                                {item.key}
                              </h3>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                item.classification === "confidential" 
                                  ? "bg-red-100 text-red-700" 
                                  : "bg-yellow-100 text-yellow-700"
                              }`}>
                                {item.classification === "confidential" ? "機密" : "内部"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="text-sm bg-gray-100 px-3 py-2 rounded font-mono text-gray-600">
                                {revealed[item.id] || item.maskedValue}
                              </code>
                              <button
                                onClick={() => handleReveal(item.id)}
                                disabled={revealMutation.isPending}
                                className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                                title={revealed[item.id] ? "隠す" : "表示"}
                              >
                                {revealed[item.id] ? (
                                  <EyeOff className="w-4 h-4 text-gray-600" />
                                ) : (
                                  <Eye className="w-4 h-4 text-gray-600" />
                                )}
                              </button>
                              <button
                                onClick={() => handleCopy(item.id, item.maskedValue)}
                                disabled={copyMutation.isPending}
                                className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                                title="コピー"
                              >
                                <Copy
                                  className={`w-4 h-4 ${
                                    copied[item.id]
                                      ? "text-green-600"
                                      : "text-gray-600"
                                  }`}
                                />
                              </button>
                              <button
                                onClick={() => openEditDialog(item)}
                                className="p-2 hover:bg-gray-100 rounded transition-colors"
                                title="編集"
                              >
                                <Pencil className="w-4 h-4 text-gray-600" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(item.id)}
                                className="p-2 hover:bg-gray-100 rounded transition-colors"
                                title="削除"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                            {copied[item.id] && (
                              <p className="text-xs text-green-600 mt-2">
                                コピーしました（監査ログに記録）
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* 注記 */}
        <div className="mt-16 p-6 bg-gray-50 rounded border border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            このセクションについて
          </h3>
          <ul className="text-sm text-gray-600 space-y-2 leading-relaxed">
            <li>
              • すべてのアクセス・表示・コピー・編集・削除操作は監査ログに記録されます
            </li>
            <li>
              • 秘匿情報は Admin のみアクセス可能です
            </li>
            <li>
              • マスキング表示がデフォルトです。表示ボタンで一時的に確認できます
            </li>
            <li>
              • 個人情報の取扱に注意してください
            </li>
          </ul>
        </div>
      </main>

      {/* 編集ダイアログ */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>秘匿情報を編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">カテゴリ</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="選択..." />
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
            <div>
              <label className="text-sm font-medium">キー（項目名）</label>
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="例：管理会社電話番号"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">マスク値（表示用）</label>
              <Input
                value={maskedValue}
                onChange={(e) => setMaskedValue(e.target.value)}
                placeholder="例：****-****-****"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">実際の値（変更する場合のみ入力）</label>
              <Textarea
                value={actualValue}
                onChange={(e) => setActualValue(e.target.value)}
                placeholder="空欄の場合は変更しません"
                rows={3}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">セキュリティのため、現在の値は表示されません</p>
            </div>
            <div>
              <label className="text-sm font-medium">機密レベル</label>
              <Select value={classification} onValueChange={(v) => setClassification(v as "internal" | "confidential")}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">内部情報</SelectItem>
                  <SelectItem value="confidential">機密情報</SelectItem>
                </SelectContent>
              </Select>
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
            <DialogTitle>エントリを削除</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">この秘匿情報を削除してもよろしいですか？この操作は取り消せません。削除操作は監査ログに記録されます。</p>
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
