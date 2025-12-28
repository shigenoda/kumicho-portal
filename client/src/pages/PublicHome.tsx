import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Lock, BookOpen, Users, AlertCircle } from "lucide-react";

export default function PublicHome() {
  return (
    <div className="page-container">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-600 to-green-700 text-white py-8 sm:py-12">
        <div className="container">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">集合住宅 組長引き継ぎポータル</h1>
          <p className="text-green-100 text-lg">焼津市 グリーンピア</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 sm:py-12">
        {/* About Section */}
        <section className="mb-12">
          <h2 className="section-header">このサイトについて</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="info-card">
              <div className="flex items-start gap-3">
                <BookOpen className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">組長業務の引き継ぎ</h3>
                  <p className="text-muted-foreground">
                    次年度の組長が迷わず運用できるよう、必要な情報をまとめています。
                  </p>
                </div>
              </div>
            </div>
            <div className="info-card">
              <div className="flex items-start gap-3">
                <Users className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">会員限定</h3>
                  <p className="text-muted-foreground">
                    ログイン後、河川清掃、備品管理、ルールなどの情報にアクセスできます。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="mb-12">
          <h2 className="section-header">主な機能</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="info-card">
              <h3 className="font-semibold mb-2">📅 年間カレンダー</h3>
              <p className="text-sm text-muted-foreground">行事・締切・準備チェックリスト</p>
            </div>
            <div className="info-card">
              <h3 className="font-semibold mb-2">🧹 河川清掃ガイド</h3>
              <p className="text-sm text-muted-foreground">準備・役割・安全・片付け手順</p>
            </div>
            <div className="info-card">
              <h3 className="font-semibold mb-2">📦 備品台帳</h3>
              <p className="text-sm text-muted-foreground">写真・数量・保管場所・状態</p>
            </div>
            <div className="info-card">
              <h3 className="font-semibold mb-2">📝 テンプレ置き場</h3>
              <p className="text-sm text-muted-foreground">管理会社向け・町内会向け文書</p>
            </div>
            <div className="info-card">
              <h3 className="font-semibold mb-2">⚖️ ルール・決定事項</h3>
              <p className="text-sm text-muted-foreground">会費・ローテーション・出不足金</p>
            </div>
            <div className="info-card">
              <h3 className="font-semibold mb-2">📖 年度ログ</h3>
              <p className="text-sm text-muted-foreground">時系列・タグ・承認フロー</p>
            </div>
          </div>
        </section>

        {/* Privacy Notice */}
        <section className="mb-12">
          <div className="warning-box">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">個人情報について</h3>
                <p className="text-sm text-red-800 dark:text-red-200">
                  このサイトでは、氏名・部屋番号・電話・メール・金額などの個人情報は原則保存・表示しません。
                  必要な場合は、Admin限定の秘匿メモに隔離されます。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Login Section */}
        <section className="text-center py-8">
          <h2 className="section-header">ログイン</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            会員の方は、下のボタンからログインしてください。
          </p>
          <a href={getLoginUrl()}>
            <Button size="lg" className="bg-green-600 hover:bg-green-700">
              <Lock className="w-4 h-4 mr-2" />
              ログイン
            </Button>
          </a>
        </section>

        {/* Contact Section */}
        <section className="mt-12 pt-8 border-t border-border">
          <h2 className="section-header">問い合わせ</h2>
          <div className="info-card">
            <p className="text-muted-foreground mb-4">
              ご質問やご不明な点がございましたら、管理会社またはAdmin までお問い合わせください。
            </p>
            <p className="text-sm text-muted-foreground">
              📧 お問い合わせ先: 管理会社 / 組長 Admin
            </p>
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
