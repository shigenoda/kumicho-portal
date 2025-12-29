import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

/**
 * 返信待ちキューページ
 * 未返信の問い合わせを追跡
 */
export default function PendingQueue() {
  const [, setLocation] = useLocation();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  // TODO: API から返信待ちキューデータを取得
  const [pendingItems] = useState([
    {
      id: 1,
      householdId: "102",
      taskType: "form_response",
      dueDate: "2025-04-15",
      status: "pending",
      notes: "河川清掃出欠未回答",
    },
    {
      id: 2,
      householdId: "104",
      taskType: "form_response",
      dueDate: "2025-04-15",
      status: "pending",
      notes: "河川清掃出欠未回答",
    },
  ]);

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setEditTitle(item.notes);
    setEditContent(item.taskType);
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
            <h1 className="text-2xl font-light text-gray-900">返信待ちキュー</h1>
          </div>
          <Button
            onClick={() => {
              setEditingId(-1);
              setEditTitle("");
              setEditContent("");
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
        {/* テーブル */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  住戸
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  タスク種別
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  期限
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  メモ
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {pendingItems.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {item.householdId}号室
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.taskType}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(item.dueDate).toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {editingId === item.id ? (
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="text-sm"
                      />
                    ) : (
                      item.notes
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
