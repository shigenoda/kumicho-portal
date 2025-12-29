import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function InquiryForm() {
  const [, navigate] = useLocation();
  const [householdId, setHouseholdId] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [category, setCategory] = useState<"participation" | "opinion" | "repair" | "other">("participation");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data: households } = trpc.leaderRotation.getHouseholds.useQuery();

  const createInquiry = trpc.inquiry.create.useMutation({
    onSuccess: () => {
      toast.success("問い合わせを送信しました");
      setHouseholdId("");
      setYear(new Date().getFullYear());
      setCategory("participation");
      setTitle("");
      setContent("");
      navigate("/member");
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const categoryLabels = {
    participation: "参加確認",
    opinion: "意見募集",
    repair: "修繕依頼",
    other: "その他",
  };

  const isValid = householdId && year && category && title && content;

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/member")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>
            <div>
              <h1 className="text-xl font-semibold">問い合わせ送信</h1>
              <p className="text-sm text-muted-foreground">組長に問い合わせを送信します</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>新規問い合わせ</CardTitle>
            <CardDescription>
              組長へ問い合わせを送信します。送信すると、その年度の組長にメール通知が届きます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (isValid) {
                  createInquiry.mutate({
                    householdId,
                    year,
                    title,
                    content,
                    category,
                  });
                }
              }}
              className="space-y-6"
            >
              {/* 住戸選択 */}
              <div>
                <Label htmlFor="household">住戸番号 *</Label>
                <Select value={householdId} onValueChange={setHouseholdId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="住戸を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {households?.map((h: { householdId: string }) => (
                      <SelectItem key={h.householdId} value={h.householdId}>
                        {h.householdId}号室
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 年度選択 */}
              <div>
                <Label htmlFor="year">年度 *</Label>
                <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="年度を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {[2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034].map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}年度
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* カテゴリ選択 */}
              <div>
                <Label htmlFor="category">カテゴリ *</Label>
                <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="カテゴリを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="participation">参加確認</SelectItem>
                    <SelectItem value="opinion">意見募集</SelectItem>
                    <SelectItem value="repair">修繕依頼</SelectItem>
                    <SelectItem value="other">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* タイトル */}
              <div>
                <Label htmlFor="title">タイトル *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="問い合わせのタイトル"
                  className="mt-1"
                />
              </div>

              {/* 内容 */}
              <div>
                <Label htmlFor="content">内容 *</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="問い合わせの詳細内容を入力してください"
                  rows={6}
                  className="mt-1"
                />
              </div>

              {/* 注意事項 */}
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">送信前にご確認ください</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>送信すると、その年度の組長にメール通知が届きます</li>
                      <li>問い合わせは返信待ちキューで管理されます</li>
                      <li>組長から返信があると、メール通知が届きます</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 送信ボタン */}
              <Button
                type="submit"
                className="w-full"
                disabled={!isValid || createInquiry.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                {createInquiry.isPending ? "送信中..." : "問い合わせを送信"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
