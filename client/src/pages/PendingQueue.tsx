import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  Plus,
  CheckCircle,
  Trash2,
  Edit2,
  ArrowLeft,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

type Status = "pending" | "resolved" | "transferred";
type Priority = "low" | "medium" | "high";
type TabFilter = "all" | Status;

interface FormState {
  title: string;
  description: string;
  toWhom: string;
  priority: Priority;
}

const emptyForm: FormState = {
  title: "",
  description: "",
  toWhom: "",
  priority: "medium",
};

const priorityLabel: Record<Priority, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

const priorityColor: Record<Priority, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-gray-100 text-gray-700",
};

const statusLabel: Record<Status, string> = {
  pending: "未対応",
  resolved: "解決済み",
  transferred: "次年度引き継ぎ",
};

const statusColor: Record<Status, string> = {
  pending: "bg-orange-100 text-orange-800",
  resolved: "bg-green-100 text-green-800",
  transferred: "bg-blue-100 text-blue-800",
};

const tabs: { key: TabFilter; label: string; filterStatus?: Status }[] = [
  { key: "all", label: "全て" },
  { key: "pending", label: "未対応", filterStatus: "pending" },
  { key: "resolved", label: "解決済み", filterStatus: "resolved" },
  { key: "transferred", label: "次年度引き継ぎ", filterStatus: "transferred" },
];

