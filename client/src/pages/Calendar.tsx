import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChevronLeft, Calendar, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

const CATEGORIES = [
  { value: "meeting", label: "会議" },
  { value: "cleaning", label: "清掃" },
  { value: "deadline", label: "締切" },
  { value: "event", label: "行事" },
  { value: "other", label: "その他" },
];

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export default function CalendarPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: events = [], refetch } = trpc.events.list.useQuery({});
  
  // ダイアログ状態
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  
  // フォーム状態
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [editorName, setEditorName] = useState("");

  // Mutations
  const createMutation = trpc.edit.createEvent.useMutation({
    onSuccess: () => {
      toast.success("イベントを追加しました");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    },
  });

  const updateMutation = trpc.edit.updateEvent.useMutation({
    onSuccess: () => {
      toast.success("イベントを更新しました");
      setEditingEvent(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    },
  });

  const deleteMutation = trpc.edit.deleteEvent.useMutation({
    onSuccess: () => {
      toast.success("イベントを削除しました");
      setDeleteConfirmId(null);
      refetch();
    },
    onError: (error) => {
      toast.error("エラー: " + error.message);
    },
  });

  const resetForm = () => {
    setTitle("");
    setDate("");
    setCategory("");
    setNotes("");
    setChecklist([]);
    setNewChecklistItem("");
    setEditorName("");
  };

  const openEditDialog = (event: any) => {
    setTitle(event.title);
    setDate(new Date(event.date).toISOString().split('T')[0]);
    setCategory(event.category);
    setNotes(event.notes || "");
    setChecklist(event.checklist || []);
    setEditingEvent(event);
  };

  const handleCreate = () => {
    if (!title.trim() || !date || !category) {
      toast.error("タイトル、日付、カテゴリを入力してください");
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      date: new Date(date).toISOString(),
      category,
      checklist,
      notes: notes.trim() || undefined,
      editorName: editorName.trim() || user?.name || "匿名",
    });
  };

  const handleUpdate = () => {
    if (!title.trim() || !date || !category) {
      toast.error("タイトル、日付、カテゴリを入力してください");
      return;
    }
    updateMutation.mutate({
      id: editingEvent.id,
      title: title.trim(),
      date: new Date(date).toISOString(),
      category,
      checklist,
      notes: notes.trim() || undefined,
      editorName: editorName.trim() || user?.name || "匿名",
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({
      id,
      editorName: user?.name || "匿名",
    });
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setChecklist([
      ...checklist,
      { id: Date.now().toString(), text: newChecklistItem.trim(), completed: false }
    ]);
    setNewChecklistItem("");
  };

  const removeChecklistItem = (id: string) => {
    setChecklist(checklist.filter(item => item.id !== id));
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist(checklist.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  // チェックリスト更新（イベントカード内）
  const handleChecklistToggle = async (eventId: number, itemId: string, currentChecklist: ChecklistItem[]) => {
    const updatedChecklist = currentChecklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    
    try {
      await updateMutation.mutateAsync({
        id: eventId,
        checklist: updatedChecklist,
        editorName: user?.name || "匿名",
      });
    } catch {
      // Error handled by mutation
    }
  };

  const groupedByMonth = events.reduce((acc: Record<string, any[]>, event: any) => {
    const month = new Date(event.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(event);
    return acc;
  }, {});

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
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2">
                <Calendar className="w-6 h-6 text-accent" />
                年間カレンダー
              </h1>
              <p className="text-sm text-muted-foreground">行事・締切・チェックリスト</p>
            </div>
          </div>
          
          {/* 追加ボタン */}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="gap-2">
                <Plus className="w-4 h-4" />
                イベントを追加
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>イベントを追加</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium">タイトル</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="イベント名..."
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">日付</label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
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
                </div>
                <div>
                  <label className="text-sm font-medium">メモ（任意）</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="補足情報..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">チェックリスト</label>
                  <div className="mt-2 space-y-2">
                    {checklist.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 bg-muted p-2 rounded">
                        <button
                          type="button"
                          onClick={() => toggleChecklistItem(item.id)}
                          className={`w-5 h-5 rounded border flex items-center justify-center ${
                            item.completed ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                          }`}
                        >
                          {item.completed && <Check className="w-3 h-3" />}
                        </button>
                        <span className={`flex-1 text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {item.text}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeChecklistItem(item.id)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={newChecklistItem}
                        onChange={(e) => setNewChecklistItem(e.target.value)}
                        placeholder="項目を追加..."
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                      />
                      <Button type="button" variant="outline" onClick={addChecklistItem}>
                        追加
                      </Button>
                    </div>
                  </div>
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

      {/* Content */}
      <main className="container py-8 sm:py-12">
        {Object.keys(groupedByMonth).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedByMonth).map(([month, monthEvents]) => (
              <section key={month}>
                <h2 className="text-xl font-semibold text-foreground mb-4">{month}</h2>
                <div className="space-y-3">
                  {monthEvents.map((event) => (
                    <div key={event.id} className="info-card">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">{event.title}</h3>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(event)}
                              className="h-7 w-7"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteConfirmId(event.id)}
                              className="h-7 w-7 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(event.date).toLocaleDateString('ja-JP')} - {CATEGORIES.find(c => c.value === event.category)?.label || event.category}
                          </p>
                          {event.notes && (
                            <p className="text-sm text-foreground mt-2">{event.notes}</p>
                          )}
                          {event.checklist && Array.isArray(event.checklist) && event.checklist.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">チェックリスト：</p>
                              <ul className="space-y-1">
                                {event.checklist.map((item: ChecklistItem) => (
                                  <li key={item.id} className="text-sm text-foreground flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleChecklistToggle(event.id, item.id, event.checklist)}
                                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                        item.completed ? 'bg-primary border-primary text-primary-foreground' : 'border-border hover:border-primary'
                                      }`}
                                    >
                                      {item.completed && <Check className="w-3 h-3" />}
                                    </button>
                                    <span className={item.completed ? 'line-through text-muted-foreground' : ''}>
                                      {item.text}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <span className="tag-pill text-xs">{CATEGORIES.find(c => c.value === event.category)?.label || event.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">イベントがまだ登録されていません</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              最初のイベントを追加
            </Button>
          </div>
        )}
      </main>

      {/* 編集ダイアログ */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>イベントを編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">タイトル</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="イベント名..."
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">日付</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1"
                />
              </div>
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
            </div>
            <div>
              <label className="text-sm font-medium">メモ（任意）</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="補足情報..."
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">チェックリスト</label>
              <div className="mt-2 space-y-2">
                {checklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 bg-muted p-2 rounded">
                    <button
                      type="button"
                      onClick={() => toggleChecklistItem(item.id)}
                      className={`w-5 h-5 rounded border flex items-center justify-center ${
                        item.completed ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                      }`}
                    >
                      {item.completed && <Check className="w-3 h-3" />}
                    </button>
                    <span className={`flex-1 text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {item.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(item.id)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    placeholder="項目を追加..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                  />
                  <Button type="button" variant="outline" onClick={addChecklistItem}>
                    追加
                  </Button>
                </div>
              </div>
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
            <DialogTitle>イベントを削除</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">このイベントを削除してもよろしいですか？この操作は取り消せません。</p>
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
