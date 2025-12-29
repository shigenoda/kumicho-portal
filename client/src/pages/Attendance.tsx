import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Calendar, Users, Check, X, HelpCircle, Mail, Bell } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function Attendance() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: events, isLoading } = trpc.attendance.listEvents.useQuery({});

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

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
              <h1 className="text-xl font-semibold">河川清掃 出欠表</h1>
              <p className="text-sm text-muted-foreground">各住戸の出欠を入力してください</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* イベント一覧 */}
        <div className="space-y-6">
          {events && events.length > 0 ? (
            events.map((event) => (
              <EventCard key={event.id} event={event} isAdmin={isAdmin} />
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">出欠イベントがありません</p>
<CreateEventDialog />
              </CardContent>
            </Card>
          )}
        </div>

        {/* イベント作成ボタン */}
        {events && events.length > 0 && (
          <div className="mt-8">
            <CreateEventDialog />
          </div>
        )}
      </main>
    </div>
  );
}

function EventCard({ event, isAdmin }: { event: any; isAdmin: boolean }) {
  const [, navigate] = useLocation();
  const { data: stats } = trpc.attendance.getResponseStats.useQuery({ eventId: event.id });

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    open: "bg-green-100 text-green-800",
    closed: "bg-yellow-100 text-yellow-800",
    completed: "bg-blue-100 text-blue-800",
  };

  const statusLabels: Record<string, string> = {
    draft: "下書き",
    open: "受付中",
    closed: "締切",
    completed: "完了",
  };

  const progressPercent = stats ? (stats.responded / stats.total) * 100 : 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{event.title}</CardTitle>
            <CardDescription className="mt-1">
              実施日: {new Date(event.scheduledDate).toLocaleDateString("ja-JP")}
              {" / "}
              締切: {new Date(event.deadline).toLocaleDateString("ja-JP")}
            </CardDescription>
          </div>
          <Badge className={statusColors[event.status] || "bg-gray-100"}>
            {statusLabels[event.status] || event.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* 回答状況 */}
        {stats && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">回答状況</span>
              <span className="font-medium">{stats.responded} / {stats.total} 件</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <div className="flex gap-4 mt-2 text-sm">
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3 text-green-600" />
                参加: {stats.attend}
              </span>
              <span className="flex items-center gap-1">
                <X className="h-3 w-3 text-red-600" />
                欠席: {stats.absent}
              </span>
              <span className="flex items-center gap-1">
                <HelpCircle className="h-3 w-3 text-yellow-600" />
                未定: {stats.undecided}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                未回答: {stats.notResponded}
              </span>
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => navigate(`/attendance/${event.id}`)}>
            出欠を入力する
          </Button>
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => navigate(`/attendance/${event.id}/admin`)}>
                <Users className="h-4 w-4 mr-2" />
                回答一覧
              </Button>
              <AdminEventActions event={event} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AdminEventActions({ event }: { event: any }) {
  const utils = trpc.useUtils();
  const updateStatus = trpc.attendance.updateEventStatus.useMutation({
    onSuccess: () => {
      utils.attendance.listEvents.invalidate();
      toast.success("ステータスを更新しました");
    },
  });
  const sendReminders = trpc.attendance.sendReminders.useMutation({
    onSuccess: (data) => {
      toast.success(`リマインダーを送信しました（${data.sentCount}件）`);
    },
  });

  return (
    <div className="flex gap-2">
      <Select
        value={event.status}
        onValueChange={(value) => updateStatus.mutate({ id: event.id, status: value as any })}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="draft">下書き</SelectItem>
          <SelectItem value="open">受付中</SelectItem>
          <SelectItem value="closed">締切</SelectItem>
          <SelectItem value="completed">完了</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        onClick={() => sendReminders.mutate({ eventId: event.id })}
        disabled={sendReminders.isPending}
      >
        <Bell className="h-4 w-4" />
      </Button>
    </div>
  );
}

function CreateEventDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [scheduledDate, setScheduledDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");

  const utils = trpc.useUtils();
  const createEvent = trpc.attendance.createEvent.useMutation({
    onSuccess: () => {
      utils.attendance.listEvents.invalidate();
      setOpen(false);
      setTitle("");
      setScheduledDate("");
      setDeadline("");
      setDescription("");
      toast.success("出欠イベントを作成しました");
    },
    onError: (error) => {
      console.error("createEvent error:", error);
      toast.error(`エラー: ${error.message}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Calendar className="h-4 w-4 mr-2" />
          出欠イベントを作成
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>出欠イベントを作成</DialogTitle>
          <DialogDescription>河川清掃の出欠を取るイベントを作成します</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium">タイトル</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="2026年度 4月 河川清掃"
            />
          </div>
          <div>
            <label className="text-sm font-medium">年度</label>
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">実施予定日</label>
            <Input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">回答締切</label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">説明（任意）</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="集合場所、持ち物など"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => createEvent.mutate({ title, year, scheduledDate, deadline, description })}
            disabled={!title || !scheduledDate || !deadline || createEvent.isPending}
          >
            作成
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
