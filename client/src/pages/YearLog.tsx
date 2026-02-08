import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Lightbulb,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

type Category =
  | "inquiry"
  | "answer"
  | "decision"
  | "pending"
  | "trouble"
  | "improvement";

type FilterCategory = Category | "all";

interface PostFormData {
  title: string;
  body: string;
  category: Category;
  tags: string;
  isHypothesis: boolean;
  relatedLinks: string;
}

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "inquiry", label: "問い合わせ" },
  { value: "answer", label: "回答" },
  { value: "decision", label: "決定事項" },
  { value: "pending", label: "保留" },
  { value: "trouble", label: "トラブル" },
  { value: "improvement", label: "改善提案" },
];

const FILTER_TABS: { value: FilterCategory; label: string }[] = [
  { value: "all", label: "全て" },
  ...CATEGORIES,
];

const CATEGORY_COLORS: Record<Category, string> = {
  inquiry: "bg-blue-50 text-blue-700 border border-blue-200",
  answer: "bg-green-50 text-green-700 border border-green-200",
  decision: "bg-purple-50 text-purple-700 border border-purple-200",
  pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  trouble: "bg-red-50 text-red-700 border border-red-200",
  improvement: "bg-teal-50 text-teal-700 border border-teal-200",
};

const CATEGORY_TIMELINE_COLORS: Record<Category, string> = {
  inquiry: "bg-blue-400",
  answer: "bg-green-400",
  decision: "bg-purple-400",
  pending: "bg-yellow-400",
  trouble: "bg-red-400",
  improvement: "bg-teal-400",
};

const CATEGORY_LABELS: Record<Category, string> = {
  inquiry: "問い合わせ",
  answer: "回答",
  decision: "決定事項",
  pending: "保留",
  trouble: "トラブル",
  improvement: "改善提案",
};

const EMPTY_FORM: PostFormData = {
  title: "",
  body: "",
  category: "inquiry",
  tags: "",
  isHypothesis: false,
  relatedLinks: "",
};

