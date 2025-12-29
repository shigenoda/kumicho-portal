import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Droplets } from "lucide-react";
import { useLocation } from "wouter";

export default function RiverCleaning() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (!isAuthenticated) {
    return <div className="page-container flex items-center justify-center min-h-screen">ログインが必要です</div>;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <header className="bg-cover bg-center text-white py-6" style={{ backgroundImage: "url('/greenpia-yaizu.jpg')" }}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50" />
        <div className="container flex items-center gap-4 relative">
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
              <Droplets className="w-6 h-6" />
              河川清掃ガイド
            </h1>
            <p className="text-white/70">準備・役割・安全・片付け</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="space-y-6">
          {/* Overview */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">目的</h2>
            <p className="text-muted-foreground">
              河川清掃は、地域の環境保全と住民の絆を深める重要な行事です。
              このガイドは、安全で効率的な清掃活動を実施するための手順をまとめています。
            </p>
          </Card>

          {/* Sections */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">集合・時間割</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>📍 集合場所: グリーンピア 玄関前</p>
              <p>🕐 集合時間: 午前 8:00</p>
              <p>⏱️ 予定時間: 2時間程度</p>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">清掃エリア定義</h2>
            <p className="text-muted-foreground mb-3">
              開始地点から終了地点までの河川区間を清掃します。
            </p>
            <p className="text-sm text-muted-foreground">
              詳細な地図・マーカーについては、別途資料をご参照ください。
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">役割分担</h2>
            <div className="space-y-3 text-muted-foreground">
              <p><strong>班長（2名）:</strong> 班員の安全管理・進捗確認</p>
              <p><strong>ゴミ回収班（6名）:</strong> ゴミ拾い・分別</p>
              <p><strong>道具管理班（2名）:</strong> 道具の配布・回収・洗浄</p>
              <p><strong>飲み物配布班（1名）:</strong> 飲み物の配布・管理</p>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">装備・安全</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>✓ 長靴（必須）</p>
              <p>✓ 防水手袋（必須）</p>
              <p>✓ トング・熊手</p>
              <p>✓ ゴミ袋（大・小）</p>
              <p>✓ 帽子・タオル</p>
              <p>✓ 日焼け止め</p>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">ゴミの分別・処理</h2>
            <div className="space-y-3 text-muted-foreground">
              <p><strong>可燃ゴミ:</strong> 落ち葉・木の枝など</p>
              <p><strong>不燃ゴミ:</strong> 缶・ビン・プラスチック</p>
              <p><strong>危険物:</strong> ガラス・金属片（別途処理）</p>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">事後処理</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>✓ 参加者へのお礼状送付</p>
              <p>✓ 次年度への申し送り（改善点・工夫）</p>
              <p>✓ 実施報告書の作成</p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
