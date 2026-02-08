import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Trash2,
  Eye,
  Save,
  GripVertical,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

interface Question {
  id?: string;
  text: string;
  type: "single_choice" | "multiple_choice";
  choices: string[];
  required: boolean;
}

/**
 * フォーム作成画面 - Admin限定
 * 質問・選択肢の追加・編集・削除、ドラッグ&ドロップで順序変更
 */
export default function FormBuilder() {
  const [, navigate] = useLocation();

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const createFormMutation = trpc.data.createForm.useMutation();
  const utils = trpc.useUtils();

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      text: "",
      type: "single_choice",
      choices: ["", ""],
      required: true,
    };
    setQuestions([...questions, newQuestion]);
    setExpandedIndex(questions.length);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const newQuestions = [...questions];
    if (field === "text") {
      newQuestions[index].text = value;
    } else if (field === "type") {
      newQuestions[index].type = value;
    } else if (field === "required") {
      newQuestions[index].required = value;
    }
    setQuestions(newQuestions);
  };

  const updateChoice = (
    questionIndex: number,
    choiceIndex: number,
    value: string
  ) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].choices[choiceIndex] = value;
    setQuestions(newQuestions);
  };

  const addChoice = (questionIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].choices.push("");
    setQuestions(newQuestions);
  };

  const removeChoice = (questionIndex: number, choiceIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].choices = newQuestions[
      questionIndex
    ].choices.filter((_, i) => i !== choiceIndex);
    setQuestions(newQuestions);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const duplicateQuestion = (index: number) => {
    const newQuestion = { ...questions[index], id: `q-${Date.now()}` };
    setQuestions([...questions.slice(0, index + 1), newQuestion, ...questions.slice(index + 1)]);
  };

  const moveQuestion = (fromIndex: number, toIndex: number) => {
    const newQuestions = [...questions];
    const [removed] = newQuestions.splice(fromIndex, 1);
    newQuestions.splice(toIndex, 0, removed);
    setQuestions(newQuestions);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedIndex !== null && draggedIndex !== index) {
      moveQuestion(draggedIndex, index);
    }
    setDraggedIndex(null);
  };

  const handleSaveForm = async () => {
    if (!formTitle.trim()) {
      alert("フォームタイトルを入力してください");
      return;
    }
    if (questions.length === 0) {
      alert("最低1つの質問を追加してください");
      return;
    }
    if (questions.some((q) => !q.text.trim())) {
      alert("すべての質問にタイトルを入力してください");
      return;
    }
    if (questions.some((q) => q.choices.filter((c) => c.trim()).length < 2)) {
      alert("各質問に最低2つの選択肢を追加してください");
      return;
    }

    try {
      await createFormMutation.mutateAsync({
        title: formTitle,
        description: formDescription,
        dueDate: dueDate || undefined,
        questions: questions.map((q) => ({
          text: q.text,
          type: q.type,
          choices: q.choices.filter((c) => c.trim()),
          required: q.required,
        })),
      });

      await utils.data.getForms.invalidate();

      alert("フォームが作成されました");
      navigate("/forms");
    } catch (error) {
      console.error("Form creation error:", error);
      alert("フォーム作成に失敗しました");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <header
        className="fixed top-0 left-0 right-0 bg-cover bg-center border-b border-gray-200 z-50"
        style={{ backgroundImage: "url('/greenpia-yaizu.jpg')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50" />
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between relative">
          <h1 className="text-2xl font-light text-white">フォーム作成</h1>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowPreview(!showPreview)}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? "編集に戻る" : "プレビュー"}
            </Button>
            <Button
              onClick={handleSaveForm}
              className="bg-blue-900 hover:bg-blue-800 text-white flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              保存して公開
            </Button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {showPreview ? (
            // プレビューモード
            <FormPreview
              title={formTitle}
              description={formDescription}
              questions={questions}
            />
          ) : (
            // 編集モード
            <div className="space-y-8">
              {/* フォーム基本情報 */}
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    フォームタイトル
                  </label>
                  <Input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="例：河川清掃出欠"
                    className="w-full text-lg"
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
              </div>

              {/* 質問一覧 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">質問</h2>
                  <span className="text-sm text-gray-600">
                    {questions.length}個の質問
                  </span>
                </div>

                {questions.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 mb-4">質問がまだ追加されていません</p>
                    <Button
                      onClick={addQuestion}
                      className="bg-blue-900 hover:bg-blue-800 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      最初の質問を追加
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions.map((question, qIndex) => (
                      <div
                        key={question.id}
                        draggable
                        onDragStart={() => handleDragStart(qIndex)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(qIndex)}
                        className={`border rounded-lg p-6 transition-all ${
                          draggedIndex === qIndex
                            ? "opacity-50 bg-blue-50"
                            : "border-gray-200 bg-white hover:border-blue-300"
                        }`}
                      >
                        {/* 質問ヘッダー */}
                        <div className="flex items-start gap-4 mb-4">
                          <GripVertical className="w-5 h-5 text-gray-400 mt-1 cursor-grab active:cursor-grabbing" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-gray-600">
                                Q{qIndex + 1}
                              </span>
                              <Input
                                value={question.text}
                                onChange={(e) =>
                                  updateQuestion(qIndex, "text", e.target.value)
                                }
                                placeholder="質問を入力"
                                className="flex-1"
                              />
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <select
                                value={question.type}
                                onChange={(e) =>
                                  updateQuestion(
                                    qIndex,
                                    "type",
                                    e.target.value as
                                      | "single_choice"
                                      | "multiple_choice"
                                  )
                                }
                                className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-900"
                              >
                                <option value="single_choice">単一選択</option>
                                <option value="multiple_choice">複数選択</option>
                              </select>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={question.required}
                                  onChange={(e) =>
                                    updateQuestion(qIndex, "required", e.target.checked)
                                  }
                                  className="w-4 h-4"
                                />
                                <span>必須</span>
                              </label>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() =>
                                setExpandedIndex(
                                  expandedIndex === qIndex ? null : qIndex
                                )
                              }
                              className="p-2 hover:bg-gray-100 rounded transition-colors"
                            >
                              {expandedIndex === qIndex ? (
                                <ChevronUp className="w-4 h-4 text-gray-600" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-600" />
                              )}
                            </button>
                            <button
                              onClick={() => duplicateQuestion(qIndex)}
                              className="p-2 hover:bg-gray-100 rounded transition-colors"
                              title="複製"
                            >
                              <Copy className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => removeQuestion(qIndex)}
                              className="p-2 hover:bg-red-50 rounded transition-colors"
                              title="削除"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>

                        {/* 選択肢 */}
                        {expandedIndex === qIndex && (
                          <div className="ml-9 space-y-3 pt-4 border-t border-gray-200">
                            {question.choices.map((choice, cIndex) => (
                              <div key={cIndex} className="flex items-center gap-2">
                                <span className="text-sm text-gray-500 w-6">
                                  {question.type === "single_choice" ? "◯" : "☑"}
                                </span>
                                <Input
                                  value={choice}
                                  onChange={(e) =>
                                    updateChoice(qIndex, cIndex, e.target.value)
                                  }
                                  placeholder={`選択肢 ${cIndex + 1}`}
                                  className="flex-1"
                                />
                                {question.choices.length > 2 && (
                                  <button
                                    onClick={() => removeChoice(qIndex, cIndex)}
                                    className="p-2 hover:bg-red-50 rounded transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </button>
                                )}
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
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  onClick={addQuestion}
                  variant="outline"
                  className="w-full border-dashed border-2 border-blue-900 text-blue-900 hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  質問を追加
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// プレビューコンポーネント
function FormPreview({
  title,
  description,
  questions,
}: {
  title: string;
  description: string;
  questions: Question[];
}) {
  const [answers, setAnswers] = useState<Record<string, any>>({});

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gray-50 rounded-lg p-8 mb-8">
        <h1 className="text-3xl font-light text-gray-900 mb-4">{title}</h1>
        {description && <p className="text-gray-600">{description}</p>}
      </div>

      <div className="space-y-6">
        {questions.map((question, qIndex) => (
          <div key={question.id} className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Q{qIndex + 1}. {question.text}
              {question.required && <span className="text-red-600 ml-1">*</span>}
            </h3>

            <div className="space-y-3">
              {question.choices.map((choice, cIndex) => (
                <label key={cIndex} className="flex items-center gap-3 cursor-pointer">
                  {question.type === "single_choice" ? (
                    <input
                      type="radio"
                      name={`q-${question.id}`}
                      value={choice}
                      onChange={(e) =>
                        setAnswers({
                          ...answers,
                          [question.id || qIndex]: e.target.value,
                        })
                      }
                      className="w-4 h-4"
                    />
                  ) : (
                    <input
                      type="checkbox"
                      value={choice}
                      onChange={(e) => {
                        const current = answers[question.id || qIndex] || [];
                        if (e.target.checked) {
                          setAnswers({
                            ...answers,
                            [question.id || qIndex]: [...current, choice],
                          });
                        } else {
                          setAnswers({
                            ...answers,
                            [question.id || qIndex]: current.filter(
                              (c: string) => c !== choice
                            ),
                          });
                        }
                      }}
                      className="w-4 h-4"
                    />
                  )}
                  <span className="text-gray-700">{choice}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