export default function PendingQueue() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Data
  const { data: items = [], isLoading } =
    trpc.data.getPendingQueueAll.useQuery();

  // Mutations
  const createMutation = trpc.data.createPendingQueueItem.useMutation({
    onSuccess: () => {
      utils.data.getPendingQueueAll.invalidate();
      setShowAddForm(false);
      setAddForm(emptyForm);
    },
  });
  const updateMutation = trpc.data.updatePendingQueueItem.useMutation({
    onSuccess: () => {
      utils.data.getPendingQueueAll.invalidate();
      setEditingId(null);
      setEditForm(emptyForm);
    },
  });
  const deleteMutation = trpc.data.deletePendingQueueItem.useMutation({
    onSuccess: () => {
      utils.data.getPendingQueueAll.invalidate();
    },
  });

  // UI state
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);

  // Filtered items
  const filteredItems =
    activeTab === "all"
      ? items
      : items.filter((item) => item.status === activeTab);

  // Counts per tab
  const counts: Record<TabFilter, number> = {
    all: items.length,
    pending: items.filter((i) => i.status === "pending").length,
    resolved: items.filter((i) => i.status === "resolved").length,
    transferred: items.filter((i) => i.status === "transferred").length,
  };

  // Handlers
  const handleCreate = () => {
    if (!addForm.title.trim() || !addForm.toWhom.trim()) return;
    createMutation.mutate({
      title: addForm.title.trim(),
      description: addForm.description.trim(),
      toWhom: addForm.toWhom.trim(),
      priority: addForm.priority,
    });
  };

  const handleStartEdit = (item: (typeof items)[number]) => {
    setEditingId(item.id);
    setEditForm({
      title: item.title,
      description: item.description ?? "",
      toWhom: item.toWhom,
      priority: (item.priority as Priority) ?? "medium",
    });
  };

  const handleSaveEdit = () => {
    if (editingId === null) return;
    if (!editForm.title.trim() || !editForm.toWhom.trim()) return;
    updateMutation.mutate({
      id: editingId,
      title: editForm.title.trim(),
      description: editForm.description.trim(),
      toWhom: editForm.toWhom.trim(),
      priority: editForm.priority,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const handleStatusChange = (id: number, status: Status) => {
    updateMutation.mutate({ id, status });
  };

  const handleDelete = (id: number) => {
    if (!confirm("この項目を削除しますか?")) return;
    deleteMutation.mutate({ id });
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Inline form component
  const renderForm = (
    form: FormState,
    setForm: (f: FormState) => void,
    onSubmit: () => void,
    onCancel: () => void,
    submitLabel: string,
    isSubmitting: boolean,
  ) => (
    <div className="border border-gray-200 rounded-lg p-6 space-y-4 bg-gray-50/50">
      <div className="space-y-2">
        <label className="text-sm font-light text-gray-600">タイトル *</label>
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="タイトルを入力"
          className="bg-white"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-light text-gray-600">内容</label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="詳細を入力"
          className="bg-white"
          rows={3}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-light text-gray-600">宛先 *</label>
          <Input
            value={form.toWhom}
            onChange={(e) => setForm({ ...form, toWhom: e.target.value })}
            placeholder="例: 管理会社、市役所"
            className="bg-white"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-light text-gray-600">優先度</label>
          <Select
            value={form.priority}
            onValueChange={(v) => setForm({ ...form, priority: v as Priority })}
          >
            <SelectTrigger className="w-full bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">低</SelectItem>
              <SelectItem value="medium">中</SelectItem>
              <SelectItem value="high">高</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={onSubmit}
          disabled={isSubmitting || !form.title.trim() || !form.toWhom.trim()}
          className="bg-gray-900 text-white hover:bg-gray-800"
        >
          {submitLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel} className="text-gray-600">
          キャンセル
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-600 hover:bg-gray-100"
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-light text-gray-900">
                返信待ちキュー
              </h1>
              <p className="text-sm text-gray-500 font-light mt-1">
                外部からの返信を待っている事項
              </p>
            </div>
          </div>
          {!showAddForm && (
            <Button
              onClick={() => {
                setShowAddForm(true);
                setEditingId(null);
              }}
              className="bg-gray-900 text-white hover:bg-gray-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              追加
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-200 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-light transition-colors relative ${
                activeTab === tab.key
                  ? "text-gray-900"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab.label}
              <span
                className={`ml-1.5 text-xs ${
                  activeTab === tab.key ? "text-gray-600" : "text-gray-400"
                }`}
              >
                {counts[tab.key]}
              </span>
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-px bg-gray-900" />
              )}
            </button>
          ))}
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="mb-8">
            {renderForm(
              addForm,
              setAddForm,
              handleCreate,
              () => {
                setShowAddForm(false);
                setAddForm(emptyForm);
              },
              "追加する",
              createMutation.isPending,
            )}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-24">
            <p className="text-gray-400 font-light">読み込み中...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredItems.length === 0 && (
          <div className="text-center py-24">
            <p className="text-gray-400 font-light">
              該当する項目はありません
            </p>
          </div>
        )}

        {/* Items list */}
        {!isLoading && filteredItems.length > 0 && (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors"
              >
                {editingId === item.id ? (
                  /* Edit mode */
                  renderForm(
                    editForm,
                    setEditForm,
                    handleSaveEdit,
                    handleCancelEdit,
                    "保存する",
                    updateMutation.isPending,
                  )
                ) : (
                  /* Display mode */
                  <div>
                    {/* Top row: badges */}
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-light rounded ${
                          statusColor[item.status as Status] ??
                          statusColor.pending
                        }`}
                      >
                        {item.status === "pending" && (
                          <Clock className="w-3 h-3" />
                        )}
                        {item.status === "resolved" && (
                          <CheckCircle className="w-3 h-3" />
                        )}
                        {item.status === "transferred" && (
                          <ArrowRight className="w-3 h-3" />
                        )}
                        {statusLabel[item.status as Status] ??
                          statusLabel.pending}
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-light rounded ${
                          priorityColor[
                            (item.priority as Priority) ?? "medium"
                          ]
                        }`}
                      >
                        {priorityLabel[(item.priority as Priority) ?? "medium"]}
                      </span>
                      <span className="inline-block px-2 py-0.5 text-xs font-light rounded bg-gray-100 text-gray-600">
                        宛先: {item.toWhom}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-light text-gray-900 mb-1">
                      {item.title}
                    </h3>

                    {/* Description */}
                    {item.description && (
                      <p className="text-sm font-light text-gray-500 mb-3 whitespace-pre-wrap">
                        {item.description}
                      </p>
                    )}

                    {/* Footer: date + actions */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                      <time className="text-xs text-gray-400 font-light">
                        {formatDate(item.createdAt)}
                      </time>

                      <div className="flex items-center gap-2">
                        {/* Quick status actions (only show for non-resolved/non-transferred) */}
                        {item.status === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                handleStatusChange(item.id, "resolved")
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-light text-green-700 hover:bg-green-50 rounded transition-colors"
                              title="解決済みにする"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              解決
                            </button>
                            <button
                              onClick={() =>
                                handleStatusChange(item.id, "transferred")
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-light text-blue-700 hover:bg-blue-50 rounded transition-colors"
                              title="次年度に引き継ぐ"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                              次年度引き継ぎ
                            </button>
                          </>
                        )}

                        {/* Reopen for resolved/transferred */}
                        {item.status !== "pending" && (
                          <button
                            onClick={() =>
                              handleStatusChange(item.id, "pending")
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-light text-orange-700 hover:bg-orange-50 rounded transition-colors"
                            title="未対応に戻す"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            未対応に戻す
                          </button>
                        )}

                        {/* Edit */}
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="編集"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
