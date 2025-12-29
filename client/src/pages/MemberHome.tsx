import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Settings, LogOut, X } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

/**
 * Member トップページ - Minato Editorial Luxury デザイン
 * 「雑誌の目次」型レイアウト：左上ラベル、中央H1、下Index List、右下更新ログ
 */
export default function MemberHome() {
  const { user, isAuthenticated, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const [showSettings, setShowSettings] = useState(false);
  const [newEmails, setNewEmails] = useState<{ [key: number]: string }>({});
  const { data: households = [] } = trpc.data.getHouseholds.useQuery();
  const { data: residentEmails = [] } = trpc.data.getResidentEmails.useQuery();

  // 現在の年度を自動判定（4月が新年度）
  const currentYear = useMemo(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    return month >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  }, []);

  // 現年度の組長情報を取得
  const { data: currentLeader } = trpc.data.getRotationWithReasons.useQuery(
    { year: currentYear },
    { enabled: !!currentYear }
  );

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-light mb-4 text-gray-900">グリーンピア</h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            焼津市 集合住宅の組長業務引き継ぎポータル
          </p>
          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white"
          >
            ログイン
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <header className="fixed top-0 left-0 right-0 bg-cover bg-center border-b border-gray-200 z-50" style={{ backgroundImage: "url('/greenpia-yaizu.jpg')" }}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50" />
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between relative">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white" />
              <Input
                type="text"
                placeholder="検索（河川、備品、会費など）"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full max-w-md bg-white/20 border-white/30 text-white placeholder:text-white/50 pl-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 ml-6">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-white/10 rounded transition-colors"
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/10 rounded transition-colors"
            >
              <LogOut className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="pt-24 pb-16">
        {/* ヒーロー背景 */}
        <div
          className="relative h-96 bg-cover bg-center overflow-hidden"
          style={{
            backgroundImage: "url('/greenpia-yaizu.jpg')",
            backgroundAttachment: "fixed",
          }}
        >
          {/* オーバーレイ */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />

          {/* コンテンツ */}
          <div className="relative h-full flex flex-col justify-between p-8 max-w-7xl mx-auto w-full">
            {/* 左上：ラベル */}
            <div className="flex items-start justify-between">
              <div className="text-sm text-white/80 font-light tracking-wider">
                <div>焼津市 集合住宅「グリーンピア」</div>
                <div className="mt-1">年度：{currentYear}</div>
              </div>
            </div>

            {/* 中央：H1 */}
            <div className="text-center">
              <h1 className="text-5xl md:text-6xl font-light text-white mb-2 tracking-tight">
                組長引き継ぎ
              </h1>
            </div>

            {/* 右下：Last updated */}
            <div className="flex justify-end">
              <div className="text-xs text-white/60 font-light">
                <div>Last updated</div>
                <div className="mt-1 text-white/70">2025年1月1日</div>
              </div>
            </div>
          </div>
        </div>

        {/* Index List（導線 01..06） */}
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {/* 01: 年間カレンダー */}
            <button
              onClick={() => setLocation("/calendar")}
              className="group cursor-pointer transition-all duration-300 text-left"
            >
              <div className="mb-4">
                <span className="text-xs text-gray-400 font-light tracking-widest">
                  01
                </span>
              </div>
              <h3 className="text-xl font-light text-gray-900 mb-3 group-hover:text-blue-900 transition-colors">
                年間カレンダー
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light">
                行事・締切・準備チェックリストを一元管理
              </p>
              <div className="mt-4 h-0.5 w-0 bg-blue-900 group-hover:w-8 transition-all duration-300" />
            </button>

            {/* 02: 河川清掃 */}
            <button
              onClick={() => setLocation("/river-cleaning")}
              className="group cursor-pointer transition-all duration-300 text-left"
            >
              <div className="mb-4">
                <span className="text-xs text-gray-400 font-light tracking-widest">
                  02
                </span>
              </div>
              <h3 className="text-xl font-light text-gray-900 mb-3 group-hover:text-blue-900 transition-colors">
                河川清掃
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light">
                SOP・実施ログ・安全ガイド
              </p>
              <div className="mt-4 h-0.5 w-0 bg-blue-900 group-hover:w-8 transition-all duration-300" />
            </button>

            {/* 03: 倉庫・備品 */}
            <button
              onClick={() => setLocation("/inventory")}
              className="group cursor-pointer transition-all duration-300 text-left"
            >
              <div className="mb-4">
                <span className="text-xs text-gray-400 font-light tracking-widest">
                  03
                </span>
              </div>
              <h3 className="text-xl font-light text-gray-900 mb-3 group-hover:text-blue-900 transition-colors">
                倉庫・備品台帳
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light">
                写真・数量・保管場所・棚卸し手順
              </p>
              <div className="mt-4 h-0.5 w-0 bg-blue-900 group-hover:w-8 transition-all duration-300" />
            </button>

            {/* 04: テンプレ置き場 */}
            <button
              onClick={() => setLocation("/templates")}
              className="group cursor-pointer transition-all duration-300 text-left"
            >
              <div className="mb-4">
                <span className="text-xs text-gray-400 font-light tracking-widest">
                  04
                </span>
              </div>
              <h3 className="text-xl font-light text-gray-900 mb-3 group-hover:text-blue-900 transition-colors">
                テンプレ置き場
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light">
                文書テンプレ・通知文・メール文例
              </p>
              <div className="mt-4 h-0.5 w-0 bg-blue-900 group-hover:w-8 transition-all duration-300" />
            </button>

            {/* 05: ルール・決定事項 */}
            <button
              onClick={() => setLocation("/rules")}
              className="group cursor-pointer transition-all duration-300 text-left"
            >
              <div className="mb-4">
                <span className="text-xs text-gray-400 font-light tracking-widest">
                  05
                </span>
              </div>
              <h3 className="text-xl font-light text-gray-900 mb-3 group-hover:text-blue-900 transition-colors">
                ルール・決定事項
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light">
                会費・免除・ローテ・出不足金
              </p>
              <div className="mt-4 h-0.5 w-0 bg-blue-900 group-hover:w-8 transition-all duration-300" />
            </button>

            {/* 06: 年度ログ */}
            <button
              onClick={() => setLocation("/year-log")}
              className="group cursor-pointer transition-all duration-300 text-left"
            >
              <div className="mb-4">
                <span className="text-xs text-gray-400 font-light tracking-widest">
                  06
                </span>
              </div>
              <h3 className="text-xl font-light text-gray-900 mb-3 group-hover:text-blue-900 transition-colors">
                年度ログ
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light">
                証跡タイムライン・決定・質問・改善提案
              </p>
              <div className="mt-4 h-0.5 w-0 bg-blue-900 group-hover:w-8 transition-all duration-300" />
            </button>
          </div>
        </div>

        {/* 追加セクション：Pending / FAQ / Vault（Admin限定） */}
        <div className="bg-gray-50 border-t border-gray-200 py-24">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-2xl font-light text-gray-900 mb-12">
              その他のセクション
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {/* 返信待ちキュー */}
              <button
                onClick={() => setLocation("/pending-queue")}
                className="group cursor-pointer text-left"
              >
                <h3 className="text-lg font-light text-gray-900 mb-2 group-hover:text-blue-900 transition-colors">
                  返信待ちキュー
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed font-light">
                  未返信の問い合わせを追跡
                </p>
              </button>

              {/* 引き継ぎ袋 */}
              <button
                onClick={() => setLocation("/handover-bag")}
                className="group cursor-pointer text-left"
              >
                <h3 className="text-lg font-light text-gray-900 mb-2 group-hover:text-blue-900 transition-colors">
                  引き継ぎ袋
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed font-light">
                  物理の中身チェックリスト
                </p>
              </button>

              {/* FAQ */}
              <button
                onClick={() => setLocation("/faq")}
                className="group cursor-pointer text-left"
              >
                <h3 className="text-lg font-light text-gray-900 mb-2 group-hover:text-blue-900 transition-colors">
                  FAQ
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed font-light">
                  よくある質問と回答
                </p>
              </button>

              {/* Admin: Vault */}
              {user?.role === "admin" && (
                <button
                  onClick={() => setLocation("/vault")}
                  className="group cursor-pointer text-left"
                >
                  <h3 className="text-lg font-light text-gray-900 mb-2 group-hover:text-blue-900 transition-colors">
                    Private Vault
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed font-light">
                    秘匿情報（Admin限定）
                  </p>
                </button>
              )}

              {/* Admin: 監査ログ */}
              {user?.role === "admin" && (
                <button
                  onClick={() => setLocation("/audit-logs")}
                  className="group cursor-pointer text-left"
                >
                  <h3 className="text-lg font-light text-gray-900 mb-2 group-hover:text-blue-900 transition-colors">
                    監査ログ
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed font-light">
                    Vault アクセス履歴（Admin限定）
                  </p>
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Settings パネル */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-end">
          <div className="w-full max-w-2xl bg-white rounded-t-lg shadow-lg max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-light text-gray-900">設定</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* 住戸管理セクション */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">住戸管理</h3>
                <div className="space-y-6">
                  {households.map((household: any) => (
                    <div key={household.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            住戸ID
                          </label>
                          <input
                            type="text"
                            value={household.householdId}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-600"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            入居年月
                          </label>
                          <input
                            type="date"
                            defaultValue={household.moveInDate ? new Date(household.moveInDate).toISOString().split('T')[0] : ''}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-900"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            過去の組長経歴（回数）
                          </label>
                          <input
                            type="number"
                            min="0"
                            defaultValue={household.leaderHistoryCount || 0}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-900"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            免除状態
                          </label>
                          <div className="px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-600 text-sm">
                            {household.exemptionType || "なし"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 住民メールアドレス登録セクション */}
              {user?.role === "admin" && (
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">住民メールアドレス登録</h3>
                  <div className="space-y-4">
                    {households.map((household: any) => (
                      <div key={household.id} className="flex items-end gap-3">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {household.householdId}号室
                          </label>
                          <input
                            type="email"
                            value={newEmails[household.id] || residentEmails.find((e: any) => e.householdId === household.householdId)?.email || ""}
                            onChange={(e) => setNewEmails({ ...newEmails, [household.id]: e.target.value })}
                            placeholder="メールアドレスを入力"
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-900"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
                    <p>登録したメールアドレスに、ポータル登録完了の通知メールが送信されます。</p>
                  </div>
                </section>
              )}

              {/* 保存ボタン */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => setShowSettings(false)}
                  variant="outline"
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button
                  className="flex-1 bg-blue-900 hover:bg-blue-800 text-white"
                >
                  保存
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
