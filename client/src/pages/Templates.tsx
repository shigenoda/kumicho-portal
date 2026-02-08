import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Check,
  ClipboardCopy,
  Download,
  Eye,
  FileText,
  Pencil,
  Plus,
  Tag,
  Trash2,
} from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface TemplateFormData {
  title: string;
  body: string;
  category: string;
  tags: string;
}

const emptyForm: TemplateFormData = {
  title: "",
  body: "",
  category: "",
  tags: "",
};

export default function Templates() {
  const [, setLocation] = useLocation();
  const { data: templates = [] } = trpc.data.getTemplates.useQuery();
  const utils = trpc.useUtils();

  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<any | null>(null);

  // Create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState<TemplateFormData>(emptyForm);

  // Edit dialog state
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<TemplateFormData>(emptyForm);

  // Delete confirmation dialog state
  const [deletingTemplate, setDeletingTemplate] = useState<any | null>(null);

  // Mutations
  const createMutation = trpc.data.createTemplate.useMutation({
    onSuccess: () => {
      utils.data.getTemplates.invalidate();
      setShowCreateDialog(false);
      setCreateForm(emptyForm);
    },
  });

  const updateMutation = trpc.data.updateTemplate.useMutation({
    onSuccess: () => {
      utils.data.getTemplates.invalidate();
      setEditingTemplate(null);
      setEditForm(emptyForm);
    },
  });

  const deleteMutation = trpc.data.deleteTemplate.useMutation({
    onSuccess: () => {
      utils.data.getTemplates.invalidate();
      setDeletingTemplate(null);
    },
  });

  // Group templates by category
  const categories = Array.from(new Set(templates.map((t: any) => t.category)));

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (title: string, body: string) => {
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCreate = () => {
    if (!createForm.title.trim() || !createForm.body.trim() || !createForm.category.trim()) return;
    const tags = createForm.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    createMutation.mutate({
      title: createForm.title.trim(),
      body: createForm.body.trim(),
      category: createForm.category.trim(),
      tags: tags.length > 0 ? tags : undefined,
    });
  };

  const handleEditClick = (template: any) => {
    setEditingTemplate(template);
    setEditForm({
      title: template.title,
      body: template.body,
      category: template.category,
      tags: (template.tags ?? []).join(", "),
    });
  };

  const handleUpdate = () => {
    if (!editingTemplate || !editForm.title.trim() || !editForm.body.trim() || !editForm.category.trim()) return;
    const tags = editForm.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    updateMutation.mutate({
      id: editingTemplate.id,
      title: editForm.title.trim(),
      body: editForm.body.trim(),
      category: editForm.category.trim(),
      tags: tags.length > 0 ? tags : undefined,
    });
  };

  const handleDelete = () => {
    if (!deletingTemplate) return;
    deleteMutation.mutate({ id: deletingTemplate.id });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-medium text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                テンプレート管理
              </h1>
              <p className="text-sm font-light text-gray-500 mt-1">
                文書テンプレート・通知文の管理
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Add button */}
        <div className="flex justify-end mb-8">
          <Button
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 font-light"
            onClick={() => {
              setCreateForm(emptyForm);
              setShowCreateDialog(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            テンプレートを追加
          </Button>
        </div>

        {categories.length > 0 ? (
          <div className="space-y-12">
            {categories.map((category) => {
              const categoryTemplates = templates.filter(
                (t: any) => t.category === category
              );
              return (
                <section key={category}>
                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-lg font-light text-gray-900 tracking-wide">
                      {category}
                    </h2>
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs font-light text-gray-400">
                      {categoryTemplates.length}件
                    </span>
                  </div>
                  <div className="space-y-4">
                    {categoryTemplates.map((template: any) => (
                      <Card
                        key={template.id}
                        className="border border-gray-200 shadow-none hover:border-gray-300 transition-colors"
                      >
                        <div className="p-5 sm:p-6">
                          {/* Card header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0 pr-4">
                              <h3 className="text-base font-normal text-gray-900 mb-2">
                                {template.title}
                              </h3>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  variant="secondary"
                                  className="bg-gray-100 text-gray-600 font-light text-xs border-none"
                                >
                                  {template.category}
                                </Badge>
                                {template.tags &&
                                  template.tags.length > 0 &&
                                  template.tags.map((tag: string) => (
                                    <span
                                      key={tag}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-light text-gray-500 bg-gray-50 rounded border border-gray-100"
                                    >
                                      <Tag className="w-3 h-3" />
                                      {tag}
                                    </span>
                                  ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => setViewingTemplate(template)}
                                className="p-2 hover:bg-gray-100 rounded transition-colors text-gray-400 hover:text-gray-700"
                                title="全文表示"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEditClick(template)}
                                className="p-2 hover:bg-gray-100 rounded transition-colors text-gray-400 hover:text-blue-600"
                                title="編集"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeletingTemplate(template)}
                                className="p-2 hover:bg-gray-100 rounded transition-colors text-gray-400 hover:text-red-600"
                                title="削除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Body preview */}
                          <div className="bg-gray-50 border border-gray-100 rounded p-4 text-sm font-light text-gray-600 whitespace-pre-wrap max-h-36 overflow-y-auto mb-4 leading-relaxed">
                            {template.body}
                          </div>

                          {/* Footer actions */}
                          <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-gray-200 text-gray-600 hover:bg-gray-50 font-light text-xs h-8"
                                onClick={() =>
                                  handleCopy(template.body, template.id)
                                }
                              >
                                {copiedId === template.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 mr-1 text-green-600" />
                                    <span className="text-green-600">
                                      コピー完了
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <ClipboardCopy className="w-3.5 h-3.5 mr-1" />
                                    コピー
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-gray-200 text-gray-600 hover:bg-gray-50 font-light text-xs h-8"
                                onClick={() =>
                                  handleDownload(template.title, template.body)
                                }
                              >
                                <Download className="w-3.5 h-3.5 mr-1" />
                                ダウンロード
                              </Button>
                            </div>
                            {template.updatedAt && (
                              <p className="text-xs text-gray-400 font-light">
                                最終更新:{" "}
                                {new Date(template.updatedAt).toLocaleDateString(
                                  "ja-JP"
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-light">
              テンプレートがまだ登録されていません
            </p>
            <Button
              variant="outline"
              className="mt-4 border-gray-300 text-gray-600 font-light"
              onClick={() => {
                setCreateForm(emptyForm);
                setShowCreateDialog(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              最初のテンプレートを追加
            </Button>
          </div>
        )}
      </main>

      {/* View full template dialog */}
      <Dialog
        open={viewingTemplate !== null}
        onOpenChange={(open) => {
          if (!open) setViewingTemplate(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-normal text-gray-900">
              {viewingTemplate?.title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              テンプレート全文表示
            </DialogDescription>
          </DialogHeader>
          {viewingTemplate && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="secondary"
                  className="bg-gray-100 text-gray-600 font-light text-xs border-none"
                >
                  {viewingTemplate.category}
                </Badge>
                {viewingTemplate.tags &&
                  viewingTemplate.tags.length > 0 &&
                  viewingTemplate.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-light text-gray-500 bg-gray-50 rounded border border-gray-100"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded p-5 text-sm font-light text-gray-700 whitespace-pre-wrap leading-relaxed">
                {viewingTemplate.body}
              </div>
              {viewingTemplate.updatedAt && (
                <p className="text-xs text-gray-400 font-light">
                  最終更新:{" "}
                  {new Date(viewingTemplate.updatedAt).toLocaleDateString(
                    "ja-JP"
                  )}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-200 text-gray-600 font-light"
              onClick={() => {
                if (viewingTemplate) {
                  handleCopy(viewingTemplate.body, viewingTemplate.id);
                }
              }}
            >
              {copiedId === viewingTemplate?.id ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1 text-green-600" />
                  <span className="text-green-600">コピー完了</span>
                </>
              ) : (
                <>
                  <ClipboardCopy className="w-3.5 h-3.5 mr-1" />
                  コピー
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-200 text-gray-600 font-light"
              onClick={() => {
                if (viewingTemplate) {
                  handleDownload(viewingTemplate.title, viewingTemplate.body);
                }
              }}
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              ダウンロード
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create template dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-normal text-gray-900">
              テンプレートを追加
            </DialogTitle>
            <DialogDescription className="text-sm font-light text-gray-500">
              新しい文書テンプレートを作成します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-light text-gray-700 mb-1 block">
                タイトル
              </label>
              <Input
                value={createForm.title}
                onChange={(e) =>
                  setCreateForm({ ...createForm, title: e.target.value })
                }
                placeholder="テンプレート名を入力"
                className="font-light"
              />
            </div>
            <div>
              <label className="text-sm font-light text-gray-700 mb-1 block">
                カテゴリ
              </label>
              <Input
                value={createForm.category}
                onChange={(e) =>
                  setCreateForm({ ...createForm, category: e.target.value })
                }
                placeholder="例: 通知文、議事録、申請書"
                className="font-light"
              />
            </div>
            <div>
              <label className="text-sm font-light text-gray-700 mb-1 block">
                本文
              </label>
              <Textarea
                value={createForm.body}
                onChange={(e) =>
                  setCreateForm({ ...createForm, body: e.target.value })
                }
                placeholder="テンプレートの本文を入力"
                rows={10}
                className="font-light leading-relaxed"
              />
            </div>
            <div>
              <label className="text-sm font-light text-gray-700 mb-1 block">
                タグ（カンマ区切り）
              </label>
              <Input
                value={createForm.tags}
                onChange={(e) =>
                  setCreateForm({ ...createForm, tags: e.target.value })
                }
                placeholder="例: 総会, 管理組合, 通知"
                className="font-light"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="font-light"
              onClick={() => setShowCreateDialog(false)}
            >
              キャンセル
            </Button>
            <Button
              className="font-light"
              onClick={handleCreate}
              disabled={
                createMutation.isPending ||
                !createForm.title.trim() ||
                !createForm.body.trim() ||
                !createForm.category.trim()
              }
            >
              {createMutation.isPending ? "保存中..." : "追加する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit template dialog */}
      <Dialog
        open={editingTemplate !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTemplate(null);
            setEditForm(emptyForm);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-normal text-gray-900">
              テンプレートを編集
            </DialogTitle>
            <DialogDescription className="text-sm font-light text-gray-500">
              テンプレートの内容を更新します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-light text-gray-700 mb-1 block">
                タイトル
              </label>
              <Input
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
                placeholder="テンプレート名を入力"
                className="font-light"
              />
            </div>
            <div>
              <label className="text-sm font-light text-gray-700 mb-1 block">
                カテゴリ
              </label>
              <Input
                value={editForm.category}
                onChange={(e) =>
                  setEditForm({ ...editForm, category: e.target.value })
                }
                placeholder="例: 通知文、議事録、申請書"
                className="font-light"
              />
            </div>
            <div>
              <label className="text-sm font-light text-gray-700 mb-1 block">
                本文
              </label>
              <Textarea
                value={editForm.body}
                onChange={(e) =>
                  setEditForm({ ...editForm, body: e.target.value })
                }
                placeholder="テンプレートの本文を入力"
                rows={10}
                className="font-light leading-relaxed"
              />
            </div>
            <div>
              <label className="text-sm font-light text-gray-700 mb-1 block">
                タグ（カンマ区切り）
              </label>
              <Input
                value={editForm.tags}
                onChange={(e) =>
                  setEditForm({ ...editForm, tags: e.target.value })
                }
                placeholder="例: 総会, 管理組合, 通知"
                className="font-light"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="font-light"
              onClick={() => {
                setEditingTemplate(null);
                setEditForm(emptyForm);
              }}
            >
              キャンセル
            </Button>
            <Button
              className="font-light"
              onClick={handleUpdate}
              disabled={
                updateMutation.isPending ||
                !editForm.title.trim() ||
                !editForm.body.trim() ||
                !editForm.category.trim()
              }
            >
              {updateMutation.isPending ? "保存中..." : "保存する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deletingTemplate !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingTemplate(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-normal text-gray-900">
              テンプレートを削除
            </DialogTitle>
            <DialogDescription className="text-sm font-light text-gray-500">
              この操作は取り消せません
            </DialogDescription>
          </DialogHeader>
          {deletingTemplate && (
            <p className="text-sm font-light text-gray-700">
              「{deletingTemplate.title}」を削除してもよろしいですか？
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="font-light"
              onClick={() => setDeletingTemplate(null)}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              className="font-light"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
