import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Lock, BookOpen, Users, AlertCircle, ArrowRight } from "lucide-react";

export default function PublicHome() {
  return (
    <div className="min-h-screen bg-black">
      {/* Header - Tesla style minimal */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-transparent" />
        <div className="container py-6 flex items-center justify-between relative">
          <h1 className="text-xl sm:text-2xl font-light text-white tracking-wide">
            グリーンピア 組長ポータル
          </h1>
          <div className="flex items-center gap-4">
            <a href="/register">
              <Button className="bg-transparent text-white hover:bg-white/10 border border-white/30 px-5 py-2 rounded-md font-light text-sm backdrop-blur-sm transition-all">
                新規登録
              </Button>
            </a>
            <a href={getLoginUrl()}>
              <Button className="bg-white text-black hover:bg-gray-100 px-5 py-2 rounded-md font-medium text-sm transition-all">
                ログイン
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section - Full screen Tesla style */}
      <section className="relative h-screen bg-cover bg-center" style={{ backgroundImage: "url('/greenpia-yaizu.jpg')" }}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

        <div className="relative h-full flex flex-col items-center justify-center text-center px-4">
          <div className="max-w-4xl space-y-6">
            <h2 className="text-5xl sm:text-7xl font-light text-white tracking-tight">
              組長引き継ぎを、<br />シンプルに。
            </h2>
            <p className="text-xl sm:text-2xl text-white/90 font-light max-w-2xl mx-auto">
              次年度の組長が迷わず運用できる、<br className="sm:hidden" />
              統合管理システム
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <a href="/register">
                <Button className="w-full sm:w-auto bg-white text-black hover:bg-gray-100 px-12 py-4 rounded-md font-medium text-base transition-all shadow-2xl">
                  始める
                </Button>
              </a>
              <a href={getLoginUrl()}>
                <Button className="w-full sm:w-auto bg-transparent text-white hover:bg-white/10 border border-white/50 px-12 py-4 rounded-md font-light text-base backdrop-blur-sm transition-all">
                  ログイン
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ArrowRight className="w-6 h-6 text-white/60 rotate-90" />
        </div>
      </section>

      {/* Main Content */}
      <main className="bg-white py-20 sm:py-32">
        <div className="container max-w-5xl">
          {/* About Section */}
          <section className="mb-24 text-center">
            <h3 className="text-3xl sm:text-5xl font-light text-gray-900 mb-16 tracking-tight">
              このサイトについて
            </h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white border border-gray-200 rounded-lg p-8 hover:shadow-xl transition-all duration-300">
                <BookOpen className="w-10 h-10 text-gray-900 mx-auto mb-4" />
                <h4 className="text-xl font-medium text-gray-900 mb-3">組長業務の引き継ぎ</h4>
                <p className="text-gray-600 font-light leading-relaxed">
                  河川清掃、備品管理、ルール、年度ログなど、必要な情報を一元管理。
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-8 hover:shadow-xl transition-all duration-300">
                <Users className="w-10 h-10 text-gray-900 mx-auto mb-4" />
                <h4 className="text-xl font-medium text-gray-900 mb-3">マンション住人限定</h4>
                <p className="text-gray-600 font-light leading-relaxed">
                  ログイン後、詳細な情報にアクセスできます。<br />
                  新規登録も可能です。
                </p>
              </div>
            </div>
          </section>

          {/* Privacy Notice */}
          <section className="mb-24">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <AlertCircle className="w-10 h-10 text-gray-900 mx-auto mb-4" />
              <h4 className="text-xl font-medium text-gray-900 mb-3">個人情報について</h4>
              <p className="text-gray-600 font-light leading-relaxed max-w-3xl mx-auto">
                このサイトでは、氏名・部屋番号・電話・メール・金額などの個人情報は原則保存・表示しません。<br />
                必要な場合は、Admin限定の秘匿メモに隔離されます。
              </p>
            </div>
          </section>

          {/* Features Section */}
          <section className="text-center">
            <h3 className="text-3xl sm:text-5xl font-light text-gray-900 mb-16 tracking-tight">
              主な機能
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: "年間カレンダー", icon: "📅", desc: "行事・締切・準備チェックリスト" },
                { title: "河川清掃ガイド", icon: "🧹", desc: "準備・役割・安全・片付け手順" },
                { title: "備品台帳", icon: "📦", desc: "写真・数量・保管場所・状態" },
                { title: "テンプレ置き場", icon: "📝", desc: "文書テンプレ・通知文" },
                { title: "ルール・決定事項", icon: "⚖️", desc: "会費・ローテーション・出不足金" },
                { title: "年度ログ", icon: "📖", desc: "時系列・タグ・承認フロー" },
              ].map((feature, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-xl transition-all duration-300 text-center">
                  <div className="text-3xl mb-3">{feature.icon}</div>
                  <h5 className="text-lg font-medium text-gray-900 mb-2">{feature.title}</h5>
                  <p className="text-sm text-gray-600 font-light">{feature.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black py-12 border-t border-gray-800">
        <div className="container text-center text-sm text-gray-400 font-light">
          <p>&copy; 2025 焼津市 集合住宅「グリーンピア」 組長引き継ぎポータル</p>
        </div>
      </footer>
    </div>
  );
}
