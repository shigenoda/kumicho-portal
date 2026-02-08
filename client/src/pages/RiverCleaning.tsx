import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Droplets,
  Plus,
  Pencil,
  Trash2,
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
import { EditableSections } from "@/components/EditableSection";

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

  // ── SOP sections: icons and default data for EditableSections ──
  const sectionIcons: Record<string, React.ReactNode> = {
    policy: <Info className="w-4 h-4 text-gray-400" />,
    timeline: <CalendarDays className="w-4 h-4 text-gray-400" />,
    equipment: <ClipboardList className="w-4 h-4 text-gray-400" />,
    safety: <Shield className="w-4 h-4 text-gray-400" />,
    procedure: <Footprints className="w-4 h-4 text-gray-400" />,
    after: <CheckCircle2 className="w-4 h-4 text-gray-400" />,
    notes: <AlertTriangle className="w-4 h-4 text-gray-400" />,
  };

  const defaultSopSections = [
    { sectionKey: "policy", title: "2026年度 方針変更", sortOrder: 0, items: [
      "出不足金（でぶそくきん）制度を廃止",
      "小さなお子さんのいる家庭は参加免除",
      "参加は任意だが、可能な限り協力をお願いする運営へ移行",
    ]},
    { sectionKey: "timeline", title: "準備タイムライン", sortOrder: 1, items: [
      "T-14日: 組長会で日程確定、回覧作成開始",
      "T-7日: 回覧配布（参加確認）",
      "T-2日: 手袋・ゴミ袋を購入（100均、約500円）",
      "当日 7:50: 組長倉庫から道具を出す",
      "当日 8:00: グリーンピア玄関前に集合",
      "当日 8:00-9:00: 清掃作業（黒石川周辺）",
      "当日 9:00: 片付け・道具を倉庫に戻す",
    ]},
    { sectionKey: "equipment", title: "必要な道具", sortOrder: 2, items: [
      "平スコップ x2（倉庫）",
      "剣先スコップ x2（倉庫）",
      "鎌 x2（倉庫）",
      "三本爪（レーキ）x1（倉庫）",
      "三角ホー x2（倉庫）",
      "使い捨て手袋（組長が毎回購入）",
      "ゴミ袋（組長が毎回購入）",
      "各自: 長靴・帽子・飲み物",
    ]},
    { sectionKey: "safety", title: "安全確認事項", sortOrder: 3, items: [
      "雨天・増水時は中止（前日に判断し回覧で通知）",
      "長靴の着用必須（川辺の作業あり）",
      "夏季は帽子・水分補給を徹底（熱中症対策）",
      "単独行動禁止、声かけ合って作業する",
      "体調不良時は無理せず即時報告",
      "刃物（鎌・ホー）の取り扱いに注意",
    ]},
    { sectionKey: "procedure", title: "当日の流れ", sortOrder: 4, items: [
      "1. 集合（グリーンピア玄関前）- 出欠確認",
      "2. 道具配布・エリア分担の説明",
      "3. 作業開始（黒石川沿い、約1時間）",
      "4. 集合・点呼・ゴミまとめ",
      "5. 道具の洗浄・倉庫に返却",
      "6. 組長が記録を作成（このポータルに入力）",
    ]},
    { sectionKey: "after", title: "清掃後の作業", sortOrder: 5, items: [
      "道具を洗って乾かし、倉庫に収納",
      "参加者数・問題点をポータルに記録",
      "次回の改善点があればメモ",
      "使い捨て手袋の残数を確認、次回分の購入計画",
    ]},
    { sectionKey: "notes", title: "組長メモ（非公開情報）", sortOrder: 6, items: [
      "倉庫の鍵: 組長が管理（引き継ぎ時に渡す）",
      "水道蛇口: エントランス横にあり（道具洗浄用）",
      "ゴミ袋・手袋の購入費: 1回約500円（古紙回収収入から充当）",
      "ISY隣接ビル周辺は清掃範囲外（2025年度に確定済み）",
    ]},
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
          <EditableSections
            pageKey="river_cleaning"
            defaultSections={defaultSopSections}
            sectionIcons={sectionIcons}
          />
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
