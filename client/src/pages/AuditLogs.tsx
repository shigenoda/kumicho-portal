import { Button } from "@/components/ui/button";
import { Download, Filter } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

/**
 * Admin 監査ログページ
 * Vault アクセス・編集・コピーを記録・表示
 */
export default function AuditLogs() {
  const [, setLocation] = useLocation();
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("all");

  // サンプルデータ
  const auditLogs = [
    {
      id: 1,
      userId: 1,
      userName: "Yamada Taro",
      action: "view",
      entityType: "vault_entry",
      entityId: 1,
      details: "マスキング解除",
      timestamp: "2025-01-01 10:30:45",
      ipAddress: "192.168.1.100",
    },
    {
      id: 2,
      userId: 1,
      userName: "Yamada Taro",
      action: "copy",
      entityType: "vault_entry",
      entityId: 1,
      details: "管理会社電話をコピー",
      timestamp: "2025-01-01 10:31:12",
      ipAddress: "192.168.1.100",
    },
    {
      id: 3,
      userId: 1,
      userName: "Yamada Taro",
      action: "view",
      entityType: "vault_entry",
      entityId: 3,
      details: "マスキング解除",
      timestamp: "2025-01-01 10:32:00",
      ipAddress: "192.168.1.100",
    },
    {
      id: 4,
      userId: 2,
      userName: "Suzuki Hanako",
      action: "view",
      entityType: "vault_entry",
      entityId: 5,
      details: "マスキング解除",
      timestamp: "2024-12-31 15:20:30",
      ipAddress: "192.168.1.101",
    },
    {
      id: 5,
      userId: 2,
      userName: "Suzuki Hanako",
      action: "edit",
      entityType: "vault_entry",
      entityId: 2,
      details: "メールアドレスを更新",
      timestamp: "2024-12-31 14:15:00",
      ipAddress: "192.168.1.101",
    },
  ];

  const actionLabels: Record<string, string> = {
    view: "表示",
    copy: "コピー",
    edit: "編集",
    delete: "削除",
  };

  const actionColors: Record<string, string> = {
    view: "bg-blue-50 text-blue-700",
    copy: "bg-green-50 text-green-700",
    edit: "bg-yellow-50 text-yellow-700",
    delete: "bg-red-50 text-red-700",
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (filterAction !== "all" && log.action !== filterAction) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <header className="fixed top-0 left-0 right-0 bg-cover bg-center border-b border-gray-200 z-50" style={{ backgroundImage: "url('/greenpia-yaizu.jpg')" }}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50" />
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between relative">
          <h1 className="text-xl font-light text-white">監査ログ</h1>
          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            className="text-white hover:text-white/70"
          >
            ← トップに戻る
          </Button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="pt-24 pb-16 max-w-7xl mx-auto px-6">
        {/* フィルタ */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <label className="text-sm text-gray-600">アクション：</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="text-sm border border-gray-200 rounded px-3 py-2 focus:outline-none focus:border-blue-900"
            >
              <option value="all">すべて</option>
              <option value="view">表示</option>
              <option value="copy">コピー</option>
              <option value="edit">編集</option>
              <option value="delete">削除</option>
            </select>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-gray-600 hover:text-gray-900"
          >
            <Download className="w-4 h-4 mr-2" />
            エクスポート
          </Button>
        </div>

        {/* ログテーブル */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">
                  タイムスタンプ
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">
                  ユーザー
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">
                  アクション
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">
                  詳細
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">
                  IP アドレス
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4 text-gray-600">{log.timestamp}</td>
                  <td className="py-3 px-4 text-gray-900">{log.userName}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        actionColors[log.action] || "bg-gray-50 text-gray-700"
                      }`}
                    >
                      {actionLabels[log.action] || log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{log.details}</td>
                  <td className="py-3 px-4 text-gray-600 font-mono text-xs">
                    {log.ipAddress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">ログがありません</p>
          </div>
        )}

        {/* 統計 */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-4 border border-gray-200 rounded">
            <p className="text-xs text-gray-600 mb-1">総ログ数</p>
            <p className="text-2xl font-light text-gray-900">{auditLogs.length}</p>
          </div>
          <div className="p-4 border border-gray-200 rounded">
            <p className="text-xs text-gray-600 mb-1">表示操作</p>
            <p className="text-2xl font-light text-gray-900">
              {auditLogs.filter((l) => l.action === "view").length}
            </p>
          </div>
          <div className="p-4 border border-gray-200 rounded">
            <p className="text-xs text-gray-600 mb-1">コピー操作</p>
            <p className="text-2xl font-light text-gray-900">
              {auditLogs.filter((l) => l.action === "copy").length}
            </p>
          </div>
          <div className="p-4 border border-gray-200 rounded">
            <p className="text-xs text-gray-600 mb-1">編集操作</p>
            <p className="text-2xl font-light text-gray-900">
              {auditLogs.filter((l) => l.action === "edit").length}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
