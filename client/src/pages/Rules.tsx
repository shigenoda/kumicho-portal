import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Scale, Plus, Edit, Save } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Rules() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { data: rules = [], refetch } = trpc.rules.list.useQuery();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (!isAuthenticated) {
    return <div className="page-container flex items-center justify-center min-h-screen">ログインが必要です</div>;
  }

  const decidedRules = rules.filter((r) => r.status === "decided");
  const pendingRules = rules.filter((r) => r.status === "pending");

  return (
    <div className="page-container">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-600 to-red-700 text-white py-6">
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
                <Scale className="w-6 h-6" />
                ルール・決定事項
              </h1>
              <p className="text-red-100">会費・ローテーション・出不足金</p>
            </div>
          </div>
          <CreateRuleDialog 
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
        {/* Decided Rules */}
        {decidedRules.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">✓ 決定事項</h2>
            <div className="space-y-4">
              {decidedRules.map((rule: any) => (
                <Card key={rule.id} className="p-4 sm:p-6 border-l-4 border-l-green-600">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold mb-2">{rule.title}</h3>
                    <EditRuleDialog rule={rule} onSuccess={() => refetch()} />
                  </div>
                  <p className="text-muted-foreground mb-3">{rule.summary}</p>
                  <div className="bg-muted p-4 rounded text-sm text-muted-foreground whitespace-pre-wrap">
                    {rule.details}
                  </div>
                  {rule.evidenceLinks && rule.evidenceLinks.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-2">根拠:</p>
                      <ul className="space-y-1">
                        {rule.evidenceLinks.map((link: string, idx: number) => (
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
          </section>
        )}

        {/* Pending Rules */}
        {pendingRules.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">⏳ 検討中</h2>
            <div className="space-y-4">
              {pendingRules.map((rule: any) => (
                <Card key={rule.id} className="p-4 sm:p-6 border-l-4 border-l-yellow-600 bg-yellow-50 dark:bg-yellow-900/10">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-2">
                      <span className="badge-hypothesis">検討中</span>
                      <h3 className="font-semibold">{rule.title}</h3>
                    </div>
                    <EditRuleDialog rule={rule} onSuccess={() => refetch()} />
                  </div>
                  <p className="text-muted-foreground mb-3">{rule.summary}</p>
                  <div className="bg-muted p-4 rounded text-sm text-muted-foreground whitespace-pre-wrap">
                    {rule.details}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {rules.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">ルールがまだ登録されていません</p>
            <CreateRuleDialog 
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

function CreateRuleDialog({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<string>("decided");
  const [evidenceLinks, setEvidenceLinks] = useState("");
  const [editorName, setEditorName] = useState("");

  const createRule = trpc.edit.createRule.useMutation({
    onSuccess: () => {
      toast.success("ルールを作成しました");
      setTitle("");
      setSummary("");
      setDetails("");
      setStatus("decided");
      setEvidenceLinks("");
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
        <Button className="bg-white text-red-700 hover:bg-red-50">
          <Plus className="w-4 h-4 mr-2" />
          新規ルール
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>新規ルール</DialogTitle>
          <DialogDescription>新しいルール・決定事項を追加します</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium">タイトル</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="会費徴収ルール"
            />
          </div>
          <div>
            <label className="text-sm font-medium">ステータス</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="decided">決定</SelectItem>
                <SelectItem value="pending">検討中</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">概要</label>
            <Input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="ルールの概要"
            />
          </div>
          <div>
            <label className="text-sm font-medium">詳細</label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="ルールの詳細内容"
              rows={6}
            />
          </div>
          <div>
            <label className="text-sm font-medium">根拠リンク（改行区切り）</label>
            <Textarea
              value={evidenceLinks}
              onChange={(e) => setEvidenceLinks(e.target.value)}
              placeholder="https://example.com/evidence1&#10;https://example.com/evidence2"
              rows={3}
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
            onClick={() => createRule.mutate({
              title,
              summary,
              details,
              status: status as any,
              evidenceLinks: evidenceLinks.split("\n").map(l => l.trim()).filter(Boolean),
              editorName: editorName || undefined,
            })}
            disabled={!title || !summary || createRule.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            ルールを作成
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditRuleDialog({ rule, onSuccess }: { rule: any; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(rule.title);
  const [summary, setSummary] = useState(rule.summary);
  const [details, setDetails] = useState(rule.details);
  const [status, setStatus] = useState(rule.status);
  const [evidenceLinks, setEvidenceLinks] = useState(rule.evidenceLinks?.join("\n") || "");
  const [editorName, setEditorName] = useState("");

  const updateRule = trpc.edit.updateRule.useMutation({
    onSuccess: () => {
      toast.success("ルールを更新しました");
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
          <DialogTitle>ルールを編集</DialogTitle>
          <DialogDescription>ルール内容を編集します</DialogDescription>
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
            <label className="text-sm font-medium">ステータス</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="decided">決定</SelectItem>
                <SelectItem value="pending">検討中</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">概要</label>
            <Input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">詳細</label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={6}
            />
          </div>
          <div>
            <label className="text-sm font-medium">根拠リンク（改行区切り）</label>
            <Textarea
              value={evidenceLinks}
              onChange={(e) => setEvidenceLinks(e.target.value)}
              rows={3}
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
            onClick={() => updateRule.mutate({
              id: rule.id,
              title,
              summary,
              details,
              status: status as any,
              evidenceLinks: evidenceLinks.split("\n").map((l: string) => l.trim()).filter(Boolean),
              editorName: editorName || undefined,
            })}
            disabled={updateRule.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            更新を保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
