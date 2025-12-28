import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function FAQ() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { data: faqData = [] } = trpc.faq.list.useQuery();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (!isAuthenticated) {
    return <div className="page-container flex items-center justify-center min-h-screen">ログインが必要です</div>;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <header className="bg-gradient-to-r from-pink-600 to-pink-700 text-white py-6">
        <div className="container flex items-center gap-4">
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
              <HelpCircle className="w-6 h-6" />
              FAQ
            </h1>
            <p className="text-pink-100">よくある質問</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {faqData.length > 0 ? (
          <div className="space-y-3">
            {faqData.map((item: any) => (
              <Card
                key={item.id}
                className="overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  className="w-full p-4 sm:p-6 text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
                >
                  <h3 className="font-semibold">{item.question}</h3>
                  <span className={`text-xl transition-transform ${expandedId === item.id ? "rotate-180" : ""}`}>
                    ▼
                  </span>
                </button>
                {expandedId === item.id && (
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-border bg-muted/30">
                    <div className="text-muted-foreground whitespace-pre-wrap mb-4">
                      {item.answer}
                    </div>
                    {(item.relatedRuleIds?.length > 0 || item.relatedPostIds?.length > 0) && (
                      <div className="pt-4 border-t border-border">
                        <p className="text-xs font-medium text-muted-foreground mb-2">根拠:</p>
                        <ul className="space-y-1 text-xs text-blue-600">
                          {item.relatedRuleIds?.map((id: number) => (
                            <li key={`rule-${id}`}>• ルール #{id}</li>
                          ))}
                          {item.relatedPostIds?.map((id: number) => (
                            <li key={`post-${id}`}>• 年度ログ #{id}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">FAQがまだ登録されていません</p>
          </Card>
        )}
      </main>
    </div>
  );
}
