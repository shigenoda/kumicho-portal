import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Calendar, Check, X, HelpCircle, Send } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function AttendanceForm() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const eventId = parseInt(params.id || "0");

  const [selectedHousehold, setSelectedHousehold] = useState("");
  const [response, setResponse] = useState<"attend" | "absent" | "undecided">("attend");
  const [respondentName, setRespondentName] = useState("");
  const [notes, setNotes] = useState("");

  const { data: event, isLoading: eventLoading } = trpc.attendance.getEvent.useQuery({ id: eventId });
  const { data: households } = trpc.leaderRotation.getHouseholds.useQuery();
  const { data: responses } = trpc.attendance.getResponses.useQuery({ eventId });
  const { data: stats } = trpc.attendance.getResponseStats.useQuery({ eventId });

  const submitResponse = trpc.attendance.submitResponse.useMutation({
    onSuccess: () => {
      toast.success("出欠を登録しました");
      setSelectedHousehold("");
      setResponse("attend");
      setRespondentName("");
      setNotes("");
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  // 既存の回答を取得
  useEffect(() => {
    if (selectedHousehold && responses) {
      const existing = responses.find((r) => r.householdId === selectedHousehold);
      if (existing) {
        setResponse(existing.response as any);
        setRespondentName(existing.respondentName || "");
        setNotes(existing.notes || "");
      } else {
        setResponse("attend");
        setRespondentName("");
        setNotes("");
      }
    }
  }, [selectedHousehold, responses]);

  if (eventLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">イベントが見つかりません</div>
      </div>
    );
  }

  const respondedHouseholds = new Set(responses?.map((r) => r.householdId) || []);

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/attendance")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{event.title}</h1>
              <p className="text-sm text-muted-foreground">
                実施日: {new Date(event.scheduledDate).toLocaleDateString("ja-JP")}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-2xl">
        {/* イベント情報 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              イベント情報
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">実施予定日</dt>
                <dd>{new Date(event.scheduledDate).toLocaleDateString("ja-JP")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">回答締切</dt>
                <dd>{new Date(event.deadline).toLocaleDateString("ja-JP")}</dd>
              </div>
              {event.description && (
                <div className="pt-2 border-t">
                  <dt className="text-muted-foreground mb-1">説明</dt>
                  <dd className="whitespace-pre-wrap">{event.description}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* 回答状況 */}
        {stats && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">回答状況</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-3xl font-bold">{stats.responded}</div>
                  <div className="text-sm text-muted-foreground">回答済み / {stats.total}件</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-3xl font-bold text-green-600">{stats.attend}</div>
                  <div className="text-sm text-muted-foreground">参加予定</div>
                </div>
              </div>
              <div className="flex gap-4 mt-4 text-sm justify-center">
                <span className="flex items-center gap-1">
                  <X className="h-3 w-3 text-red-600" />
                  欠席: {stats.absent}
                </span>
                <span className="flex items-center gap-1">
                  <HelpCircle className="h-3 w-3 text-yellow-600" />
                  未定: {stats.undecided}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 出欠入力フォーム */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">出欠を入力</CardTitle>
            <CardDescription>お住まいの住戸を選択して出欠を入力してください</CardDescription>
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
                        {respondedHouseholds.has(h.householdId) && (
                          <span className="ml-2 text-green-600">（回答済み）</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedHousehold && (
                <>
                  {/* 出欠選択 */}
                  <div>
                    <Label>出欠</Label>
                    <RadioGroup
                      value={response}
                      onValueChange={(v) => setResponse(v as any)}
                      className="mt-2 space-y-2"
                    >
                      <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="attend" id="attend" />
                        <Label htmlFor="attend" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Check className="h-4 w-4 text-green-600" />
                          参加します
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="absent" id="absent" />
                        <Label htmlFor="absent" className="flex items-center gap-2 cursor-pointer flex-1">
                          <X className="h-4 w-4 text-red-600" />
                          欠席します
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="undecided" id="undecided" />
                        <Label htmlFor="undecided" className="flex items-center gap-2 cursor-pointer flex-1">
                          <HelpCircle className="h-4 w-4 text-yellow-600" />
                          未定
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* 回答者名（任意） */}
                  <div>
                    <Label>お名前（任意）</Label>
                    <Input
                      value={respondentName}
                      onChange={(e) => setRespondentName(e.target.value)}
                      placeholder="山田太郎"
                      className="mt-1"
                    />
                  </div>

                  {/* 備考 */}
                  <div>
                    <Label>備考（任意）</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="欠席理由、遅刻の可能性など"
                      className="mt-1"
                    />
                  </div>

                  {/* 送信ボタン */}
                  <Button
                    className="w-full"
                    onClick={() =>
                      submitResponse.mutate({
                        eventId,
                        householdId: selectedHousehold,
                        response,
                        respondentName: respondentName || undefined,
                        notes: notes || undefined,
                      })
                    }
                    disabled={submitResponse.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {respondedHouseholds.has(selectedHousehold) ? "回答を更新" : "回答を送信"}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
