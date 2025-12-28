import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Calendar, Package, FileText, BookOpen, HelpCircle, LogOut, Settings } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function MemberHome() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { data: changelog } = trpc.changelog.getRecent.useQuery(5);

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const quickLinks = [
    { icon: Calendar, label: "年間カレンダー", path: "/calendar", description: "行事・締切・チェックリスト" },
    { icon: FileText, label: "河川清掃ガイド", path: "/river-cleaning", description: "準備・役割・安全" },
    { icon: Package, label: "備品台帳", path: "/inventory", description: "写真・数量・保管場所" },
    { icon: BookOpen, label: "テンプレ置き場", path: "/templates", description: "文書テンプレ" },
    { icon: AlertCircle, label: "ルール・決定事項", path: "/rules", description: "会費・ローテーション" },
    { icon: HelpCircle, label: "FAQ", path: "/faq", description: "よくある質問" },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-600 to-green-700 text-white py-6 sm:py-8">
        <div className="container flex justify-between items-start">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">焼津市 集合住宅「グリーンピア」</h1>
            <p className="text-green-100">組長引き継ぎポータル（年度：2025）</p>
          </div>
          <div className="flex gap-2">
            {user?.role === "admin" && (
              <Button
                variant="outline"
                size="sm"
                className="text-white border-white hover:bg-white/10"
                onClick={() => setLocation("/admin")}
              >
                <Settings className="w-4 h-4 mr-1" />
                管理画面
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-white border-white hover:bg-white/10"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-1" />
              ログアウト
            </Button>
          </div>
        </div>
      </header>

      {/* Info Card */}
      <section className="container py-6">
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">対象範囲</h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                焼津市 集合住宅「グリーンピア」 | 年度：2025 | ロール：{user?.role}
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Main Content */}
      <main className="container py-8 sm:py-12">
        {/* Quick Links */}
        <section className="mb-12">
          <h2 className="section-header">困ったらここ</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.path}
                  onClick={() => setLocation(link.path)}
                  className="info-card hover:shadow-md transition-shadow text-left"
                >
                  <div className="flex items-start gap-3">
                    <Icon className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold">{link.label}</h3>
                      <p className="text-sm text-muted-foreground">{link.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Recent Updates */}
        <section>
          <h2 className="section-header">最新更新</h2>
          <div className="info-card">
            {changelog && changelog.length > 0 ? (
              <ul className="space-y-3">
                {changelog.map((item) => (
                  <li key={item.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.summary}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(item.date).toLocaleDateString("ja-JP")} - {item.authorRole}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center py-4">更新履歴はまだありません</p>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted text-muted-foreground py-6 mt-12">
        <div className="container text-center text-sm">
          <p>&copy; 2025 焼津市 集合住宅「グリーンピア」 組長引き継ぎポータル</p>
        </div>
      </footer>
    </div>
  );
}