export default function YearLog() {
  const [, setLocation] = useLocation();
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<PostFormData>(EMPTY_FORM);

  const utils = trpc.useUtils();

  const { data: posts = [] } = trpc.data.getPosts.useQuery({ year });

  const createMutation = trpc.posts.create.useMutation({
    onSuccess: () => {
      utils.data.getPosts.invalidate();
      setCreateDialogOpen(false);
      setFormData(EMPTY_FORM);
    },
  });

  const updateMutation = trpc.posts.update.useMutation({
    onSuccess: () => {
      utils.data.getPosts.invalidate();
      setEditDialogOpen(false);
      setEditingId(null);
      setFormData(EMPTY_FORM);
    },
  });

  const deleteMutation = trpc.posts.delete.useMutation({
    onSuccess: () => {
      utils.data.getPosts.invalidate();
    },
  });

  const filteredPosts =
    activeFilter === "all"
      ? posts
      : posts.filter((p: any) => p.category === activeFilter);

  const handleCreate = () => {
    if (!formData.title.trim() || !formData.body.trim()) return;
    const tags = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const relatedLinks = formData.relatedLinks
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    createMutation.mutate({
      title: formData.title.trim(),
      body: formData.body.trim(),
      category: formData.category,
      tags,
      year,
      isHypothesis: formData.isHypothesis,
      relatedLinks,
    });
  };

  const handleEditClick = (post: any) => {
    setEditingId(post.id);
    setFormData({
      title: post.title || "",
      body: post.body || "",
      category: post.category || "inquiry",
      tags: (post.tags || []).join(", "),
      isHypothesis: post.isHypothesis || false,
      relatedLinks: (post.relatedLinks || []).join("\n"),
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingId || !formData.title.trim() || !formData.body.trim()) return;
    const tags = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const relatedLinks = formData.relatedLinks
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    updateMutation.mutate({
      id: editingId,
      title: formData.title.trim(),
      body: formData.body.trim(),
      category: formData.category,
      tags,
      isHypothesis: formData.isHypothesis,
      relatedLinks,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("この投稿を削除しますか？")) {
      deleteMutation.mutate({ id });
    }
  };

  const openCreateDialog = () => {
    setFormData(EMPTY_FORM);
    setCreateDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation("/")}
              className="p-2 hover:bg-gray-50 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-light text-gray-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-gray-400" />
                年度ログ
              </h1>
              <p className="text-sm font-light text-gray-400 mt-0.5">
                時系列の活動記録
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Year selector and Add button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setYear((y) => y - 1)}
              className="p-1.5 hover:bg-gray-50 rounded transition-colors text-gray-400 hover:text-gray-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-lg font-light text-gray-900 tabular-nums min-w-[4rem] text-center">
              {year}年
            </span>
            <button
              onClick={() => setYear((y) => y + 1)}
              className="p-1.5 hover:bg-gray-50 rounded transition-colors text-gray-400 hover:text-gray-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <Button
            onClick={openCreateDialog}
            className="bg-gray-900 hover:bg-gray-800 text-white font-light text-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            新規投稿
          </Button>
        </div>

        {/* Category filter tabs */}
        <div className="flex flex-wrap gap-1.5 mb-8">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-light transition-colors ${
                activeFilter === tab.value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Timeline */}
        {filteredPosts.length > 0 ? (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-3 top-2 bottom-2 w-px bg-gray-100" />

            <div className="space-y-6">
              {filteredPosts.map((post: any) => (
                <div key={post.id} className="relative pl-10">
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-1.5 top-2 w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                      CATEGORY_TIMELINE_COLORS[
                        post.category as Category
                      ] || "bg-gray-400"
                    }`}
                  />

                  <Card className="bg-white border border-gray-100 shadow-none hover:border-gray-200 transition-colors">
                    <div className="p-5">
                      {/* Top row: meta + actions */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-light ${
                              CATEGORY_COLORS[
                                post.category as Category
                              ] || "bg-gray-50 text-gray-600"
                            }`}
                          >
                            {CATEGORY_LABELS[post.category as Category] ||
                              post.category}
                          </span>
                          <span className="text-xs text-gray-300 font-light">
                            {post.publishedAt
                              ? new Date(post.publishedAt).toLocaleDateString(
                                  "ja-JP"
                                )
                              : post.updatedAt
                                ? new Date(post.updatedAt).toLocaleDateString(
                                    "ja-JP"
                                  )
                                : ""}
                          </span>
                          {post.isHypothesis && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-light bg-amber-50 text-amber-600 border border-amber-200">
                              <Lightbulb className="w-3 h-3" />
                              仮説
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 ml-2 flex-shrink-0">
                          <button
                            onClick={() => handleEditClick(post)}
                            className="p-1.5 hover:bg-gray-50 rounded transition-colors text-gray-300 hover:text-blue-500"
                            title="編集"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="p-1.5 hover:bg-gray-50 rounded transition-colors text-gray-300 hover:text-red-500"
                            title="削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-normal text-gray-900 mb-2">
                        {post.title}
                      </h3>

                      {/* Body */}
                      <p className="text-sm font-light text-gray-500 whitespace-pre-wrap leading-relaxed mb-3">
                        {post.body}
                      </p>

                      {/* Tags */}
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {post.tags.map((tag: string) => (
                            <span
                              key={tag}
                              className="inline-block px-2 py-0.5 bg-gray-50 text-gray-500 text-xs font-light rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Related links */}
                      {post.relatedLinks && post.relatedLinks.length > 0 && (
                        <div className="pt-3 border-t border-gray-50">
                          <p className="text-xs font-light text-gray-400 mb-1.5">
                            関連リンク
                          </p>
                          <ul className="space-y-1">
                            {post.relatedLinks.map(
                              (link: string, idx: number) => (
                                <li key={idx}>
                                  <a
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-light text-blue-500 hover:text-blue-600 hover:underline"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    {link}
                                  </a>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-light text-gray-400">
              {year}年の投稿はまだありません
            </p>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-light text-gray-900">
              新規投稿
            </DialogTitle>
          </DialogHeader>
          <PostForm
            formData={formData}
            setFormData={setFormData}
            isPending={createMutation.isPending}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              className="font-light"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !formData.title.trim() ||
                !formData.body.trim() ||
                createMutation.isPending
              }
              className="bg-gray-900 hover:bg-gray-800 text-white font-light"
            >
              {createMutation.isPending ? "保存中..." : "投稿する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-light text-gray-900">
              投稿を編集
            </DialogTitle>
          </DialogHeader>
          <PostForm
            formData={formData}
            setFormData={setFormData}
            isPending={updateMutation.isPending}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="font-light"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={
                !formData.title.trim() ||
                !formData.body.trim() ||
                updateMutation.isPending
              }
              className="bg-gray-900 hover:bg-gray-800 text-white font-light"
            >
              {updateMutation.isPending ? "保存中..." : "保存する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PostForm({
  formData,
  setFormData,
  isPending,
}: {
  formData: PostFormData;
  setFormData: React.Dispatch<React.SetStateAction<PostFormData>>;
  isPending: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-xs font-light text-gray-500 mb-1.5">
          タイトル
        </label>
        <Input
          value={formData.title}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, title: e.target.value }))
          }
          placeholder="タイトルを入力"
          disabled={isPending}
          className="font-light"
        />
      </div>

      {/* Body */}
      <div>
        <label className="block text-xs font-light text-gray-500 mb-1.5">
          本文
        </label>
        <Textarea
          value={formData.body}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, body: e.target.value }))
          }
          placeholder="内容を入力"
          rows={5}
          disabled={isPending}
          className="font-light"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-light text-gray-500 mb-1.5">
          カテゴリ
        </label>
        <Select
          value={formData.category}
          onValueChange={(value: string) =>
            setFormData((prev) => ({
              ...prev,
              category: value as Category,
            }))
          }
          disabled={isPending}
        >
          <SelectTrigger className="w-full font-light">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-xs font-light text-gray-500 mb-1.5">
          タグ（カンマ区切り）
        </label>
        <Input
          value={formData.tags}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, tags: e.target.value }))
          }
          placeholder="例: 防災, 設備, 清掃"
          disabled={isPending}
          className="font-light"
        />
      </div>

      {/* Related Links */}
      <div>
        <label className="block text-xs font-light text-gray-500 mb-1.5">
          関連リンク（1行に1つ）
        </label>
        <Textarea
          value={formData.relatedLinks}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              relatedLinks: e.target.value,
            }))
          }
          placeholder="https://example.com"
          rows={2}
          disabled={isPending}
          className="font-light"
        />
      </div>

      {/* Hypothesis checkbox */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="isHypothesis"
          checked={formData.isHypothesis}
          onCheckedChange={(checked) =>
            setFormData((prev) => ({
              ...prev,
              isHypothesis: checked === true,
            }))
          }
          disabled={isPending}
        />
        <label
          htmlFor="isHypothesis"
          className="text-sm font-light text-gray-600 cursor-pointer"
        >
          仮説としてマークする
        </label>
      </div>
    </div>
  );
}
