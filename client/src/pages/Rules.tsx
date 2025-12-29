import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Scale } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Rules() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { data: rules = [] } = trpc.data.getRules.useQuery();

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
      </main>
    </div>
  );
}
