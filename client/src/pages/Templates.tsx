import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Copy, Download } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function Templates() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { data: templates = [] } = trpc.data.getTemplates.useQuery();
  const [copiedId, setCopiedId] = useState<number | null>(null);

  if (!isAuthenticated) {
    return <div className="page-container flex items-center justify-center min-h-screen">ログインが必要です</div>;
  }

  const categories = Array.from(new Set(templates.map((t: any) => t.category)));

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <header className="bg-cover bg-center sticky top-0 z-50 border-b border-border" style={{ backgroundImage: "url('/greenpia-yaizu.jpg')" }}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50" />
        <div className="container py-4 flex items-center gap-4 relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-white">テンプレ置き場</h1>
            <p className="text-sm text-white/70">文書テンプラ・通知文</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {categories.length > 0 ? (
          <div className="space-y-8">
            {categories.map((category) => {
              const categoryTemplates = templates.filter((t) => t.category === category);
              return (
                <section key={category}>
                  <h2 className="text-xl font-semibold mb-4 capitalize">{category}</h2>
                  <div className="space-y-3">
                    {categoryTemplates.map((template) => (
                      <Card key={template.id} className="p-4 sm:p-6">
                        <h3 className="font-semibold mb-2">{template.title}</h3>
                        <div className="bg-muted p-4 rounded text-sm text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto mb-3">
                          {template.body}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopy(template.body, template.id)}
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            {copiedId === template.id ? "コピーしました" : "コピー"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            ダウンロード
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">テンプレがまだ登録されていません</p>
          </Card>
        )}
      </main>
    </div>
  );
}
