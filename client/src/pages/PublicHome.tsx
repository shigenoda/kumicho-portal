import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Lock, BookOpen, Users, AlertCircle, ArrowRight } from "lucide-react";

export default function PublicHome() {
  return (
    <div className="page-container">
      {/* Header */}
      <header className="bg-background border-b border-border sticky top-0 z-50">
        <div className="container py-4 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
            集合住宅 組長引き継ぎポータル
          </h1>
          <a href={getLoginUrl()}>
            <Button className="cta-button">
              <Lock className="w-4 h-4 mr-2" />
              ログイン
            </Button>
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="container py-8 sm:py-12">
          <div className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              焼津市 集合住宅「グリーンピア」
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              組長業務の引き継ぎを、シンプルに。次年度の組長が迷わず運用できるよう、必要な情報をまとめています。
            </p>
            <a href={getLoginUrl()}>
              <Button className="cta-button">
                ログインして始める
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container py-12 sm:py-16">
        {/* About Section */}
        <section className="mb-16">
          <h3 className="text-2xl font-semibold text-foreground mb-8">
            このサイトについて
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="info-card">
              <div className="flex items-start gap-4">
                <BookOpen className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-foreground mb-2">組長業務の引き継ぎ</h4>
                  <p className="text-muted-foreground text-sm">
                    河川清掃、備品管理、ルール、年度ログなど、必要な情報を一元管理。
                  </p>
                </div>
              </div>
            </div>
            <div className="info-card">
              <div className="flex items-start gap-4">
                <Users className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-foreground mb-2">会員限定</h4>
                  <p className="text-muted-foreground text-sm">
                    ログイン後、詳細な情報にアクセスできます。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Notice */}
        <section className="mb-16">
          <div className="warning-box">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground mb-2">個人情報について</h4>
                <p className="text-sm text-muted-foreground">
                  このサイトでは、氏名・部屋番号・電話・メール・金額などの個人情報は原則保存・表示しません。
                  必要な場合は、Admin限定の秘匿メモに隔離されます。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section>
          <h3 className="text-2xl font-semibold text-foreground mb-8">
            主な機能
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "📅 年間カレンダー", desc: "行事・締切・準備チェックリスト" },
              { title: "🧹 河川清掃ガイド", desc: "準備・役割・安全・片付け手順" },
              { title: "📦 備品台帳", desc: "写真・数量・保管場所・状態" },
              { title: "📝 テンプレ置き場", desc: "文書テンプレ・通知文" },
              { title: "⚖️ ルール・決定事項", desc: "会費・ローテーション・出不足金" },
              { title: "📖 年度ログ", desc: "時系列・タグ・承認フロー" },
            ].map((feature, idx) => (
              <div key={idx} className="info-card">
                <h5 className="font-semibold text-foreground mb-1">{feature.title}</h5>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted/30 border-t border-border py-8 mt-16">
        <div className="container text-center text-sm text-muted-foreground">
          <p>&copy; 2025 焼津市 集合住宅「グリーンピア」 組長引き継ぎポータル</p>
        </div>
      </footer>
    </div>
  );
}
