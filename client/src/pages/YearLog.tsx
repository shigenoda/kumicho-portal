import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, BookOpen, Plus, Edit, Save } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function YearLog() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: posts = [], refetch } = trpc.posts.list.useQuery({ year: new Date().getFullYear() });
  
  const [editingPost, setEditingPost] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
      <header className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-6">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-4">
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
          <CreatePostDialog 
            open={isCreateOpen} 
            onOpenChange={setIsCreateOpen}
            onSuccess={() => {
              refetch();
              setIsCreateOpen(false);
            }}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post: any) => (
              <Card key={post.id} className="p-4 sm:p-6">
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
                  <div className="flex items-start gap-2">
                    <EditPostDialog 
                      post={post} 
                      onSuccess={() => refetch()}
                    />
                    <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                      <p>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("ja-JP") : "-"}</p>
                      <p className="text-xs">{post.authorRole}</p>
                    </div>
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
            <p className="text-muted-foreground mb-4">投稿がまだありません</p>
            <CreatePostDialog 
              open={isCreateOpen} 
              onOpenChange={setIsCreateOpen}
              onSuccess={() => {
                refetch();
                setIsCreateOpen(false);
              }}
            />
          </Card>
        )}
      </main>
    </div>
  );
}

function CreatePostDialog({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>("decision");
  const [tags, setTags] = useState("");
  const [editorName, setEditorName] = useState("");

  const createPost = trpc.edit.createPost.useMutation({
    onSuccess: () => {
      toast.success("投稿を作成しました");
      setTitle("");
      setBody("");
      setCategory("decision");
      setTags("");
      setEditorName("");
      onSuccess();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-white text-indigo-700 hover:bg-indigo-50">
          <Plus className="w-4 h-4 mr-2" />
          新規投稿
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>新規投稿</DialogTitle>
          <DialogDescription>年度ログに新しい投稿を追加します</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium">タイトル</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="投稿タイトル"
            />
          </div>
          <div>
            <label className="text-sm font-medium">カテゴリ</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inquiry">問い合わせ</SelectItem>
                <SelectItem value="answer">回答</SelectItem>
                <SelectItem value="decision">決定</SelectItem>
                <SelectItem value="pending">未決</SelectItem>
                <SelectItem value="trouble">トラブル</SelectItem>
                <SelectItem value="improvement">改善提案</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">本文</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="投稿内容"
              rows={6}
            />
          </div>
          <div>
            <label className="text-sm font-medium">タグ（カンマ区切り）</label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="河川清掃, 会費, 決定事項"
            />
          </div>
          <div>
            <label className="text-sm font-medium">編集者名（任意）</label>
            <Input
              value={editorName}
              onChange={(e) => setEditorName(e.target.value)}
              placeholder="山田太郎"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => createPost.mutate({
              title,
              body,
              category: category as any,
              tags: tags.split(",").map(t => t.trim()).filter(Boolean),
              year: new Date().getFullYear(),
              editorName: editorName || undefined,
            })}
            disabled={!title || !body || createPost.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            投稿を作成
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditPostDialog({ post, onSuccess }: { post: any; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body);
  const [category, setCategory] = useState(post.category);
  const [tags, setTags] = useState(post.tags?.join(", ") || "");
  const [editorName, setEditorName] = useState("");

  const updatePost = trpc.edit.updatePost.useMutation({
    onSuccess: () => {
      toast.success("投稿を更新しました");
      setOpen(false);
      onSuccess();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Edit className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>投稿を編集</DialogTitle>
          <DialogDescription>投稿内容を編集します</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium">タイトル</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">カテゴリ</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inquiry">問い合わせ</SelectItem>
                <SelectItem value="answer">回答</SelectItem>
                <SelectItem value="decision">決定</SelectItem>
                <SelectItem value="pending">未決</SelectItem>
                <SelectItem value="trouble">トラブル</SelectItem>
                <SelectItem value="improvement">改善提案</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">本文</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
            />
          </div>
          <div>
            <label className="text-sm font-medium">タグ（カンマ区切り）</label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">編集者名（任意）</label>
            <Input
              value={editorName}
              onChange={(e) => setEditorName(e.target.value)}
              placeholder="山田太郎"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => updatePost.mutate({
              id: post.id,
              title,
              body,
              category: category as any,
              tags: tags.split(",").map((t: string) => t.trim()).filter(Boolean),
              editorName: editorName || undefined,
            })}
            disabled={updatePost.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            更新を保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
