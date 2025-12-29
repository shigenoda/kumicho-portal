import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Mail, Check, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function EmailSettings() {
  const [, navigate] = useLocation();
  const [selectedHousehold, setSelectedHousehold] = useState("");
  const [email, setEmail] = useState("");

  const { data: households } = trpc.leaderRotation.getHouseholds.useQuery();
  const { data: existingEmail, refetch } = trpc.householdEmail.get.useQuery(
    { householdId: selectedHousehold },
    { enabled: !!selectedHousehold }
  );

  const upsertEmail = trpc.householdEmail.upsert.useMutation({
    onSuccess: () => {
      toast.success("メールアドレスを登録しました");
      refetch();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  // 既存のメールアドレスを反映
  useEffect(() => {
    if (existingEmail) {
      setEmail(existingEmail.email);
    } else {
      setEmail("");
    }
  }, [existingEmail]);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

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
              <h1 className="text-xl font-semibold">メールアドレス設定</h1>
              <p className="text-sm text-muted-foreground">リマインダー通知を受け取るためのメールアドレスを登録</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              メールアドレス登録
            </CardTitle>
            <CardDescription>
              河川清掃の出欠リマインダーなどの通知を受け取るためのメールアドレスを登録してください。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* 住戸選択 */}
              <div>
                <Label>住戸番号</Label>
                <Select value={selectedHousehold} onValueChange={setSelectedHousehold}>
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

              {selectedHousehold && (
                <>
                  {/* 現在の登録状況 */}
                  {existingEmail && (
                    <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2 text-green-700">
                        <Check className="h-4 w-4" />
                        <span className="font-medium">登録済み</span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">{existingEmail.email}</p>
                    </div>
                  )}

                  {/* メールアドレス入力 */}
                  <div>
                    <Label>{existingEmail ? "新しいメールアドレス" : "メールアドレス"}</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                      className="mt-1"
                    />
                    {email && !isValidEmail(email) && (
                      <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        有効なメールアドレスを入力してください
                      </p>
                    )}
                  </div>

                  {/* 登録ボタン */}
                  <Button
                    className="w-full"
                    onClick={() => upsertEmail.mutate({ householdId: selectedHousehold, email })}
                    disabled={!email || !isValidEmail(email) || upsertEmail.isPending}
                  >
                    {existingEmail ? "メールアドレスを更新" : "メールアドレスを登録"}
                  </Button>

                  {/* 注意事項 */}
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>
                      <strong>注意:</strong> 登録したメールアドレスは以下の目的で使用されます：
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>河川清掃の出欠リマインダー</li>
                      <li>重要なお知らせの通知</li>
                    </ul>
                    <p className="text-xs">
                      メールアドレスは組長（管理者）のみが閲覧できます。
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
