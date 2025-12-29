import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Settings, LogOut } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useState } from "react";
import { useLocation } from "wouter";

/**
 * Member トップページ - Minato Editorial Luxury デザイン
 * 「雑誌の目次」型レイアウト：左上ラベル、中央H1、下Index List、右下更新ログ
 */
export default function MemberHome() {
  const { user, isAuthenticated, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

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
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="検索（河川、備品、会費など）"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full max-w-md bg-gray-50 border-gray-200 pl-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 ml-6">
            <button className="p-2 hover:bg-gray-100 rounded transition-colors">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
            >
              <LogOut className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="pt-24 pb-16">
        {/* ヒーロー背景 */}
        <div
          className="relative h-96 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 overflow-hidden"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(79, 172, 254, 0.05) 0%, transparent 50%)",
          }}
        >
          {/* ノイズテクスチャ */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage:
                "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><filter id=%22noise%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 result=%22noise%22/></filter><rect width=%22100%22 height=%22100%22 fill=%22%23000%22 filter=%22url(%23noise)%22/></svg>')",
            }}
          />

          {/* コンテンツ */}
          <div className="relative h-full flex flex-col justify-between p-8 max-w-7xl mx-auto w-full">
            {/* 左上：ラベル */}
            <div className="flex items-start justify-between">
              <div className="text-sm text-gray-500 font-light tracking-wider">
                <div>焼津市 集合住宅「グリーンピア」</div>
                <div className="mt-1">年度：2025</div>
              </div>
            </div>

            {/* 中央：H1 */}
            <div className="text-center">
              <h1 className="text-5xl md:text-6xl font-light text-gray-900 mb-2 tracking-tight">
                組長引き継ぎ
              </h1>
              <p className="text-sm text-gray-500">
                ロール：{user?.role || "member"}
              </p>
            </div>

            {/* 右下：Last updated */}
            <div className="flex justify-end">
              <div className="text-xs text-gray-400 font-light">
                <div>Last updated</div>
                <div className="mt-1 text-gray-500">2025年1月1日</div>
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
                管理会社向け・町内会向け・住民向けテンプレ
              </p>
              <div className="mt-4 h-0.5 w-0 bg-blue-900 group-hover:w-8 transition-all duration-300" />
            </button>

            {/* 05: ローテーション */}
            <button
              onClick={() => setLocation("/rotation")}
              className="group cursor-pointer transition-all duration-300 text-left"
            >
              <div className="mb-4">
                <span className="text-xs text-gray-400 font-light tracking-widest">
                  05
                </span>
              </div>
              <h3 className="text-xl font-light text-gray-900 mb-3 group-hover:text-blue-900 transition-colors">
                組長ローテーション
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light">
                先9年予定・免除ルール・住戸一覧
              </p>
              <div className="mt-4 h-0.5 w-0 bg-blue-900 group-hover:w-8 transition-all duration-300" />
            </button>

            {/* 06: ルール・決定事項 */}
            <button
              onClick={() => setLocation("/rules")}
              className="group cursor-pointer transition-all duration-300 text-left"
            >
              <div className="mb-4">
                <span className="text-xs text-gray-400 font-light tracking-widest">
                  06
                </span>
              </div>
              <h3 className="text-xl font-light text-gray-900 mb-3 group-hover:text-blue-900 transition-colors">
                ルール・決定事項
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light">
                会費・免除・出不足金
              </p>
              <div className="mt-4 h-0.5 w-0 bg-blue-900 group-hover:w-8 transition-all duration-300" />
            </button>

            {/* 07: 出欠表 */}
            <button
              onClick={() => setLocation("/attendance")}
              className="group cursor-pointer transition-all duration-300 text-left"
            >
              <div className="mb-4">
                <span className="text-xs text-gray-400 font-light tracking-widest">
                  07
                </span>
              </div>
              <h3 className="text-xl font-light text-gray-900 mb-3 group-hover:text-blue-900 transition-colors">
                河川清掃 出欠表
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light">
                出欠入力・回答状況・リマインダー
              </p>
              <div className="mt-4 h-0.5 w-0 bg-blue-900 group-hover:w-8 transition-all duration-300" />
            </button>

            {/* 08: 免除申請 */}
            <button
              onClick={() => setLocation("/exemption")}
              className="group cursor-pointer transition-all duration-300 text-left"
            >
              <div className="mb-4">
                <span className="text-xs text-gray-400 font-light tracking-widest">
                  08
                </span>
              </div>
              <h3 className="text-xl font-light text-gray-900 mb-3 group-hover:text-blue-900 transition-colors">
                免除申請
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light">
                組長就任の免除を申請
              </p>
              <div className="mt-4 h-0.5 w-0 bg-blue-900 group-hover:w-8 transition-all duration-300" />
            </button>

            {/* 09: 年度ログ */}
            <button
              onClick={() => setLocation("/year-log")}
              className="group cursor-pointer transition-all duration-300 text-left"
            >
              <div className="mb-4">
                <span className="text-xs text-gray-400 font-light tracking-widest">
                  09
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
                  鍵・印鑑・帳簺のチェックリスト
                </p>
              </button>

              {/* 問い合わせ */}
              <button
                onClick={() => setLocation("/inquiry")}
                className="group cursor-pointer text-left"
              >
                <h3 className="text-lg font-light text-gray-900 mb-2 group-hover:text-blue-900 transition-colors">
                  問い合わせ
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed font-light">
                  組長に問い合わせを送信
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

              {/* Admin: 免除申請管理 */}
              {user?.role === "admin" && (
                <button
                  onClick={() => setLocation("/exemption/admin")}
                  className="group cursor-pointer text-left"
                >
                  <h3 className="text-lg font-light text-gray-900 mb-2 group-hover:text-blue-900 transition-colors">
                    免除申請管理
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed font-light">
                    申請の承認・却下（Admin限定）
                  </p>
                </button>
              )}

              {/* Admin: 返信待ちキュー */}
              {user?.role === "admin" && (
                <button
                  onClick={() => setLocation("/inquiry-queue")}
                  className="group cursor-pointer text-left"
                >
                  <h3 className="text-lg font-light text-gray-900 mb-2 group-hover:text-blue-900 transition-colors">
                    返信待ちキュー
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed font-light">
                    未返信の問い合わせを管理（Admin限定）
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
    </div>
  );
}
