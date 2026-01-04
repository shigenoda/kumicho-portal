import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Lock, BookOpen, Users, AlertCircle, ArrowRight } from "lucide-react";

export default function PublicHome() {
  return (
    <div className="page-container">
      {/* Header */}
      <header className="bg-background border-b-2 border-border sticky top-0 z-50 shadow-sm">
        <div className="container py-5 flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            集合住宅 組長引き継ぎポータル
          </h1>
          <a href={getLoginUrl()}>
            <Button className="cta-button">
              <Lock className="w-5 h-5 mr-2" />
              ログイン
            </Button>
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="container py-12 sm:py-16">
          <div className="max-w-3xl">
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
              焼津市 集合住宅「グリーンピア」
            </h2>
            <p className="text-xl sm:text-2xl text-foreground/80 mb-8 leading-relaxed">
              組長業務の引き継ぎを、シンプルに。<br />
              次年度の組長が迷わず運用できるよう、必要な情報をまとめています。
            </p>
            <a href={getLoginUrl()}>
              <Button className="cta-button">
                ログインして始める
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container py-16 sm:py-20">
        {/* About Section */}
        <section className="mb-20">
          <h3 className="text-3xl sm:text-4xl font-bold text-foreground mb-10">
            このサイトについて
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="info-card">
              <div className="flex items-start gap-5">
                <BookOpen className="w-8 h-8 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-xl font-bold text-foreground mb-3">組長業務の引き継ぎ</h4>
                  <p className="text-foreground/70 text-base leading-relaxed">
                    河川清掃、備品管理、ルール、年度ログなど、必要な情報を一元管理。
                  </p>
                </div>
              </div>
            </div>
            <div className="info-card">
              <div className="flex items-start gap-5">
                <Users className="w-8 h-8 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-xl font-bold text-foreground mb-3">会員限定</h4>
                  <p className="text-foreground/70 text-base leading-relaxed">
                    ログイン後、詳細な情報にアクセスできます。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Notice */}
        <section className="mb-20">
          <div className="warning-box">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="text-xl font-bold text-foreground mb-3">個人情報について</h4>
                <p className="text-base text-foreground/80 leading-relaxed">
                  このサイトでは、氏名・部屋番号・電話・メール・金額などの個人情報は原則保存・表示しません。<br />
                  必要な場合は、Admin限定の秘匿メモに隔離されます。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section>
          <h3 className="text-3xl sm:text-4xl font-bold text-foreground mb-10">
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
              <div key={idx} className="info-card">
                <h5 className="text-xl font-bold text-foreground mb-2">{feature.title}</h5>
                <p className="text-base text-foreground/70 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted/30 border-t-2 border-border py-10 mt-20">
        <div className="container text-center text-base text-muted-foreground">
          <p>&copy; 2025 焼津市 集合住宅「グリーンピア」 組長引き継ぎポータル</p>
        </div>
      </footer>
    </div>
  );
}
