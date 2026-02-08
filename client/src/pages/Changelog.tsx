import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Changelog() {
  const { data: changes = [] } = trpc.data.getChangelog.useQuery({ limit: 50 });
  const [, setLocation] = useLocation();

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const entityTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      faq: "FAQ",
      forms: "フォーム",
      posts: "投稿",
      leaderSchedule: "ローテーション",
      households: "住戸",
      formResponses: "フォーム回答",
      leaderRotationLogic: "ローテロジック",
      rules: "ルール",
      templates: "テンプレート",
      inventory: "備品",
      calendar: "カレンダー",
    };
    return map[type] || type;
  };

  const entityTypeBadgeColor = (type: string) => {
    const map: Record<string, string> = {
      faq: "bg-blue-50 text-blue-700 border-blue-200",
      forms: "bg-purple-50 text-purple-700 border-purple-200",
      posts: "bg-green-50 text-green-700 border-green-200",
      leaderSchedule: "bg-orange-50 text-orange-700 border-orange-200",
      households: "bg-gray-100 text-gray-700 border-gray-200",
      formResponses: "bg-indigo-50 text-indigo-700 border-indigo-200",
      leaderRotationLogic: "bg-amber-50 text-amber-700 border-amber-200",
      rules: "bg-emerald-50 text-emerald-700 border-emerald-200",
      templates: "bg-rose-50 text-rose-700 border-rose-200",
      inventory: "bg-teal-50 text-teal-700 border-teal-200",
      calendar: "bg-cyan-50 text-cyan-700 border-cyan-200",
    };
    return map[type] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-600 hover:bg-gray-100"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-medium text-gray-900">更新履歴</h1>
            <p className="text-sm text-gray-500 font-light mt-1">
              ポータルの変更ログ
            </p>
          </div>
        </div>
      </header>

      {/* Timeline */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {changes.length > 0 ? (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" />

            <div className="space-y-8">
              {changes.map((change: any, index: number) => (
                <div key={change.id ?? index} className="relative pl-8">
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 border-gray-300 bg-white" />

                  <div>
                    {/* Date */}
                    <time className="text-xs text-gray-400 font-light tracking-wide">
                      {formatDate(change.createdAt ?? change.date)}
                    </time>

                    {/* Content */}
                    <div className="mt-2 flex items-start gap-3">
                      {/* Entity type badge */}
                      {change.entityType && (
                        <span
                          className={`inline-block px-2 py-0.5 text-xs font-light border rounded flex-shrink-0 ${entityTypeBadgeColor(change.entityType)}`}
                        >
                          {entityTypeLabel(change.entityType)}
                        </span>
                      )}

                      {/* Summary */}
                      <p className="text-sm text-gray-900 font-light leading-relaxed">
                        {change.summary}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-24">
            <p className="text-gray-400 font-light">
              更新履歴はまだありません
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
