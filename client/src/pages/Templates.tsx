import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Templates() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { data: templates = [] } = trpc.templates.getAll.useQuery();

  if (!isAuthenticated) {
    return <div className="page-container flex items-center justify-center min-h-screen">ログインが必要です</div>;
  }

  const categories = Array.from(new Set(templates.map((t) => t.category)));

  return (
    <div className="page-container">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-600 to-orange-700 text-white py-6">
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
              <FileText className="w-6 h-6" />
              テンプレ置き場
            </h1>
            <p className="text-orange-100">文書テンプレ・通知文</p>
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
                            onClick={() => {
                              navigator.clipboard.writeText(template.body);
                              alert("コピーしました");
                            }}
                          >
                            コピー
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const element = document.createElement("a");
                              element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(template.body));
                              element.setAttribute("download", `${template.title}.txt`);
                              element.style.display = "none";
                              document.body.appendChild(element);
                              element.click();
                              document.body.removeChild(element);
                            }}
                          >
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
