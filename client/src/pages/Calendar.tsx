import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Calendar,
  Pencil,
  Trash2,
  Plus,
  Check,
  Square,
  CheckSquare,
  ListChecks,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

const CATEGORIES = ["定例", "行事", "清掃", "会議", "締切", "その他"] as const;

const JAPANESE_MONTHS: Record<number, string> = {
  0: "1月",
  1: "2月",
  2: "3月",
  3: "4月",
  4: "5月",
  5: "6月",
  6: "7月",
  7: "8月",
  8: "9月",
  9: "10月",
  10: "11月",
  11: "12月",
};

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface EventFormData {
  title: string;
  date: string;
  category: string;
  notes: string;
}

const emptyForm: EventFormData = {
  title: "",
  date: "",
  category: "定例",
  notes: "",
};

export default function CalendarPage() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: events = [] } = trpc.data.getEvents.useQuery();

  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<EventFormData>(emptyForm);

  // Checklist add state (inline on event cards)
  const [checklistInputId, setChecklistInputId] = useState<number | null>(null);
  const [newChecklistText, setNewChecklistText] = useState("");

  // Checklist state for create/edit dialog
  const [dialogChecklist, setDialogChecklist] = useState<ChecklistItem[]>([]);
  const [dialogChecklistText, setDialogChecklistText] = useState("");

  // Mutations
  const createEvent = trpc.data.createEvent.useMutation({
    onSuccess: () => {
      utils.data.getEvents.invalidate();
      setShowAddDialog(false);
      setFormData(emptyForm);
      setDialogChecklist([]);
      setDialogChecklistText("");
    },
  });

  const updateEvent = trpc.data.updateEvent.useMutation({
    onSuccess: () => {
      utils.data.getEvents.invalidate();
      setShowEditDialog(false);
      setEditingId(null);
      setFormData(emptyForm);
      setDialogChecklist([]);
      setDialogChecklistText("");
    },
  });

  const deleteEvent = trpc.data.deleteEvent.useMutation({
    onSuccess: () => {
      utils.data.getEvents.invalidate();
    },
  });

  // Group events by year-month
  const groupedByMonth = events.reduce(
    (acc: Record<string, typeof events>, event: any) => {
      const d = new Date(event.date);
      const year = d.getFullYear();
      const month = d.getMonth();
      const key = `${year}-${month}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(event);
      return acc;
    },
    {}
  );

  // Sort groups chronologically
  const sortedGroups = Object.entries(groupedByMonth).sort(([a], [b]) => {
    const [aYear, aMonth] = a.split("-").map(Number);
    const [bYear, bMonth] = b.split("-").map(Number);
    return aYear !== bYear ? aYear - bYear : aMonth - bMonth;
  });

  // Handlers
  const handleAdd = () => {
    setFormData(emptyForm);
    setDialogChecklist([]);
    setDialogChecklistText("");
    setShowAddDialog(true);
  };

  const handleCreateSubmit = () => {
    if (!formData.title.trim() || !formData.date) return;
    createEvent.mutate({
      title: formData.title.trim(),
      date: new Date(formData.date).toISOString(),
      category: formData.category,
      notes: formData.notes.trim() || undefined,
      checklist: dialogChecklist.length > 0 ? dialogChecklist : undefined,
    });
  };

  const handleEditClick = (event: any) => {
    setEditingId(event.id);
    setFormData({
      title: event.title,
      date: new Date(event.date).toISOString().split("T")[0],
      category: event.category,
      notes: event.notes || "",
    });
    setDialogChecklist(
      Array.isArray(event.checklist) ? [...event.checklist] : []
    );
    setDialogChecklistText("");
    setShowEditDialog(true);
  };

  const handleEditSubmit = () => {
    if (!editingId || !formData.title.trim() || !formData.date) return;
    updateEvent.mutate({
      id: editingId,
      title: formData.title.trim(),
      date: new Date(formData.date).toISOString(),
      category: formData.category,
      notes: formData.notes.trim() || undefined,
      checklist: dialogChecklist,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("このイベントを削除しますか？")) {
      deleteEvent.mutate({ id });
    }
  };

  const handleChecklistToggle = (event: any, itemId: string) => {
    const checklist: ChecklistItem[] = (event.checklist || []).map(
      (item: ChecklistItem) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    updateEvent.mutate({ id: event.id, checklist });
  };

  const handleAddChecklistItem = (event: any) => {
    if (!newChecklistText.trim()) return;
    const checklist: ChecklistItem[] = [
      ...(event.checklist || []),
      {
        id: crypto.randomUUID(),
        text: newChecklistText.trim(),
        completed: false,
      },
    ];
    updateEvent.mutate(
      { id: event.id, checklist },
      {
        onSuccess: () => {
          utils.data.getEvents.invalidate();
          setNewChecklistText("");
          setChecklistInputId(null);
        },
      }
    );
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString("ja-JP", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  };

  // Event form dialog (shared between add and edit)
  const renderFormDialog = (
    open: boolean,
    onOpenChange: (v: boolean) => void,
    title: string,
    onSubmit: () => void,
    isLoading: boolean
  ) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg font-light text-gray-900">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-light text-gray-700 mb-1 block">
              タイトル
            </label>
            <Input
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="イベント名を入力"
            />
          </div>
          <div>
            <label className="text-sm font-light text-gray-700 mb-1 block">
              日付
            </label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-sm font-light text-gray-700 mb-1 block">
              カテゴリ
            </label>
            <Select
              value={formData.category}
              onValueChange={(value) =>
                setFormData({ ...formData, category: value })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="カテゴリを選択" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-light text-gray-700 mb-1 block">
              メモ
            </label>
            <Textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="補足メモ（任意）"
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm font-light text-gray-700 mb-1 block flex items-center gap-1">
              <ListChecks className="w-3.5 h-3.5" />
              チェックリスト
            </label>
            {dialogChecklist.length > 0 && (
              <ul className="space-y-1.5 mb-2">
                {dialogChecklist.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 px-2 py-1 bg-gray-50 rounded text-sm font-light text-gray-700"
                  >
                    <span>{item.text}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDialogChecklist((prev) =>
                          prev.filter((i) => i.id !== item.id)
                        )
                      }
                      className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center gap-2">
              <Input
                value={dialogChecklistText}
                onChange={(e) => setDialogChecklistText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!dialogChecklistText.trim()) return;
                    setDialogChecklist((prev) => [
                      ...prev,
                      {
                        id: crypto.randomUUID(),
                        text: dialogChecklistText.trim(),
                        completed: false,
                      },
                    ]);
                    setDialogChecklistText("");
                  }
                }}
                placeholder="項目を入力して追加"
                className="h-8 text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  if (!dialogChecklistText.trim()) return;
                  setDialogChecklist((prev) => [
                    ...prev,
                    {
                      id: crypto.randomUUID(),
                      text: dialogChecklistText.trim(),
                      completed: false,
                    },
                  ]);
                  setDialogChecklistText("");
                }}
                disabled={!dialogChecklistText.trim()}
                className="p-1.5 text-gray-500 hover:text-gray-700 disabled:text-gray-300 border border-gray-200 rounded hover:bg-gray-50 transition-colors flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="font-light"
          >
            キャンセル
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!formData.title.trim() || !formData.date || isLoading}
            className="font-light"
          >
            {isLoading ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/")}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-500"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-light text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                年間カレンダー
              </h1>
              <p className="text-sm font-light text-gray-400 mt-0.5">
                行事・締切・チェックリスト
              </p>
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-light text-gray-700 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            新規追加
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {events.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400 font-light">
              イベントがまだ登録されていません
            </p>
            <button
              onClick={handleAdd}
              className="mt-4 text-sm text-gray-500 underline underline-offset-4 font-light hover:text-gray-700 transition-colors"
            >
              最初のイベントを追加
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {sortedGroups.map(([key, monthEvents]) => {
              const [year, month] = key.split("-").map(Number);
              const monthLabel = `${year}年 ${JAPANESE_MONTHS[month]}`;

              // Sort events within the month by date
              const sorted = [...monthEvents].sort(
                (a: any, b: any) =>
                  new Date(a.date).getTime() - new Date(b.date).getTime()
              );

              return (
                <section key={key}>
                  <h2 className="text-lg font-light text-gray-900 mb-4 pb-2 border-b border-gray-100">
                    {monthLabel}
                  </h2>
                  <div className="space-y-3">
                    {sorted.map((event: any) => (
                      <div
                        key={event.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-normal text-gray-900">
                                {event.title}
                              </h3>
                              <span className="inline-block px-2 py-0.5 text-xs font-light text-gray-500 bg-gray-100 rounded">
                                {event.category}
                              </span>
                            </div>
                            <p className="text-sm font-light text-gray-400 mt-1">
                              {formatDate(event.date)}
                            </p>
                            {event.notes && (
                              <p className="text-sm font-light text-gray-600 mt-2 whitespace-pre-wrap">
                                {event.notes}
                              </p>
                            )}

                            {/* Checklist */}
                            {event.checklist &&
                              Array.isArray(event.checklist) &&
                              event.checklist.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <p className="text-xs font-light text-gray-400 mb-2 flex items-center gap-1">
                                    <ListChecks className="w-3 h-3" />
                                    チェックリスト
                                  </p>
                                  <ul className="space-y-1.5">
                                    {event.checklist.map(
                                      (item: ChecklistItem) => (
                                        <li
                                          key={item.id}
                                          className="flex items-center gap-2 group"
                                        >
                                          <button
                                            onClick={() =>
                                              handleChecklistToggle(
                                                event,
                                                item.id
                                              )
                                            }
                                            className="flex items-center gap-2 text-sm font-light text-left hover:bg-gray-50 rounded px-1 py-0.5 -mx-1 transition-colors w-full"
                                          >
                                            {item.completed ? (
                                              <CheckSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                            ) : (
                                              <Square className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                            )}
                                            <span
                                              className={
                                                item.completed
                                                  ? "line-through text-gray-400"
                                                  : "text-gray-700"
                                              }
                                            >
                                              {item.text}
                                            </span>
                                          </button>
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}

                            {/* Add checklist item */}
                            {checklistInputId === event.id ? (
                              <div className="mt-2 flex items-center gap-2">
                                <Input
                                  value={newChecklistText}
                                  onChange={(e) =>
                                    setNewChecklistText(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleAddChecklistItem(event);
                                    }
                                    if (e.key === "Escape") {
                                      setChecklistInputId(null);
                                      setNewChecklistText("");
                                    }
                                  }}
                                  placeholder="項目を入力..."
                                  className="h-7 text-sm"
                                  autoFocus
                                />
                                <button
                                  onClick={() =>
                                    handleAddChecklistItem(event)
                                  }
                                  disabled={!newChecklistText.trim()}
                                  className="p-1 text-gray-500 hover:text-gray-700 disabled:text-gray-300 transition-colors"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setChecklistInputId(event.id);
                                  setNewChecklistText("");
                                }}
                                className="mt-2 text-xs font-light text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                                チェック項目を追加
                              </button>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleEditClick(event)}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              title="編集"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(event.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded transition-colors"
                              title="削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
      </main>

      {/* Add Event Dialog */}
      {renderFormDialog(
        showAddDialog,
        setShowAddDialog,
        "イベントを追加",
        handleCreateSubmit,
        createEvent.isPending
      )}

      {/* Edit Event Dialog */}
      {renderFormDialog(
        showEditDialog,
        setShowEditDialog,
        "イベントを編集",
        handleEditSubmit,
        updateEvent.isPending
      )}
    </div>
  );
}
