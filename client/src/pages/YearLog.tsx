import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, BookOpen, Pencil, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function YearLog() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const [editingId, setEditingId] = useState<number | null>(null);
  const { data: posts = [] } = trpc.data.getPosts.useQuery({ year: new Date().getFullYear() });

  if (!isAuthenticated) {
    return <div className="page-container flex items-center justify-center min-h-screen">ログインが必要です</div>;
  }

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      inquiry: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
      answer: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
      decision: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
      trouble: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
      improvement: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      inquiry: "問い合わせ",
      answer: "回答",
      decision: "決定",
      pending: "未決",
      trouble: "トラブル",
      improvement: "改善提案",
    };
    return labels[category] || category;
  };

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
              <BookOpen className="w-6 h-6" />
              年度ログ
            </h1>
            <p className="text-indigo-100">時系列・タグ・承認フロー</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {user?.role === "editor" && (
          <Card className="p-4 mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100 mb-3">
              📝 投稿は下書きで保存され、Admin の承認後に公開されます。
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700">新規投稿</Button>
          </Card>
        )}

        {posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post: any) => (
              <Card key={post.id} className="p-4 sm:p-6 relative">
                <div className="absolute top-4 right-4 flex gap-1">
                  <button
                    onClick={() => setEditingId(editingId === post.id ? null : post.id)}
                    className="p-2 hover:bg-gray-100 rounded transition-colors text-blue-600"
                    title="編集"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("この投稿を削除しますか？")) {
                      }
                    }}
                    className="p-2 hover:bg-gray-100 rounded transition-colors text-red-600"
                    title="削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getCategoryBadgeColor(post.category)}`}>
                        {getCategoryLabel(post.category)}
                      </span>
                      {post.tags && post.tags.map((tag: string) => (
                        <span key={tag} className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground flex-shrink-0 ml-4">
                    <p>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("ja-JP") : "-"}</p>
                    <p className="text-xs">{post.authorRole}</p>
                  </div>
                </div>
                <div className="bg-muted p-4 rounded text-sm text-muted-foreground whitespace-pre-wrap mb-3">
                  {post.body}
                </div>
                {post.relatedLinks && post.relatedLinks.length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-2">関連リンク:</p>
                    <ul className="space-y-1">
                      {post.relatedLinks.map((link: string, idx: number) => (
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
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">投稿がまだありません</p>
          </Card>
        )}
      </main>
    </div>
  );
}
