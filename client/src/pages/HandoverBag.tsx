import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Plus, Pencil, Trash2, Check } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

/**
 * 引き継ぎ袋ページ
 * 物理の中身チェックリスト
 */
export default function HandoverBag() {
  const [, setLocation] = useLocation();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // TODO: API から引き継ぎ袋アイテムを取得
  const [items] = useState([
    {
      id: 1,
      name: "会費帳",
      description: "住戸別の会費納入状況を記録するノート",
      location: "組長宅",
      checked: true,
    },
    {
      id: 2,
      name: "ルール冊子",
      description: "組長業務の基本ルール",
      location: "組長宅",
      checked: true,
    },
    {
      id: 3,
      name: "連絡網",
      description: "全住戸の連絡先一覧",
      location: "組長宅",
      checked: false,
    },
  ]);

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditDescription(item.description);
  };

  const handleSave = () => {
    // TODO: API で更新
    setEditingId(null);
  };

  const handleDelete = (id: number) => {
    if (confirm("このアイテムを削除しますか？")) {
      // TODO: API で削除
    }
  };

  const handleToggleCheck = (id: number) => {
    // TODO: API でチェック状態を更新
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation("/")}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-light text-gray-900">引き継ぎ袋</h1>
          </div>
          <Button
            onClick={() => {
              setEditingId(-1);
              setEditName("");
              setEditDescription("");
            }}
            className="bg-blue-900 text-white hover:bg-blue-800"
          >
            <Plus className="w-4 h-4 mr-2" />
            新規追加
          </Button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* チェックリスト */}
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg border border-gray-200 p-6 flex items-start justify-between hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4 flex-1">
                <button
                  onClick={() => handleToggleCheck(item.id)}
                  className={`mt-1 p-2 rounded transition-colors ${
                    item.checked
                      ? "bg-green-100 text-green-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <Check className="w-5 h-5" />
                </button>
                <div className="flex-1">
                  {editingId === item.id ? (
                    <div className="space-y-3">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="アイテム名"
                        className="text-lg font-semibold"
                      />
                      <Input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="説明"
                        className="text-sm"
                      />
                    </div>
                  ) : (
                    <>
                      <h3
                        className={`text-lg font-semibold ${
                          item.checked
                            ? "text-gray-500 line-through"
                            : "text-gray-900"
                        }`}
                      >
                        {item.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {item.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        保管場所: {item.location}
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleEdit(item)}
                  className="p-2 hover:bg-blue-100 rounded transition-colors text-blue-600"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 hover:bg-red-100 rounded transition-colors text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
