import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Scale, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function Rules() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedYear, setSelectedYear] = useState(2026);
  const { data: rules = [] } = trpc.data.getRules.useQuery();
  const { data: rotationData } = trpc.data.getRotationWithReasons.useQuery({ year: selectedYear });

  if (!isAuthenticated) {
    return <div className="page-container flex items-center justify-center min-h-screen">ログインが必要です</div>;
  }

  const decidedRules = rules.filter((r) => r.status === "decided");
  const pendingRules = rules.filter((r) => r.status === "pending");

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
              <Scale className="w-6 h-6" />
              ルール・決定事項
            </h1>
            <p className="text-white/70">会費・ローテーション・出不足金</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {/* Decided Rules */}
        {decidedRules.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">✓ 決定事項</h2>
            <div className="space-y-4">
              {decidedRules.map((rule: any) => (
                <Card key={rule.id} className="p-4 sm:p-6 border-l-4 border-l-green-600">
                  <h3 className="font-semibold mb-2">{rule.title}</h3>
                  <p className="text-muted-foreground mb-3">{rule.summary}</p>
                  <div className="bg-muted p-4 rounded text-sm text-muted-foreground whitespace-pre-wrap">
                    {rule.details}
                  </div>
                  {rule.evidenceLinks && rule.evidenceLinks.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-2">根拠:</p>
                      <ul className="space-y-1">
                        {rule.evidenceLinks.map((link: string, idx: number) => (
                          <li key={idx}>
                            <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                              {link}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Pending Rules */}
        {pendingRules.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">⏳ 検討中</h2>
            <div className="space-y-4">
              {pendingRules.map((rule: any) => (
                <Card key={rule.id} className="p-4 sm:p-6 border-l-4 border-l-yellow-600 bg-yellow-50 dark:bg-yellow-900/10">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="badge-hypothesis">検討中</span>
                    <h3 className="font-semibold">{rule.title}</h3>
                  </div>
                  <p className="text-muted-foreground mb-3">{rule.summary}</p>
                  <div className="bg-muted p-4 rounded text-sm text-muted-foreground whitespace-pre-wrap">
                    {rule.details}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {rules.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">ルールがまだ登録されていません</p>
          </Card>
        )}

        {/* ローテーション表 */}
        <section className="mt-12 pt-8 border-t border-border">
          <h2 className="text-xl font-semibold mb-4">🔄 ローテーション表（先9年）</h2>
          
          {/* 年度選択 */}
          <div className="mb-6 flex gap-2 flex-wrap">
            {[2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034].map((year) => (
              <Button
                key={year}
                variant={selectedYear === year ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedYear(year)}
              >
                {year}年度
              </Button>
            ))}
          </div>

          {/* ローテーション詳細 */}
          {rotationData && (
            <div className="space-y-6">
              {/* 候補状況 */}
              <Card className="p-4 sm:p-6">
                <h3 className="font-semibold mb-4">{selectedYear}年度 候補状況</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rotationData.households.map((h: any) => (
                    <div
                      key={h.householdId}
                      className={`p-3 rounded border ${
                        h.isCandidate
                          ? "border-green-300 bg-green-50 dark:bg-green-900/20"
                          : "border-red-300 bg-red-50 dark:bg-red-900/20"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{h.householdId}号室</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {h.moveInDate
                              ? new Date(h.moveInDate).toLocaleDateString("ja-JP")
                              : "入居日未設定"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            組長経歴: {h.leaderHistoryCount}回
                          </p>
                        </div>
                        <div className="text-right">
                          {h.isCandidate ? (
                            <span className="inline-block px-2 py-1 bg-green-600 text-white text-xs rounded font-medium">
                              候補
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-1 bg-red-600 text-white text-xs rounded font-medium">
                              除外
                            </span>
                          )}
                        </div>
                      </div>
                      {h.reasons.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-current/20">
                          <p className="text-xs font-medium text-muted-foreground mb-1">除外理由:</p>
                          <div className="space-y-1">
                            {h.reasons.includes("A") && (
                              <p className="text-xs text-muted-foreground">A: 入居12ヶ月未満</p>
                            )}
                            {h.reasons.includes("B") && (
                              <p className="text-xs text-muted-foreground">B: 直近2年以内に組長経験</p>
                            )}
                            {h.reasons.includes("C") && (
                              <p className="text-xs text-muted-foreground">C: 免除申請承認</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* 現在のスケジュール */}
              {rotationData.schedule && (
                <Card className="p-4 sm:p-6 border-l-4 border-l-blue-600">
                  <h3 className="font-semibold mb-4">現在の選定結果</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Primary</p>
                      <p className="text-lg font-semibold text-foreground">
                        {rotationData.schedule.primaryHouseholdId}号室
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ステータス: {rotationData.schedule.status}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Backup</p>
                      <p className="text-lg font-semibold text-foreground">
                        {rotationData.schedule.backupHouseholdId}号室
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        理由: {rotationData.schedule.reason}
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
