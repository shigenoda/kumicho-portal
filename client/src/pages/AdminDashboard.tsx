import { ArrowLeft, CalendarDays, BookOpen, Package, FileText, Scale, HelpCircle, ClipboardList, Clock, Briefcase, Lock, Shield, History } from "lucide-react";
import { useLocation } from "wouter";

const cards = [
  { icon: CalendarDays, route: "/calendar", title: "年間カレンダー", description: "行事の管理" },
  { icon: BookOpen, route: "/year-log", title: "年度ログ", description: "年次記録の管理" },
  { icon: Package, route: "/inventory", title: "備品台帳", description: "備品の登録・管理" },
  { icon: FileText, route: "/templates", title: "テンプレート", description: "文書テンプレート管理" },
  { icon: Scale, route: "/rules", title: "ルール・決定事項", description: "規則と決定事項" },
  { icon: HelpCircle, route: "/faq", title: "よくある質問", description: "FAQ管理" },
  { icon: ClipboardList, route: "/forms", title: "フォーム管理", description: "アンケート作成" },
  { icon: Clock, route: "/pending-queue", title: "返信待ちキュー", description: "未対応事項" },
  { icon: Briefcase, route: "/handover-bag", title: "引き継ぎ袋", description: "引き継ぎ資料" },
  { icon: Lock, route: "/vault", title: "Private Vault", description: "秘匿情報管理" },
  { icon: Shield, route: "/audit-logs", title: "監査ログ", description: "アクセス履歴" },
  { icon: History, route: "/changelog", title: "更新履歴", description: "変更ログ" },
];

export default function AdminDashboard() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-900 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-light">戻る</span>
          </button>
          <h1 className="text-2xl font-medium text-gray-900 tracking-wide">
            管理ダッシュボード
          </h1>
          <p className="text-sm font-light text-gray-400 mt-1">
            ポータルの各機能にアクセス
          </p>
        </div>
      </header>

      {/* Grid */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.route}
                onClick={() => setLocation(card.route)}
                className="rounded-lg border border-gray-100 bg-white p-5 hover:shadow-md transition-all cursor-pointer"
              >
                <Icon className="w-5 h-5 text-gray-400 mb-3" strokeWidth={1.5} />
                <h2 className="text-base font-light text-gray-900">
                  {card.title}
                </h2>
                <p className="text-sm font-light text-gray-400 mt-1">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
