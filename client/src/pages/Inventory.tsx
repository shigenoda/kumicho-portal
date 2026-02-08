import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  ArrowLeft,
  Package,
  Pencil,
  Trash2,
  Plus,
  MapPin,
  Hash,
  Wrench,
  Tag,
  CalendarCheck,
  X,
} from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

const CONDITIONS = ["良好", "使用可", "要修理", "廃棄予定"] as const;

type ConditionType = (typeof CONDITIONS)[number];

const conditionColor: Record<ConditionType, string> = {
  "良好": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "使用可": "bg-blue-50 text-blue-700 border-blue-200",
  "要修理": "bg-amber-50 text-amber-700 border-amber-200",
  "廃棄予定": "bg-red-50 text-red-700 border-red-200",
};

interface ItemFormData {
  name: string;
  qty: number;
  location: string;
  condition: string;
  notes: string;
  tags: string[];
}

const emptyForm: ItemFormData = {
  name: "",
  qty: 1,
  location: "",
  condition: "",
  notes: "",
  tags: [],
};

export default function Inventory() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: inventory = [] } = trpc.data.getInventory.useQuery();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: number } | null>(null);
  const [formData, setFormData] = useState<ItemFormData>(emptyForm);
  const [tagInput, setTagInput] = useState("");

  const createMutation = trpc.data.createInventoryItem.useMutation({
    onSuccess: () => {
      utils.data.getInventory.invalidate();
      setShowAddDialog(false);
      resetForm();
    },
  });

  const updateMutation = trpc.data.updateInventoryItem.useMutation({
    onSuccess: () => {
      utils.data.getInventory.invalidate();
      setEditingItem(null);
      resetForm();
    },
  });

  const deleteMutation = trpc.data.deleteInventoryItem.useMutation({
    onSuccess: () => {
      utils.data.getInventory.invalidate();
    },
  });

  function resetForm() {
    setFormData(emptyForm);
    setTagInput("");
  }

  function openAddDialog() {
    resetForm();
    setShowAddDialog(true);
  }

  function openEditDialog(item: any) {
    setFormData({
      name: item.name ?? "",
      qty: item.qty ?? 1,
      location: item.location ?? "",
      condition: item.condition ?? "",
      notes: item.notes ?? "",
      tags: item.tags ?? [],
    });
    setTagInput("");
    setEditingItem({ id: item.id });
  }

  function handleAddTag() {
    const trimmed = tagInput.trim();
    if (trimmed && !formData.tags.includes(trimmed)) {
      setFormData({ ...formData, tags: [...formData.tags, trimmed] });
    }
    setTagInput("");
  }

  function handleRemoveTag(tag: string) {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  }

  function handleCreate() {
    if (!formData.name.trim() || !formData.location.trim()) return;
    createMutation.mutate({
      name: formData.name.trim(),
      qty: formData.qty,
      location: formData.location.trim(),
      condition: formData.condition || undefined,
      notes: formData.notes.trim() || undefined,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
    });
  }

  function handleUpdate() {
    if (!editingItem || !formData.name.trim() || !formData.location.trim()) return;
    updateMutation.mutate({
      id: editingItem.id,
      name: formData.name.trim(),
      qty: formData.qty,
      location: formData.location.trim(),
      condition: formData.condition || undefined,
      notes: formData.notes.trim() || undefined,
      tags: formData.tags,
    });
  }

  function handleDelete(id: number) {
    if (confirm("この備品を削除しますか？")) {
      deleteMutation.mutate({ id });
    }
  }

  function formatDate(date: string | Date | null | undefined): string {
    if (!date) return "";
    return new Date(date).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  const isFormValid = formData.name.trim() !== "" && formData.location.trim() !== "";

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation("/")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-light text-gray-900 flex items-center gap-3">
                <Package className="w-5 h-5 text-gray-400" />
                倉庫・備品台帳
              </h1>
              <p className="text-sm text-gray-400 font-light mt-1">
                数量・保管場所・状態の管理
              </p>
            </div>
            <Button
              onClick={openAddDialog}
              variant="outline"
              className="gap-2 text-sm font-light border-gray-200"
            >
              <Plus className="w-4 h-4" />
              新規登録
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {inventory.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory.map((item: any) => (
              <Card
                key={item.id}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow bg-white"
              >
                {/* Card Header: name + actions */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-base font-medium text-gray-900 leading-tight pr-2">
                    {item.name}
                  </h3>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEditDialog(item)}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-400 hover:text-gray-600"
                      title="編集"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-400 hover:text-red-500"
                      title="削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Photo */}
                {item.photo && (
                  <img
                    src={item.photo}
                    alt={item.name}
                    className="w-full h-36 object-cover rounded-md mb-3 border border-gray-100"
                  />
                )}

                {/* Quantity badge */}
                <div className="flex items-center gap-2 mb-3">
                  <Badge
                    variant="secondary"
                    className="bg-gray-100 text-gray-700 border-0 font-light"
                  >
                    <Hash className="w-3 h-3 mr-1" />
                    {item.qty}個
                  </Badge>
                  {item.condition && (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs rounded-md border font-light ${
                        conditionColor[item.condition as ConditionType] ??
                        "bg-gray-50 text-gray-600 border-gray-200"
                      }`}
                    >
                      <Wrench className="w-3 h-3 mr-1" />
                      {item.condition}
                    </span>
                  )}
                </div>

                {/* Location */}
                <div className="flex items-center gap-1.5 text-sm text-gray-500 font-light mb-2">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {item.location}
                </div>

                {/* Last checked */}
                {item.lastCheckedAt && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 font-light mb-2">
                    <CalendarCheck className="w-3.5 h-3.5 text-gray-400" />
                    最終棚卸: {formatDate(item.lastCheckedAt)}
                  </div>
                )}

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {item.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-500 text-xs rounded border border-gray-200 font-light"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {item.notes && (
                  <p className="text-xs text-gray-400 font-light mt-3 pt-3 border-t border-gray-100 leading-relaxed">
                    {item.notes}
                  </p>
                )}

                {/* Updated at */}
                {item.updatedAt && (
                  <p className="text-xs text-gray-300 font-light mt-3">
                    最終更新: {formatDate(item.updatedAt)}
                  </p>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg p-12 text-center">
            <Package className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-light">
              備品がまだ登録されていません
            </p>
            <Button
              onClick={openAddDialog}
              variant="outline"
              className="mt-4 gap-2 text-sm font-light border-gray-200"
            >
              <Plus className="w-4 h-4" />
              最初の備品を登録する
            </Button>
          </div>
        )}
      </main>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-light text-gray-900">
              備品を新規登録
            </DialogTitle>
          </DialogHeader>
          <ItemForm
            formData={formData}
            setFormData={setFormData}
            tagInput={tagInput}
            setTagInput={setTagInput}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            onTagKeyDown={handleTagKeyDown}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              className="font-light border-gray-200"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!isFormValid || createMutation.isPending}
              className="font-light"
            >
              {createMutation.isPending ? "登録中..." : "登録"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editingItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingItem(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-light text-gray-900">
              備品を編集
            </DialogTitle>
          </DialogHeader>
          <ItemForm
            formData={formData}
            setFormData={setFormData}
            tagInput={tagInput}
            setTagInput={setTagInput}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            onTagKeyDown={handleTagKeyDown}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingItem(null);
                resetForm();
              }}
              className="font-light border-gray-200"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!isFormValid || updateMutation.isPending}
              className="font-light"
            >
              {updateMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ItemForm({
  formData,
  setFormData,
  tagInput,
  setTagInput,
  onAddTag,
  onRemoveTag,
  onTagKeyDown,
}: {
  formData: ItemFormData;
  setFormData: (data: ItemFormData) => void;
  tagInput: string;
  setTagInput: (value: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onTagKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <label className="text-sm font-light text-gray-600 mb-1 block">
          品名 <span className="text-red-400">*</span>
        </label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="例: 折りたたみテーブル"
          className="font-light"
        />
      </div>

      {/* Quantity + Location row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-light text-gray-600 mb-1 block">
            数量
          </label>
          <Input
            type="number"
            min={0}
            value={formData.qty}
            onChange={(e) =>
              setFormData({ ...formData, qty: parseInt(e.target.value) || 0 })
            }
            className="font-light"
          />
        </div>
        <div>
          <label className="text-sm font-light text-gray-600 mb-1 block">
            保管場所 <span className="text-red-400">*</span>
          </label>
          <Input
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
            placeholder="例: 倉庫A"
            className="font-light"
          />
        </div>
      </div>

      {/* Condition */}
      <div>
        <label className="text-sm font-light text-gray-600 mb-1 block">
          状態
        </label>
        <Select
          value={formData.condition}
          onValueChange={(value) =>
            setFormData({ ...formData, condition: value })
          }
        >
          <SelectTrigger className="w-full font-light">
            <SelectValue placeholder="状態を選択" />
          </SelectTrigger>
          <SelectContent>
            {CONDITIONS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tags */}
      <div>
        <label className="text-sm font-light text-gray-600 mb-1 block">
          タグ
        </label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={onTagKeyDown}
            placeholder="タグを入力してEnter"
            className="font-light flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={onAddTag}
            disabled={!tagInput.trim()}
            className="font-light border-gray-200 px-3"
          >
            追加
          </Button>
        </div>
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-600 text-xs rounded border border-gray-200 font-light"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => onRemoveTag(tag)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="text-sm font-light text-gray-600 mb-1 block">
          備考
        </label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="メモや補足情報"
          rows={3}
          className="font-light"
        />
      </div>
    </div>
  );
}
