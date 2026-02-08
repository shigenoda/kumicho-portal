import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Droplets,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  Users,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Shield,
  ClipboardList,
  Footprints,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

interface RunFormData {
  date: string;
  participantsCount: string;
  issues: string;
  whatWorked: string;
  whatToImprove: string;
}

const emptyForm: RunFormData = {
  date: "",
  participantsCount: "",
  issues: "",
  whatWorked: "",
  whatToImprove: "",
};

export default function RiverCleaning() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // ── Query ──
  const { data: runs = [], isLoading } =
    trpc.data.getRiverCleaningRuns.useQuery();

  // ── Mutations ──
  const createRun = trpc.data.createRiverCleaningRun.useMutation({
    onSuccess: () => {
      utils.data.getRiverCleaningRuns.invalidate();
      closeAddDialog();
    },
  });
  const updateRun = trpc.data.updateRiverCleaningRun.useMutation({
    onSuccess: () => {
      utils.data.getRiverCleaningRuns.invalidate();
      closeEditDialog();
    },
  });
  const deleteRun = trpc.data.deleteRiverCleaningRun.useMutation({
    onSuccess: () => {
      utils.data.getRiverCleaningRuns.invalidate();
    },
  });

  // ── SOP accordion state ──
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Add dialog state ──
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState<RunFormData>(emptyForm);

  const closeAddDialog = () => {
    setShowAddDialog(false);
    setAddForm(emptyForm);
  };

  // ── Edit dialog state ──
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<RunFormData>(emptyForm);

  const openEditDialog = (item: any) => {
    setEditingId(item.id);
    const d = new Date(item.date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setEditForm({
      date: `${yyyy}-${mm}-${dd}`,
      participantsCount: item.participantsCount?.toString() ?? "",
      issues: item.issues ?? "",
      whatWorked: item.whatWorked ?? "",
      whatToImprove: item.whatToImprove ?? "",
    });
  };

  const closeEditDialog = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  // ── Handlers ──
  const handleAdd = () => {
    if (!addForm.date) return;
    createRun.mutate({
      date: new Date(addForm.date).toISOString(),
      participantsCount: addForm.participantsCount
        ? parseInt(addForm.participantsCount, 10)
        : undefined,
      issues: addForm.issues.trim() || undefined,
      whatWorked: addForm.whatWorked.trim() || undefined,
      whatToImprove: addForm.whatToImprove.trim() || undefined,
    });
  };

  const handleUpdate = () => {
    if (editingId === null || !editForm.date) return;
    updateRun.mutate({
      id: editingId,
      date: new Date(editForm.date).toISOString(),
      participantsCount: editForm.participantsCount
        ? parseInt(editForm.participantsCount, 10)
        : undefined,
      issues: editForm.issues.trim() || undefined,
      whatWorked: editForm.whatWorked.trim() || undefined,
      whatToImprove: editForm.whatToImprove.trim() || undefined,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("この記録を削除しますか？")) {
      deleteRun.mutate({ id });
    }
  };

  // ── Shared styles ──
  const inputClass =
    "w-full border border-gray-200 rounded px-3 py-2 text-sm font-light text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 transition-colors";
  const textareaClass = inputClass + " resize-none";

  // ── Form renderer (shared between add / edit) ──
  const renderForm = (
    form: RunFormData,
    setForm: (f: RunFormData) => void
  ) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-light text-gray-600 mb-1">
          実施日 <span className="text-red-400">*</span>
        </label>
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm font-light text-gray-600 mb-1">
          参加人数
        </label>
        <input
          type="number"
          min="0"
          value={form.participantsCount}
          onChange={(e) =>
            setForm({ ...form, participantsCount: e.target.value })
          }
          placeholder="例: 12"
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm font-light text-gray-600 mb-1">
          発生した問題
        </label>
        <textarea
          value={form.issues}
          onChange={(e) => setForm({ ...form, issues: e.target.value })}
          placeholder="問題があれば記入"
          rows={3}
          className={textareaClass}
        />
      </div>
      <div>
        <label className="block text-sm font-light text-gray-600 mb-1">
          うまくいったこと
        </label>
        <textarea
          value={form.whatWorked}
          onChange={(e) => setForm({ ...form, whatWorked: e.target.value })}
          placeholder="良かった点を記入"
          rows={3}
          className={textareaClass}
        />
      </div>
      <div>
        <label className="block text-sm font-light text-gray-600 mb-1">
          改善点
        </label>
        <textarea
          value={form.whatToImprove}
          onChange={(e) => setForm({ ...form, whatToImprove: e.target.value })}
          placeholder="次回の改善点を記入"
          rows={3}
          className={textareaClass}
        />
      </div>
    </div>
  );

  // ── SOP sections data ──
  const sopSections = [
    {
      key: "safety",
      icon: <Shield className="w-4 h-4 text-gray-400" />,
      title: "安全確認事項",
      items: [
        "天候チェック（雨天・増水時は中止）",
        "長靴・手袋の着用（必須）",
        "熱中症対策（帽子・水分補給）",
      ],
    },
    {
      key: "equipment",
      icon: <ClipboardList className="w-4 h-4 text-gray-400" />,
      title: "持ち物リスト",
      items: ["ゴミ袋（大・小）", "トング", "軍手", "飲み物"],
    },
    {
      key: "procedure",
      icon: <Footprints className="w-4 h-4 text-gray-400" />,
      title: "作業手順",
      items: [
        "集合（グリーンピア玄関前）",
        "分担決め（班長が指示）",
        "作業開始（安全確認後）",
        "集合・点呼",
        "記録・振り返り",
      ],
    },
    {
      key: "caution",
      icon: <Info className="w-4 h-4 text-gray-400" />,
      title: "注意事項",
      items: ["単独行動禁止", "無理のない範囲で作業する", "体調不良時は即時報告"],
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* ── Header ── */}
      <header className="border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-1 text-sm font-light text-gray-400 hover:text-gray-600 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            戻る
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Droplets className="w-5 h-5 text-gray-400" />
            <h1 className="text-2xl font-light text-gray-900 tracking-wide">
              河川清掃
            </h1>
          </div>
          <p className="text-sm font-light text-gray-400 ml-8">
            手順ガイド・活動記録
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* ══════════════════════════════════════════════
            Section 1: SOP Guide (collapsible)
            ══════════════════════════════════════════════ */}
        <section className="mb-12">
          <h2 className="text-lg font-light text-gray-900 tracking-wide mb-6">
            作業手順ガイド
          </h2>
          <div className="space-y-0 divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
            {sopSections.map((section) => (
              <Collapsible
                key={section.key}
                open={!!openSections[section.key]}
                onOpenChange={() => toggleSection(section.key)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full px-5 py-4 text-left hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {section.icon}
                    <span className="text-sm font-light text-gray-900">
                      {section.title}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-300 transition-transform ${
                      openSections[section.key] ? "rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-5 pb-4 pl-12">
                    <ul className="space-y-2">
                      {section.items.map((item, i) => (
                        <li
                          key={i}
                          className="text-sm font-light text-gray-500 flex items-start gap-2"
                        >
                          <span className="text-gray-300 mt-0.5 flex-shrink-0">
                            &mdash;
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            Section 2: Activity Log (CRUD)
            ══════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-light text-gray-900 tracking-wide">
              活動記録
            </h2>
            <button
              onClick={() => {
                setAddForm({
                  ...emptyForm,
                  date: new Date().toISOString().slice(0, 10),
                });
                setShowAddDialog(true);
              }}
              className="flex items-center gap-1.5 text-sm font-light text-gray-500 hover:text-gray-900 transition-colors"
            >
              <Plus className="w-4 h-4" />
              記録を追加
            </button>
          </div>

          {/* Loading */}
          {isLoading && (
            <p className="text-sm font-light text-gray-400 text-center py-16">
              読み込み中...
            </p>
          )}

          {/* Empty state */}
          {!isLoading && runs.length === 0 && (
            <div className="text-center py-20">
              <Droplets className="w-8 h-8 text-gray-200 mx-auto mb-4" />
              <p className="text-sm font-light text-gray-400">
                活動記録がまだありません。「記録を追加」で最初の記録を登録しましょう。
              </p>
            </div>
          )}

          {/* Runs list */}
          {!isLoading && runs.length > 0 && (
            <div className="space-y-4">
              {runs.map((run: any) => (
                <div
                  key={run.id}
                  className="border border-gray-100 rounded-lg p-5"
                >
                  {/* Card header: date + actions */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-gray-300" />
                      <span className="text-base font-light text-gray-900">
                        {new Date(run.date).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEditDialog(run)}
                        className="p-1.5 text-gray-300 hover:text-gray-600 transition-colors rounded hover:bg-gray-50"
                        title="編集"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(run.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded hover:bg-gray-50"
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Participant count */}
                  {run.participantsCount != null && (
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-3.5 h-3.5 text-gray-300" />
                      <span className="text-sm font-light text-gray-500">
                        参加者 {run.participantsCount}名
                      </span>
                    </div>
                  )}

                  {/* Detail fields */}
                  <div className="space-y-3">
                    {run.issues && (
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-gray-300 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-light text-gray-400 mb-0.5">
                            発生した問題
                          </p>
                          <p className="text-sm font-light text-gray-700 whitespace-pre-wrap">
                            {run.issues}
                          </p>
                        </div>
                      </div>
                    )}

                    {run.whatWorked && (
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-gray-300 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-light text-gray-400 mb-0.5">
                            うまくいったこと
                          </p>
                          <p className="text-sm font-light text-gray-700 whitespace-pre-wrap">
                            {run.whatWorked}
                          </p>
                        </div>
                      </div>
                    )}

                    {run.whatToImprove && (
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-3.5 h-3.5 text-gray-300 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-light text-gray-400 mb-0.5">
                            改善点
                          </p>
                          <p className="text-sm font-light text-gray-700 whitespace-pre-wrap">
                            {run.whatToImprove}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  {run.updatedAt && (
                    <p className="text-xs text-gray-300 font-light mt-4 pt-3 border-t border-gray-50">
                      最終更新:{" "}
                      {new Date(run.updatedAt).toLocaleDateString("ja-JP")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ══════════════════════════════════════════════
          Add Dialog
          ══════════════════════════════════════════════ */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) closeAddDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg font-light text-gray-900">
              活動記録を追加
            </DialogTitle>
          </DialogHeader>
          {renderForm(addForm, setAddForm)}
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              onClick={closeAddDialog}
              className="px-4 py-2 text-sm font-light text-gray-500 hover:text-gray-700 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleAdd}
              disabled={!addForm.date || createRun.isPending}
              className="px-4 py-2 text-sm font-light text-white bg-gray-900 rounded hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {createRun.isPending ? "保存中..." : "保存"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════
          Edit Dialog
          ══════════════════════════════════════════════ */}
      <Dialog open={editingId !== null} onOpenChange={(open) => { if (!open) closeEditDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg font-light text-gray-900">
              活動記録を編集
            </DialogTitle>
          </DialogHeader>
          {renderForm(editForm, setEditForm)}
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              onClick={closeEditDialog}
              className="px-4 py-2 text-sm font-light text-gray-500 hover:text-gray-700 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleUpdate}
              disabled={!editForm.date || updateRun.isPending}
              className="px-4 py-2 text-sm font-light text-white bg-gray-900 rounded hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {updateRun.isPending ? "保存中..." : "保存"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
