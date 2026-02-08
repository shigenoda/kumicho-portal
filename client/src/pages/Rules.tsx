import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  Scale,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  FlaskConical,
  LinkIcon,
  X,
  ShieldCheck,
  ShieldX,
  Copy,
  Check,
  Clock,
} from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type RuleStatus = "draft" | "decided" | "published";

interface RuleFormData {
  title: string;
  summary: string;
  details: string;
  status: RuleStatus;
  evidenceLinks: string[];
  isHypothesis: boolean;
}

const emptyFormData: RuleFormData = {
  title: "",
  summary: "",
  details: "",
  status: "draft",
  evidenceLinks: [],
  isHypothesis: false,
};

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: {
      label: "下書き",
      className: "bg-gray-100 text-gray-600 border border-gray-200",
    },
    decided: {
      label: "決定",
      className: "bg-blue-50 text-blue-700 border border-blue-200",
    },
    published: {
      label: "公開中",
      className: "bg-green-50 text-green-700 border border-green-200",
    },
  };

  const { label, className } = config[status] ?? config.draft;

  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${className}`}>
      {label}
    </span>
  );
}

export default function Rules() {
  const [, setLocation] = useLocation();
  const [selectedYear, setSelectedYear] = useState(2026);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<(RuleFormData & { id: number }) | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(emptyFormData);
  const [newLink, setNewLink] = useState("");

  // Exemption dialog state
  const [showExemptionDialog, setShowExemptionDialog] = useState(false);
  const [exemptionForm, setExemptionForm] = useState({ householdId: "", reason: "", status: "approved" as "pending" | "approved" | "rejected" });

  // tRPC queries and mutations
  const utils = trpc.useUtils();
  const { data: rules = [] } = trpc.data.getRules.useQuery();
  const { data: rotationData } = trpc.data.getRotationWithReasons.useQuery({ year: selectedYear });
  const { data: exemptions = [] } = trpc.data.getExemptions.useQuery({ year: selectedYear });
  const { data: households = [] } = trpc.data.getHouseholds.useQuery();

  const createMutation = trpc.data.createRule.useMutation({
    onSuccess: () => {
      utils.data.getRules.invalidate();
      setShowCreateDialog(false);
      setFormData(emptyFormData);
      setNewLink("");
    },
  });

  const updateMutation = trpc.data.updateRule.useMutation({
    onSuccess: () => {
      utils.data.getRules.invalidate();
      setEditingRule(null);
      setFormData(emptyFormData);
      setNewLink("");
    },
  });

  const deleteMutation = trpc.data.deleteRule.useMutation({
    onSuccess: () => {
      utils.data.getRules.invalidate();
    },
  });

  const createExemptionMutation = trpc.data.createExemption.useMutation({
    onSuccess: () => {
      utils.data.getExemptions.invalidate();
      utils.data.getRotationWithReasons.invalidate();
      setShowExemptionDialog(false);
      setExemptionForm({ householdId: "", reason: "", status: "approved" });
    },
  });

  const updateExemptionMutation = trpc.data.updateExemption.useMutation({
    onSuccess: () => {
      utils.data.getExemptions.invalidate();
      utils.data.getRotationWithReasons.invalidate();
    },
  });

  const deleteExemptionMutation = trpc.data.deleteExemption.useMutation({
    onSuccess: () => {
      utils.data.getExemptions.invalidate();
      utils.data.getRotationWithReasons.invalidate();
    },
  });

  const copyExemptionsMutation = trpc.data.copyExemptionsToNextYear.useMutation({
    onSuccess: (data) => {
      utils.data.getExemptions.invalidate();
      alert(`${data.count}件の免除を次年度にコピーしました（ステータス: 保留）`);
    },
    onError: (err) => {
      alert(err.message);
    },
  });

  // Handlers
  const handleCreate = () => {
    if (!formData.title.trim() || !formData.summary.trim() || !formData.details.trim()) return;
    createMutation.mutate({
      title: formData.title,
      summary: formData.summary,
      details: formData.details,
      status: formData.status,
      evidenceLinks: formData.evidenceLinks,
      isHypothesis: formData.isHypothesis,
    });
  };

  const handleUpdate = () => {
    if (!editingRule) return;
    if (!formData.title.trim() || !formData.summary.trim() || !formData.details.trim()) return;
    updateMutation.mutate({
      id: editingRule.id,
      title: formData.title,
      summary: formData.summary,
      details: formData.details,
      status: formData.status,
      evidenceLinks: formData.evidenceLinks,
      isHypothesis: formData.isHypothesis,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("このルールを削除しますか？")) {
      deleteMutation.mutate({ id });
    }
  };

  const openCreateDialog = () => {
    setFormData(emptyFormData);
    setNewLink("");
    setShowCreateDialog(true);
  };

  const openEditDialog = (rule: any) => {
    setFormData({
      title: rule.title,
      summary: rule.summary,
      details: rule.details,
      status: rule.status,
      evidenceLinks: rule.evidenceLinks ?? [],
      isHypothesis: rule.isHypothesis ?? false,
    });
    setEditingRule({ ...rule });
    setNewLink("");
  };

  const addEvidenceLink = () => {
    const trimmed = newLink.trim();
    if (!trimmed) return;
    setFormData((prev) => ({
      ...prev,
      evidenceLinks: [...prev.evidenceLinks, trimmed],
    }));
    setNewLink("");
  };

  const removeEvidenceLink = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      evidenceLinks: prev.evidenceLinks.filter((_, i) => i !== index),
    }));
  };

  // Rotation data validation
  const isRotationDataValid =
    rotationData && typeof rotationData === "object" && "households" in rotationData;

  // Form dialog content (shared between create and edit)
  const renderFormFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1">タイトル</label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="ルールのタイトルを入力"
          className="font-light"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1">概要</label>
        <Input
          value={formData.summary}
          onChange={(e) => setFormData((prev) => ({ ...prev, summary: e.target.value }))}
          placeholder="簡単な概要を入力"
          className="font-light"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1">詳細</label>
        <Textarea
          value={formData.details}
          onChange={(e) => setFormData((prev) => ({ ...prev, details: e.target.value }))}
          placeholder="ルールの詳細を入力"
          rows={5}
          className="font-light"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1">ステータス</label>
        <Select
          value={formData.status}
          onValueChange={(val) =>
            setFormData((prev) => ({ ...prev, status: val as RuleStatus }))
          }
        >
          <SelectTrigger className="w-full font-light">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">下書き</SelectItem>
            <SelectItem value="decided">決定</SelectItem>
            <SelectItem value="published">公開中</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-900">仮説としてマーク</label>
        <Switch
          checked={formData.isHypothesis}
          onCheckedChange={(checked) =>
            setFormData((prev) => ({ ...prev, isHypothesis: checked }))
          }
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1">根拠リンク</label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newLink}
            onChange={(e) => setNewLink(e.target.value)}
            placeholder="https://..."
            className="font-light"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addEvidenceLink();
              }
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={addEvidenceLink}>
            追加
          </Button>
        </div>
        {formData.evidenceLinks.length > 0 && (
          <ul className="space-y-1">
            {formData.evidenceLinks.map((link, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm text-gray-600 font-light">
                <LinkIcon className="w-3 h-3 flex-shrink-0" />
                <span className="truncate flex-1">{link}</span>
                <button
                  type="button"
                  onClick={() => removeEvidenceLink(idx)}
                  className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <div className="page-container">
      {/* Header */}
      <header
        className="bg-cover bg-center text-white py-6 relative"
        style={{ backgroundImage: "url('/greenpia-yaizu.jpg')" }}
      >
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
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Scale className="w-6 h-6" />
              ルール・決定事項
            </h1>
            <p className="text-white/70 font-light">会費・ローテーション・出不足金</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {/* Rules Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">ルール一覧</h2>
            <Button onClick={openCreateDialog} size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />
              新規追加
            </Button>
          </div>

          {rules.length > 0 ? (
            <div className="space-y-3">
              {rules.map((rule: any) => {
                const isExpanded = expandedId === rule.id;
                return (
                  <Card
                    key={rule.id}
                    className="bg-white border border-gray-100 overflow-hidden"
                  >
                    {/* Card header - clickable to expand */}
                    <div className="flex items-start gap-3 p-4 sm:p-5">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : rule.id)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <StatusBadge status={rule.status} />
                          {rule.isHypothesis && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-amber-50 text-amber-700 border border-amber-200">
                              <FlaskConical className="w-3 h-3" />
                              仮説
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 mt-2">{rule.title}</h3>
                        <p className="text-sm text-gray-500 font-light mt-1 line-clamp-2">
                          {rule.summary}
                        </p>
                      </button>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEditDialog(rule)}
                          className="p-2 hover:bg-gray-50 rounded transition-colors text-gray-400 hover:text-blue-600"
                          title="編集"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="p-2 hover:bg-gray-50 rounded transition-colors text-gray-400 hover:text-red-600"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : rule.id)}
                          className="p-2 hover:bg-gray-50 rounded transition-colors text-gray-400"
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-gray-100">
                        <div className="bg-gray-50 p-4 rounded mt-4 text-sm text-gray-700 font-light whitespace-pre-wrap leading-relaxed">
                          {rule.details}
                        </div>

                        {rule.evidenceLinks && rule.evidenceLinks.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-gray-100">
                            <p className="text-xs font-medium text-gray-500 mb-2">根拠リンク</p>
                            <ul className="space-y-1">
                              {rule.evidenceLinks.map((link: string, idx: number) => (
                                <li key={idx} className="flex items-center gap-1.5">
                                  <LinkIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                  <a
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline font-light truncate"
                                  >
                                    {link}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {rule.updatedAt && (
                          <p className="text-xs text-gray-400 font-light mt-4">
                            最終更新: {new Date(rule.updatedAt).toLocaleDateString("ja-JP")}
                          </p>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="bg-white border border-gray-100 p-8 text-center">
              <Scale className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-light">ルールがまだ登録されていません</p>
              <Button onClick={openCreateDialog} variant="outline" size="sm" className="mt-4 gap-1.5">
                <Plus className="w-4 h-4" />
                最初のルールを追加
              </Button>
            </Card>
          )}
        </section>

        {/* Rotation Schedule Section */}
        <section className="pt-8 border-t border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">ローテーション表</h2>
          <p className="text-sm font-light text-gray-500 mb-6">
            入居順ベース・A/B/C免除区分で管理（令和7年11月 町内会長承認済）
          </p>

          {/* Year selector */}
          <div className="mb-6 flex gap-2 flex-wrap">
            {[2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034].map((year) => (
              <Button
                key={year}
                variant={selectedYear === year ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedYear(year)}
                className="font-light"
              >
                {year}
              </Button>
            ))}
          </div>

          {/* Rotation details */}
          {isRotationDataValid && (
            <div className="space-y-6">
              {/* Current schedule banner */}
              {(rotationData as any).schedule && (
                <Card className="bg-white border border-gray-100 p-4 sm:p-5 border-l-4 border-l-blue-500">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-xs text-gray-400 font-light mb-1">{selectedYear}年度 組長</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {(rotationData as any).schedule.primaryHouseholdId}号室
                        <span className="text-sm font-light text-gray-400 ml-2">
                          （{(rotationData as any).schedule.status === "confirmed" ? "確定" : (rotationData as any).schedule.status === "draft" ? "暫定" : (rotationData as any).schedule.status}）
                        </span>
                      </p>
                    </div>
                    {(rotationData as any).schedule.reason && (
                      <p className="text-xs font-light text-gray-500 sm:max-w-sm sm:text-right">
                        {(rotationData as any).schedule.reason}
                      </p>
                    )}
                  </div>
                </Card>
              )}

              {/* Household table */}
              <Card className="bg-white border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="text-left px-4 py-3 font-medium text-gray-600">号室</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">入居年月</th>
                        <th className="text-center px-4 py-3 font-medium text-gray-600">経験</th>
                        <th className="text-center px-4 py-3 font-medium text-gray-600">状態</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">免除理由</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(rotationData as any).households
                        .sort((a: any, b: any) => a.householdId.localeCompare(b.householdId))
                        .map((h: any) => {
                          const isPrimary = (rotationData as any).schedule?.primaryHouseholdId === h.householdId;
                          return (
                            <tr
                              key={h.householdId}
                              className={`border-b border-gray-50 ${
                                isPrimary
                                  ? "bg-blue-50"
                                  : h.isCandidate
                                  ? "bg-white"
                                  : "bg-gray-50/30"
                              }`}
                            >
                              <td className="px-4 py-3">
                                <span className={`font-medium ${isPrimary ? "text-blue-900" : "text-gray-900"}`}>
                                  {h.householdId}
                                </span>
                                {isPrimary && (
                                  <span className="ml-2 inline-block px-1.5 py-0.5 bg-blue-600 text-white text-[10px] rounded font-medium">
                                    担当
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 font-light text-gray-600">
                                {h.moveInDate
                                  ? new Date(h.moveInDate).toLocaleDateString("ja-JP", { year: "numeric", month: "short" })
                                  : "—"}
                              </td>
                              <td className="px-4 py-3 text-center font-light text-gray-600">
                                {h.leaderHistoryCount}回
                              </td>
                              <td className="px-4 py-3 text-center">
                                {h.isCandidate ? (
                                  <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">
                                    候補
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded font-medium">
                                    免除
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 font-light text-gray-500 text-xs">
                                {h.reasons.length > 0 ? (
                                  <span>
                                    {h.reasons.map((r: string) => {
                                      if (r === "A") return "A:入居12ヶ月未満";
                                      if (r === "B") return "B:直近組長24ヶ月免除";
                                      if (r === "C") return "C:就任困難申告";
                                      return r;
                                    }).join("、")}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Legend */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-gray-50 rounded border border-gray-100">
                  <p className="text-xs font-medium text-gray-600 mb-1">A: 入居12ヶ月未満</p>
                  <p className="text-xs font-light text-gray-400">自動免除。12ヶ月経過の翌月に復帰。</p>
                </div>
                <div className="p-3 bg-gray-50 rounded border border-gray-100">
                  <p className="text-xs font-medium text-gray-600 mb-1">B: 直近組長</p>
                  <p className="text-xs font-light text-gray-400">任期終了翌月から24ヶ月免除。</p>
                </div>
                <div className="p-3 bg-gray-50 rounded border border-gray-100">
                  <p className="text-xs font-medium text-gray-600 mb-1">C: 就任困難申告</p>
                  <p className="text-xs font-light text-gray-400">育児・健康・介護等。年1回(11-12月)に継続確認。</p>
                </div>
              </div>

              {/* Exemption Management */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {selectedYear}年度 免除申請（C区分）
                    </h3>
                    <p className="text-xs font-light text-gray-500 mt-0.5">
                      就任困難申告の管理。年1回（11〜12月）に継続確認。
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => {
                        if (confirm(`${selectedYear}年度の承認済み免除を${selectedYear + 1}年度にコピーしますか？（ステータスは保留になります）`)) {
                          copyExemptionsMutation.mutate({ fromYear: selectedYear, toYear: selectedYear + 1 });
                        }
                      }}
                      disabled={copyExemptionsMutation.isPending}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      次年度へコピー
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => {
                        setExemptionForm({ householdId: "", reason: "", status: "approved" });
                        setShowExemptionDialog(true);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      免除追加
                    </Button>
                  </div>
                </div>

                {exemptions.length > 0 ? (
                  <div className="space-y-2">
                    {exemptions.map((ex: any) => (
                      <Card key={ex.id} className="bg-white border border-gray-100 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-lg font-semibold text-gray-900 flex-shrink-0">
                              {ex.householdId}号室
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm text-gray-600 font-light truncate">{ex.reason}</p>
                              {ex.approvedAt && (
                                <p className="text-xs text-gray-400 font-light mt-0.5">
                                  承認日: {new Date(ex.approvedAt).toLocaleDateString("ja-JP")}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {/* Status badge */}
                            {ex.status === "approved" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">
                                <Check className="w-3 h-3" />
                                承認
                              </span>
                            ) : ex.status === "pending" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded font-medium">
                                <Clock className="w-3 h-3" />
                                保留
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded font-medium">
                                <X className="w-3 h-3" />
                                却下
                              </span>
                            )}
                            {/* Approve/reject buttons */}
                            {ex.status !== "approved" && (
                              <button
                                onClick={() => updateExemptionMutation.mutate({ id: ex.id, status: "approved" })}
                                className="p-1.5 hover:bg-green-50 rounded transition-colors text-gray-400 hover:text-green-600"
                                title="承認"
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </button>
                            )}
                            {ex.status !== "rejected" && (
                              <button
                                onClick={() => updateExemptionMutation.mutate({ id: ex.id, status: "rejected" })}
                                className="p-1.5 hover:bg-red-50 rounded transition-colors text-gray-400 hover:text-red-600"
                                title="却下"
                              >
                                <ShieldX className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (confirm("この免除申請を削除しますか？")) {
                                  deleteExemptionMutation.mutate({ id: ex.id });
                                }
                              }}
                              className="p-1.5 hover:bg-gray-50 rounded transition-colors text-gray-400 hover:text-red-600"
                              title="削除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="bg-white border border-gray-100 p-6 text-center">
                    <ShieldCheck className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 font-light">{selectedYear}年度の免除申請はありません</p>
                  </Card>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Create Rule Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-900">新規ルール追加</DialogTitle>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="font-light"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                createMutation.isPending ||
                !formData.title.trim() ||
                !formData.summary.trim() ||
                !formData.details.trim()
              }
            >
              {createMutation.isPending ? "保存中..." : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Rule Dialog */}
      <Dialog open={!!editingRule} onOpenChange={(open) => !open && setEditingRule(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-900">ルールを編集</DialogTitle>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingRule(null)}
              className="font-light"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={
                updateMutation.isPending ||
                !formData.title.trim() ||
                !formData.summary.trim() ||
                !formData.details.trim()
              }
            >
              {updateMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Exemption Dialog */}
      <Dialog open={showExemptionDialog} onOpenChange={setShowExemptionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900">{selectedYear}年度 免除申請追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">号室</label>
              <Select
                value={exemptionForm.householdId}
                onValueChange={(val) => setExemptionForm((prev) => ({ ...prev, householdId: val }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="号室を選択" />
                </SelectTrigger>
                <SelectContent>
                  {households
                    .sort((a: any, b: any) => a.householdId.localeCompare(b.householdId))
                    .map((h: any) => (
                      <SelectItem key={h.householdId} value={h.householdId}>
                        {h.householdId}号室
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">免除理由</label>
              <Textarea
                value={exemptionForm.reason}
                onChange={(e) => setExemptionForm((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="例: 就任困難（育児中のため）"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">ステータス</label>
              <Select
                value={exemptionForm.status}
                onValueChange={(val) => setExemptionForm((prev) => ({ ...prev, status: val as any }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">承認</SelectItem>
                  <SelectItem value="pending">保留</SelectItem>
                  <SelectItem value="rejected">却下</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExemptionDialog(false)}>
              キャンセル
            </Button>
            <Button
              onClick={() => {
                if (!exemptionForm.householdId || !exemptionForm.reason.trim()) return;
                createExemptionMutation.mutate({
                  householdId: exemptionForm.householdId,
                  year: selectedYear,
                  reason: exemptionForm.reason,
                  status: exemptionForm.status,
                });
              }}
              disabled={
                createExemptionMutation.isPending ||
                !exemptionForm.householdId ||
                !exemptionForm.reason.trim()
              }
            >
              {createExemptionMutation.isPending ? "追加中..." : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
