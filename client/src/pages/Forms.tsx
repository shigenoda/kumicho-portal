import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2, BarChart3, Download, X, ArrowLeft, UserPlus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { FormStatsModal } from "./FormStats";

/**
 * フォーム管理画面 - Admin限定
 * 汎用フォーム作成・編集・削除・回答結果管理
 */
export default function Forms() {
  const [, setLocation] = useLocation();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingFormId, setEditingFormId] = useState<number | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [questions, setQuestions] = useState<
    Array<{ text: string; type: "single_choice" | "multiple_choice"; choices: string[] }>
  >([]);

  const { data: forms = [] } = trpc.data.getForms.useQuery();
  const createFormMutation = trpc.data.createForm.useMutation();
  const deleteFormMutation = trpc.data.deleteForm.useMutation();
  const utils = trpc.useUtils();

  const handleDeleteForm = async (formId: number) => {
    if (!confirm("このフォームを削除してもよろしいですか？")) return;
    try {
      await deleteFormMutation.mutateAsync({ formId });
      await utils.data.getForms.invalidate();
      alert("フォームが削除されました");
    } catch (error) {
      console.error("Form deletion error:", error);
      alert("フォーム削除に失敗しました");
    }
  };

  const handleDownloadCSV = async (formId: number) => {
    try {
      const stats = await utils.data.getFormStats.fetch({ formId });
      if (!stats) return;

      const rows: string[][] = [["質問", "選択肢", "回答数", "回答率(%)"]];

      for (const question of stats.questions) {
        for (const choice of question.choices) {
          const rate =
            stats.respondedCount > 0
              ? ((choice.count / stats.respondedCount) * 100).toFixed(1)
              : "0.0";
          rows.push([question.text, choice.text, String(choice.count), rate]);
        }
      }

      const csvContent = rows
        .map((row) =>
          row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

      const bom = "\uFEFF";
      const blob = new Blob([bom + csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${stats.form.title}_集計結果.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("CSV download error:", error);
      alert("CSVダウンロードに失敗しました");
    }
  };

  const handleCreateForm = async () => {
    if (!formTitle.trim()) {
      alert("フォームタイトルを入力してください");
      return;
    }
    if (questions.length === 0) {
      alert("最低1つの質問を追加してください");
      return;
    }
    if (questions.some(q => q.choices.length < 2)) {
      alert("各質問に最低2つの選択肢を追加してください");
      return;
    }

    try {
      await createFormMutation.mutateAsync({
        title: formTitle,
        description: formDescription,
        dueDate: dueDate || undefined,
        questions: questions.map(q => ({
          text: q.text,
          type: q.type,
          choices: q.choices.filter(c => c.trim()),
        })),
      });

      await utils.data.getForms.invalidate();

      setShowCreateForm(false);
      setFormTitle("");
      setFormDescription("");
      setDueDate("");
      setQuestions([]);
      alert("フォームが作成されました");
    } catch (error) {
      console.error("Form creation error:", error);
      alert("フォーム作成に失敗しました");
    }
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { text: "", type: "single_choice", choices: ["", ""] },
    ]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const newQuestions = [...questions];
    if (field === "text") {
      newQuestions[index].text = value;
    } else if (field === "type") {
      newQuestions[index].type = value;
    }
    setQuestions(newQuestions);
  };

  const addChoice = (questionIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].choices.push("");
    setQuestions(newQuestions);
  };

  const updateChoice = (questionIndex: number, choiceIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].choices[choiceIndex] = value;
    setQuestions(newQuestions);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const removeChoice = (questionIndex: number, choiceIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].choices = newQuestions[questionIndex].choices.filter(
      (_, i) => i !== choiceIndex
    );
    setQuestions(newQuestions);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-900 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-light">戻る</span>
          </button>
          <h1 className="text-2xl font-medium text-gray-900 tracking-wide">フォーム管理</h1>
          <p className="text-sm font-light text-gray-400 mt-1">アンケートの作成・編集・回答結果管理</p>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="pb-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* 作成ボタン */}
          <div className="mb-8 flex gap-2">
            <FormCreateButton />
          </div>

          {/* フォーム一覧 */}
          <div className="space-y-4">
            {forms.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">フォームがまだ作成されていません</p>
              </div>
            ) : (
              forms.map((form: any) => (
                <div key={form.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{form.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{form.description}</p>
                      <div className="flex gap-4 mt-3 text-sm text-gray-500">
                        <span>ステータス: {form.status}</span>
                        <span>回答: {form.responseCount ?? 0}/{form.totalHouseholds ?? 9} 世帯</span>
                        {form.dueDate && (
                          <span>
                            期限: {new Date(form.dueDate).toLocaleDateString("ja-JP")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={() => setLocation(`/form-response/${form.id}`)}
                      >
                        <UserPlus className="w-4 h-4" />
                        代理入力
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={() => {
                          setSelectedFormId(form.id);
                          setShowStats(true);
                        }}
                      >
                        <BarChart3 className="w-4 h-4" />
                        統計
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={() => setLocation(`/form-builder?id=${form.id}`)}
                      >
                        <Edit2 className="w-4 h-4" />
                        編集
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={() => handleDownloadCSV(form.id)}
                      >
                        <Download className="w-4 h-4" />
                        DL
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteForm(form.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* フォーム作成モーダル */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-medium text-gray-900">新しいフォームを作成</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* フォーム基本情報 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  フォームタイトル
                </label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="例：河川清掃出欠"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  説明
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="フォームの説明を入力"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-900"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  回答期限
                </label>
                <Input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* 質問管理 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">質問</h3>
                  <Button
                    onClick={addQuestion}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    質問を追加
                  </Button>
                </div>

                <div className="space-y-6">
                  {questions.map((question, qIndex) => (
                    <div key={qIndex} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <Input
                            value={question.text}
                            onChange={(e) => updateQuestion(qIndex, "text", e.target.value)}
                            placeholder="質問を入力"
                            className="w-full mb-3"
                          />
                          <select
                            value={question.type}
                            onChange={(e) =>
                              updateQuestion(
                                qIndex,
                                "type",
                                e.target.value as "single_choice" | "multiple_choice"
                              )
                            }
                            className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-900"
                          >
                            <option value="single_choice">単一選択</option>
                            <option value="multiple_choice">複数選択</option>
                          </select>
                        </div>
                        <button
                          onClick={() => removeQuestion(qIndex)}
                          className="ml-4 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* 選択肢 */}
                      <div className="space-y-2 ml-4">
                        {question.choices.map((choice, cIndex) => (
                          <div key={cIndex} className="flex items-center gap-2">
                            <Input
                              value={choice}
                              onChange={(e) =>
                                updateChoice(qIndex, cIndex, e.target.value)
                              }
                              placeholder={`選択肢 ${cIndex + 1}`}
                              className="flex-1"
                            />
                            <button
                              onClick={() => removeChoice(qIndex, cIndex)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <Button
                          onClick={() => addChoice(qIndex)}
                          variant="outline"
                          size="sm"
                          className="mt-2"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          選択肢を追加
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 保存ボタン */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => setShowCreateForm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleCreateForm}
                  className="flex-1 bg-blue-900 hover:bg-blue-800 text-white"
                >
                  作成
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 統計表示モーダル */}
      {showStats && selectedFormId && (
        <FormStatsModal
          formId={selectedFormId}
          onClose={() => {
            setShowStats(false);
            setSelectedFormId(null);
          }}
        />
      )}
    </div>
  );
}

// フォーム作成ボタンコンポーネント
function FormCreateButton() {
  const [, navigate] = useLocation();

  return (
    <Button
      onClick={() => navigate("/form-builder")}
      className="bg-blue-900 hover:bg-blue-800 text-white flex items-center gap-2"
    >
      <Plus className="w-4 h-4" />
      新しいフォームを作成
    </Button>
  );
}
