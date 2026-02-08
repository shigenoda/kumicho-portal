import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Briefcase,
  Plus,
  Check,
  Trash2,
  Edit2,
  MapPin,
  ArrowLeft,
} from "lucide-react";

export default function HandoverBag() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // ── Query ──
  const { data: items = [], isLoading } =
    trpc.data.getHandoverBagItems.useQuery();

  // ── Mutations ──
  const createItem = trpc.data.createHandoverBagItem.useMutation({
    onSuccess: () => {
      utils.data.getHandoverBagItems.invalidate();
      resetAddForm();
    },
  });
  const updateItem = trpc.data.updateHandoverBagItem.useMutation({
    onSuccess: () => {
      utils.data.getHandoverBagItems.invalidate();
      setEditingId(null);
    },
  });
  const deleteItem = trpc.data.deleteHandoverBagItem.useMutation({
    onSuccess: () => {
      utils.data.getHandoverBagItems.invalidate();
    },
  });

  // ── Add form state ──
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addLocation, setAddLocation] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addNotes, setAddNotes] = useState("");

  const resetAddForm = () => {
    setShowAddForm(false);
    setAddName("");
    setAddLocation("");
    setAddDescription("");
    setAddNotes("");
  };

  // ── Edit form state ──
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const startEdit = (item: {
    id: number;
    name: string;
    location: string;
    description: string | null;
    notes: string | null;
  }) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditLocation(item.location);
    setEditDescription(item.description ?? "");
    setEditNotes(item.notes ?? "");
  };

  // ── Handlers ──
  const handleAdd = () => {
    if (!addName.trim() || !addLocation.trim()) return;
    createItem.mutate({
      name: addName.trim(),
      location: addLocation.trim(),
      description: addDescription.trim() || undefined,
      notes: addNotes.trim() || undefined,
    });
  };

  const handleUpdate = () => {
    if (editingId === null || !editName.trim() || !editLocation.trim()) return;
    updateItem.mutate({
      id: editingId,
      name: editName.trim(),
      location: editLocation.trim(),
      description: editDescription.trim() || undefined,
      notes: editNotes.trim() || undefined,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("このアイテムを削除しますか？")) {
      deleteItem.mutate({ id });
    }
  };

  const handleToggleCheck = (item: { id: number; isChecked: boolean }) => {
    updateItem.mutate({ id: item.id, isChecked: !item.isChecked });
  };

  // ── Input helper ──
  const inputClass =
    "w-full border border-gray-200 rounded px-3 py-2 text-sm font-light text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 transition-colors";

  return (
    <div className="min-h-screen bg-white">
      {/* ── Header ── */}
      <header className="border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-1 text-sm font-light text-gray-400 hover:text-gray-600 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            戻る
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Briefcase className="w-5 h-5 text-gray-400" />
            <h1 className="text-2xl font-medium text-gray-900 tracking-wide">
              引き継ぎ袋チェックリスト
            </h1>
          </div>
          <p className="text-sm font-light text-gray-400 ml-8">
            組長交代時の引き継ぎ資料一覧
          </p>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Add button */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 text-sm font-light text-gray-500 hover:text-gray-900 transition-colors mb-8"
          >
            <Plus className="w-4 h-4" />
            追加
          </button>
        )}

        {/* ── Add form (inline) ── */}
        {showAddForm && (
          <div className="border border-gray-100 rounded-lg p-6 mb-8">
            <h3 className="text-sm font-light text-gray-900 mb-4">
              新しいアイテムを追加
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="アイテム名 *"
                className={inputClass}
              />
              <input
                type="text"
                value={addLocation}
                onChange={(e) => setAddLocation(e.target.value)}
                placeholder="保管場所 *"
                className={inputClass}
              />
              <input
                type="text"
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                placeholder="説明（任意）"
                className={inputClass}
              />
              <textarea
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                placeholder="備考（任意）"
                rows={2}
                className={inputClass + " resize-none"}
              />
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleAdd}
                disabled={
                  !addName.trim() ||
                  !addLocation.trim() ||
                  createItem.isPending
                }
                className="px-4 py-2 text-sm font-light text-white bg-gray-900 rounded hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {createItem.isPending ? "保存中..." : "保存"}
              </button>
              <button
                onClick={resetAddForm}
                className="px-4 py-2 text-sm font-light text-gray-500 hover:text-gray-700 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {/* ── Loading state ── */}
        {isLoading && (
          <p className="text-sm font-light text-gray-400 text-center py-16">
            読み込み中...
          </p>
        )}

        {/* ── Empty state ── */}
        {!isLoading && items.length === 0 && (
          <div className="text-center py-20">
            <Briefcase className="w-8 h-8 text-gray-200 mx-auto mb-4" />
            <p className="text-sm font-light text-gray-400">
              アイテムがまだありません。「追加」ボタンで最初のアイテムを登録しましょう。
            </p>
          </div>
        )}

        {/* ── Items list ── */}
        {!isLoading && items.length > 0 && (
          <div className="space-y-0 divide-y divide-gray-100">
            {items.map((item: any) => (
              <div key={item.id} className="py-5 first:pt-0">
                {editingId === item.id ? (
                  /* ── Inline edit form ── */
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="アイテム名 *"
                      className={inputClass}
                    />
                    <input
                      type="text"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      placeholder="保管場所 *"
                      className={inputClass}
                    />
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="説明（任意）"
                      className={inputClass}
                    />
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="備考（任意）"
                      rows={2}
                      className={inputClass + " resize-none"}
                    />
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={handleUpdate}
                        disabled={
                          !editName.trim() ||
                          !editLocation.trim() ||
                          updateItem.isPending
                        }
                        className="px-4 py-2 text-sm font-light text-white bg-gray-900 rounded hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {updateItem.isPending ? "保存中..." : "保存"}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 text-sm font-light text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Display mode ── */
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleCheck(item)}
                      className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border transition-colors flex items-center justify-center ${
                        item.isChecked
                          ? "bg-gray-900 border-gray-900"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {item.isChecked && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`text-base font-light ${
                          item.isChecked
                            ? "text-gray-400 line-through"
                            : "text-gray-900"
                        }`}
                      >
                        {item.name}
                      </h3>

                      {item.description && (
                        <p className="text-sm font-light text-gray-500 mt-1">
                          {item.description}
                        </p>
                      )}

                      <div className="flex items-center gap-1 mt-2">
                        <MapPin className="w-3 h-3 text-gray-300" />
                        <span className="text-xs font-light text-gray-400">
                          {item.location}
                        </span>
                      </div>

                      {item.notes && (
                        <p className="text-xs font-light text-gray-400 mt-2 pl-4 border-l-2 border-gray-100">
                          {item.notes}
                        </p>
                      )}

                      {item.updatedAt && (
                        <p className="text-xs text-gray-400 font-light mt-2">
                          最終更新:{" "}
                          {new Date(item.updatedAt).toLocaleDateString("ja-JP")}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => startEdit(item)}
                        className="p-1.5 text-gray-300 hover:text-gray-600 transition-colors rounded hover:bg-gray-50"
                        title="編集"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded hover:bg-gray-50"
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
