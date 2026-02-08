import { trpc } from "@/lib/trpc";
import { Shield, ArrowLeft, Clock, Filter } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const entityTypeLabels: Record<string, string> = {
  faq: "FAQ",
  forms: "フォーム",
  posts: "投稿",
  rules: "ルール",
  templates: "テンプレート",
  inventory: "備品",
  handoverBagItems: "引き継ぎ袋",
  pendingQueue: "返信待ち",
  vaultEntries: "Vault",
  secretNotes: "秘匿メモ",
  leaderSchedule: "ローテーション",
  leaderRotationLogic: "ローテロジック",
  formResponses: "フォーム回答",
  events: "イベント",
  households: "住戸",
};

const entityTypeColors: Record<string, string> = {
  faq: "bg-blue-50 text-blue-700",
  forms: "bg-purple-50 text-purple-700",
  posts: "bg-green-50 text-green-700",
  rules: "bg-amber-50 text-amber-700",
  templates: "bg-indigo-50 text-indigo-700",
  inventory: "bg-teal-50 text-teal-700",
  handoverBagItems: "bg-orange-50 text-orange-700",
  pendingQueue: "bg-rose-50 text-rose-700",
  vaultEntries: "bg-slate-100 text-slate-700",
  secretNotes: "bg-red-50 text-red-700",
  leaderSchedule: "bg-cyan-50 text-cyan-700",
  leaderRotationLogic: "bg-sky-50 text-sky-700",
  formResponses: "bg-violet-50 text-violet-700",
  events: "bg-emerald-50 text-emerald-700",
  households: "bg-lime-50 text-lime-700",
};

const actionLabels: Record<string, string> = {
  view: "閲覧",
  edit: "編集",
  copy: "コピー",
  delete: "削除",
  create: "作成",
};

const actionColors: Record<string, string> = {
  view: "bg-blue-50 text-blue-700",
  edit: "bg-yellow-50 text-yellow-700",
  copy: "bg-green-50 text-green-700",
  delete: "bg-red-50 text-red-700",
  create: "bg-emerald-50 text-emerald-700",
};

function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("ja-JP");
}

export default function AuditLogs() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"changelog" | "audit">("changelog");
  const [filterAction, setFilterAction] = useState<string>("all");

  const { data: changelog, isLoading: changelogLoading } =
    trpc.data.getChangelog.useQuery({ limit: 100 });
  const { data: auditLogs, isLoading: auditLoading } =
    trpc.data.getAuditLogs.useQuery({ limit: 100 });

  const filteredAuditLogs =
    auditLogs?.filter((log) => {
      if (filterAction !== "all" && log.action !== filterAction) return false;
      return true;
    }) ?? [];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            トップに戻る
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-5 h-5 text-gray-400" />
            <h1 className="text-2xl font-light text-gray-900 tracking-wide">
              監査ログ
            </h1>
          </div>
          <p className="text-sm font-light text-gray-500 ml-8">
            変更履歴・アクセスログ
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 flex gap-0">
          <button
            onClick={() => setActiveTab("changelog")}
            className={`px-5 py-3 text-sm font-light transition-colors border-b-2 ${
              activeTab === "changelog"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            変更履歴
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-5 py-3 text-sm font-light transition-colors border-b-2 ${
              activeTab === "audit"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            アクセスログ
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Changelog Tab */}
        {activeTab === "changelog" && (
          <div>
            {changelogLoading && (
              <div className="text-center py-16">
                <p className="text-sm font-light text-gray-400">読み込み中...</p>
              </div>
            )}

            {!changelogLoading && (!changelog || changelog.length === 0) && (
              <div className="text-center py-16">
                <Clock className="w-6 h-6 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-light text-gray-400">
                  変更履歴はまだありません
                </p>
              </div>
            )}

            {!changelogLoading && changelog && changelog.length > 0 && (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" />

                <div className="space-y-6">
                  {changelog.map((entry) => (
                    <div key={entry.id} className="relative pl-8">
                      {/* Timeline dot */}
                      <div className="absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 border-gray-300 bg-white" />

                      <div className="pb-1">
                        <div className="flex items-center gap-3 mb-1.5">
                          <time className="text-xs font-light text-gray-400">
                            {formatDate(entry.date)}
                          </time>
                          {entry.relatedEntityType && (
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-light ${
                                entityTypeColors[entry.relatedEntityType] ??
                                "bg-gray-50 text-gray-600"
                              }`}
                            >
                              {entityTypeLabels[entry.relatedEntityType] ??
                                entry.relatedEntityType}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-light text-gray-900 leading-relaxed">
                          {entry.summary}
                        </p>
                        {entry.editorName && (
                          <p className="text-xs font-light text-gray-400 mt-1">
                            by {entry.editorName}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Audit Logs Tab */}
        {activeTab === "audit" && (
          <div>
            {/* Filter */}
            <div className="mb-6 flex items-center gap-3">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="text-sm font-light border border-gray-200 rounded px-3 py-1.5 text-gray-700 focus:outline-none focus:border-gray-400 bg-white"
              >
                <option value="all">すべてのアクション</option>
                <option value="view">閲覧</option>
                <option value="create">作成</option>
                <option value="edit">編集</option>
                <option value="copy">コピー</option>
                <option value="delete">削除</option>
              </select>
            </div>

            {auditLoading && (
              <div className="text-center py-16">
                <p className="text-sm font-light text-gray-400">読み込み中...</p>
              </div>
            )}

            {!auditLoading && filteredAuditLogs.length === 0 && (
              <div className="text-center py-16">
                <Shield className="w-6 h-6 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-light text-gray-400">
                  アクセスログはまだありません
                </p>
              </div>
            )}

            {!auditLoading && filteredAuditLogs.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        日時
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        アクション
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        対象
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        詳細
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IPアドレス
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuditLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="py-3 px-3 font-light text-gray-500 whitespace-nowrap">
                          {formatDate(log.timestamp)}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-light ${
                              actionColors[log.action] ?? "bg-gray-50 text-gray-600"
                            }`}
                          >
                            {actionLabels[log.action] ?? log.action}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-light text-gray-700">
                          {log.entityType && (
                            <span className="text-xs">
                              {entityTypeLabels[log.entityType] ?? log.entityType}
                              {log.entityId != null && (
                                <span className="text-gray-400 ml-1">
                                  #{log.entityId}
                                </span>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-light text-gray-500">
                          {log.details ?? "—"}
                        </td>
                        <td className="py-3 px-3 font-mono text-xs text-gray-400">
                          {log.ipAddress ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
