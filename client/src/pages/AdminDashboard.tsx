import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Settings } from "lucide-react";
import { useLocation } from "wouter";

export default function AdminDashboard() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  if (!isAuthenticated || user?.role !== "admin") {
    return <div className="page-container flex items-center justify-center min-h-screen">Admin アクセスが必要です</div>;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-600 to-slate-700 text-white py-6">
        <div className="container flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="w-6 h-6" />
              管理画面
            </h1>
            <p className="text-slate-100">投稿管理・ユーザー管理・設定</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="font-semibold mb-2">📝 投稿管理</h3>
            <p className="text-sm text-muted-foreground mb-4">投稿の承認・編集・削除</p>
            <Button variant="outline" size="sm">管理する</Button>
          </Card>

          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="font-semibold mb-2">👥 ユーザー管理</h3>
            <p className="text-sm text-muted-foreground mb-4">ロール変更・ユーザー削除</p>
            <Button variant="outline" size="sm">管理する</Button>
          </Card>

          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="font-semibold mb-2">🏷️ タグ管理</h3>
            <p className="text-sm text-muted-foreground mb-4">タグの作成・編集・削除</p>
            <Button variant="outline" size="sm">管理する</Button>
          </Card>

          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="font-semibold mb-2">📅 イベント管理</h3>
            <p className="text-sm text-muted-foreground mb-4">行事の作成・編集・削除</p>
            <Button variant="outline" size="sm">管理する</Button>
          </Card>

          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="font-semibold mb-2">📦 備品管理</h3>
            <p className="text-sm text-muted-foreground mb-4">備品の登録・編集・削除</p>
            <Button variant="outline" size="sm">管理する</Button>
          </Card>

          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="font-semibold mb-2">🔐 秘匿メモ</h3>
            <p className="text-sm text-muted-foreground mb-4">Admin限定の秘密情報</p>
            <Button variant="outline" size="sm">表示する</Button>
          </Card>

          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="font-semibold mb-2">📊 変更履歴</h3>
            <p className="text-sm text-muted-foreground mb-4">全変更履歴を表示</p>
            <Button variant="outline" size="sm">表示する</Button>
          </Card>

          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="font-semibold mb-2">💾 バックアップ</h3>
            <p className="text-sm text-muted-foreground mb-4">データのエクスポート</p>
            <Button variant="outline" size="sm">ダウンロード</Button>
          </Card>

          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="font-semibold mb-2">⚙️ 設定</h3>
            <p className="text-sm text-muted-foreground mb-4">サイト設定・年度変更</p>
            <Button variant="outline" size="sm">設定する</Button>
          </Card>
        </div>
      </main>
    </div>
  );
}
