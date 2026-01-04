import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Lock, BookOpen, Users, AlertCircle, ArrowRight } from "lucide-react";

export default function PublicHome() {
  return (
    <div className="page-container">
      {/* Header */}
      <header className="relative bg-cover bg-center border-b-2 border-gray-200 sticky top-0 z-50 shadow-md" style={{ backgroundImage: "url('/greenpia-yaizu.jpg')" }}>
        <div className="absolute inset-0 bg-white/85 backdrop-blur-sm" />
        <div className="container py-5 flex items-center justify-between relative">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            集合住宅 組長引き継ぎポータル
          </h1>
          <div className="flex items-center gap-3">
            <a href="/register">
              <Button className="bg-white text-blue-900 hover:bg-gray-50 border-2 border-blue-900 px-6 py-3 rounded-lg font-bold inline-flex items-center justify-center shadow-sm hover:shadow-md transition-all">
                新規登録
              </Button>
            </a>
            <a href={getLoginUrl()}>
              <Button className="bg-blue-900 text-white hover:bg-blue-800 px-6 py-3 rounded-lg font-bold inline-flex items-center justify-center shadow-md hover:shadow-lg transition-all">
                <Lock className="w-5 h-5 mr-2" />
                ログイン
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-[500px] sm:h-[600px] bg-cover bg-center overflow-hidden" style={{ backgroundImage: "url('/greenpia-yaizu.jpg')", backgroundAttachment: "fixed" }}>
        {/* オーバーレイ - 白ベースで洗練された印象 */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/75 via-white/60 to-white/40 backdrop-blur-[2px]" />

        {/* コンテンツ */}
        <div className="relative h-full flex flex-col justify-center container py-12 sm:py-16">
          <div className="max-w-3xl">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              焼津市 集合住宅「グリーンピア」
            </h2>
            <p className="text-xl sm:text-2xl text-gray-800 mb-8 leading-relaxed">
              組長業務の引き継ぎを、シンプルに。<br />
              次年度の組長が迷わず運用できるよう、必要な情報をまとめています。
            </p>
            <div className="flex items-center gap-4">
              <a href="/register">
                <Button className="bg-white text-blue-900 hover:bg-gray-50 border-2 border-blue-900 px-8 py-4 rounded-xl text-lg font-bold shadow-md hover:shadow-lg transition-all inline-flex items-center justify-center">
                  新規登録
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </a>
              <a href={getLoginUrl()}>
                <Button className="bg-blue-900 text-white hover:bg-blue-800 px-8 py-4 rounded-xl text-lg font-bold shadow-lg hover:shadow-xl transition-all inline-flex items-center justify-center">
                  ログイン
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container py-16 sm:py-20">
        {/* About Section */}
        <section className="mb-20">
          <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-10">
            このサイトについて
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 sm:p-8 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-5">
                <BookOpen className="w-8 h-8 text-blue-900 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-3">組長業務の引き継ぎ</h4>
                  <p className="text-gray-600 text-base leading-relaxed">
                    河川清掃、備品管理、ルール、年度ログなど、必要な情報を一元管理。
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 sm:p-8 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-5">
                <Users className="w-8 h-8 text-blue-900 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-3">マンション住人限定</h4>
                  <p className="text-gray-600 text-base leading-relaxed">
                    ログイン後、詳細な情報にアクセスできます。<br />
                    新規登録も可能です。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Notice */}
        <section className="mb-20">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 text-blue-900 flex-shrink-0 mt-1" />
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">個人情報について</h4>
                <p className="text-base text-gray-700 leading-relaxed">
                  このサイトでは、氏名・部屋番号・電話・メール・金額などの個人情報は原則保存・表示しません。<br />
                  必要な場合は、Admin限定の秘匿メモに隔離されます。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section>
          <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-10">
            主な機能
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "📅 年間カレンダー", desc: "行事・締切・準備チェックリスト" },
              { title: "🧹 河川清掃ガイド", desc: "準備・役割・安全・片付け手順" },
              { title: "📦 備品台帳", desc: "写真・数量・保管場所・状態" },
              { title: "📝 テンプレ置き場", desc: "文書テンプレ・通知文" },
              { title: "⚖️ ルール・決定事項", desc: "会費・ローテーション・出不足金" },
              { title: "📖 年度ログ", desc: "時系列・タグ・承認フロー" },
            ].map((feature, idx) => (
              <div key={idx} className="bg-white border-2 border-gray-200 rounded-xl p-6 sm:p-8 shadow-md hover:shadow-lg transition-shadow">
                <h5 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h5>
                <p className="text-base text-gray-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t-2 border-gray-200 py-10 mt-20">
        <div className="container text-center text-base text-gray-600">
          <p>&copy; 2025 焼津市 集合住宅「グリーンピア」 組長引き継ぎポータル</p>
        </div>
      </footer>
    </div>
  );
}
