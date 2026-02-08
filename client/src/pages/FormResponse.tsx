import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";

/**
 * フォーム回答画面
 * ユーザーがフォームに回答し、提出できます
 */
export default function FormResponse() {
  const [, setLocation] = useLocation();
  const { formId } = useParams<{ formId: string }>();
  const [answers, setAnswers] = useState<{ [key: number]: number | string | number[] }>({});
  const [submitted, setSubmitted] = useState(false);
  const [submittedHousehold, setSubmittedHousehold] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedHousehold, setSelectedHousehold] = useState<string>("");

  // フォーム詳細を取得
  const { data: forms = [] } = trpc.data.getActiveForms.useQuery();

  // 住戸一覧を取得
  const { data: households = [] } = trpc.data.getHouseholds.useQuery();
  const form = useMemo(() => {
    return forms.find((f: any) => f.id === parseInt(formId || "0"));
  }, [forms, formId]);

  // 回答保存 API
  const submitFormResponse = trpc.data.submitFormResponse.useMutation({
    onSuccess: () => {
      setSubmittedHousehold(selectedHousehold);
      setSubmitted(true);
      // localStorage に回答済みフォームを記録
      try {
        const answered = JSON.parse(localStorage.getItem("answeredForms") || "[]");
        if (!answered.includes(form?.id)) {
          answered.push(form?.id);
          localStorage.setItem("answeredForms", JSON.stringify(answered));
        }
      } catch {}
    },
    onError: (error: any) => {
      console.error("Failed to submit form:", error);
      alert("フォームの提出に失敗しました");
    },
  });

  const handleSubmit = async () => {
    if (!form) return;

    // バリデーション：すべての必須質問に回答したか確認
    const unansweredQuestions = form.questions.filter(
      (q: any) => q.required && !answers[q.id]
    );

    if (unansweredQuestions.length > 0) {
      alert("すべての必須項目に回答してください");
      return;
    }

    setIsSubmitting(true);
    await submitFormResponse.mutate({
      formId: form.id,
      householdId: selectedHousehold || undefined,
      answers: Object.entries(answers).map(([questionId, answer]) => ({
        questionId: parseInt(questionId),
        choiceId: typeof answer === "number" ? answer : undefined,
        textAnswer: typeof answer === "string" ? answer : undefined,
      })),
    });
    setIsSubmitting(false);
  };

  if (!form) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">フォームが見つかりません</p>
          <Button onClick={() => setLocation("/")} className="bg-blue-900">
            ホームに戻る
          </Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-medium text-gray-900 mb-2">
            回答を提出しました
          </h1>
          <p className="text-gray-600 mb-6">
            {submittedHousehold
              ? `${submittedHousehold}号室の回答を保存しました。`
              : "ご回答ありがとうございます。"}
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => {
                setAnswers({});
                setSelectedHousehold("");
                setSubmitted(false);
                setSubmittedHousehold("");
              }}
              className="bg-blue-900 hover:bg-blue-800 text-white"
            >
              次の回答を入力
            </Button>
            <Button
              onClick={() => setLocation("/")}
              variant="outline"
            >
              ホームに戻る
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <header
        className="fixed top-0 left-0 right-0 bg-cover bg-center border-b border-gray-200 z-50"
        style={{ backgroundImage: "url('/greenpia-yaizu.jpg')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50" />
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4 relative">
          <button
            onClick={() => setLocation("/")}
            className="p-2 hover:bg-white/10 rounded transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-xl font-light text-white flex-1">
            フォーム回答
          </h1>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-6 py-12">
          {/* フォームタイトル */}
          <div className="mb-12">
            <h2 className="text-3xl font-light text-gray-900 mb-2">
              {form.title}
            </h2>
            {form.description && (
              <p className="text-gray-600 leading-relaxed">
                {form.description}
              </p>
            )}
            {form.dueDate && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
                期限: {new Date(form.dueDate).toLocaleDateString("ja-JP")}
              </div>
            )}
          </div>

          {/* 代理入力：住戸選択 */}
          <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              回答者（代理入力）
            </label>
            <select
              value={selectedHousehold}
              onChange={(e) => setSelectedHousehold(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 font-light focus:outline-none focus:ring-2 focus:ring-blue-900"
            >
              <option value="">（住戸を選択）</option>
              {households
                .sort((a: any, b: any) => a.householdId.localeCompare(b.householdId))
                .map((h: any) => (
                  <option key={h.id} value={h.householdId}>
                    {h.householdId}号室
                  </option>
                ))}
            </select>
            <p className="text-xs font-light text-gray-400 mt-2">
              紙で回収した回答を代理で入力する場合に選択してください
            </p>
          </div>

          {/* 質問フォーム */}
          <div className="space-y-8">
            {form.questions.map((question: any, qIndex: number) => (
              <div key={question.id} className="border-b border-gray-200 pb-8">
                <label className="block mb-4">
                  <span className="text-lg font-light text-gray-900">
                    Q{qIndex + 1}. {question.questionText}
                  </span>
                  {question.required && (
                    <span className="text-red-600 ml-1">*</span>
                  )}
                </label>

                {question.questionType === "single_choice" ? (
                  // ラジオボタン
                  <div className="space-y-3">
                    {question.choices.map((choice: any) => (
                      <label
                        key={choice.id}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={choice.id}
                          checked={answers[question.id] === choice.id}
                          onChange={(e) =>
                            setAnswers({
                              ...answers,
                              [question.id]: parseInt(e.target.value) as number,
                            })
                          }
                          className="w-4 h-4 text-blue-900 cursor-pointer"
                        />
                        <span className="text-gray-700 group-hover:text-gray-900">
                          {choice.choiceText}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  // チェックボックス
                  <div className="space-y-3">
                    {question.choices.map((choice: any) => (
                      <label
                        key={choice.id}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          value={choice.id}
                          checked={
                            Array.isArray(answers[question.id])
                              ? (answers[question.id] as number[]).includes(
                                  choice.id
                                )
                              : false
                          }
                          onChange={(e) => {
                            const currentAnswers = Array.isArray(
                              answers[question.id]
                            )
                              ? (answers[question.id] as number[])
                              : [];
                            if (e.target.checked) {
                              setAnswers({
                                ...answers,
                                [question.id]: [
                                  ...currentAnswers,
                                  choice.id,
                                ] as number[],
                              });
                            } else {
                              setAnswers({
                                ...answers,
                                [question.id]: currentAnswers.filter(
                                  (id) => id !== choice.id
                                ) as number[],
                              });
                            }
                          }}
                          className="w-4 h-4 text-blue-900 cursor-pointer"
                        />
                        <span className="text-gray-700 group-hover:text-gray-900">
                          {choice.choiceText}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 提出ボタン */}
          <div className="mt-12 flex gap-3">
            <Button
              onClick={() => setLocation("/")}
              variant="outline"
              className="flex-1"
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-blue-900 hover:bg-blue-800 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? "提出中..." : "提出"}
            </Button>
          </div>

          {/* ホームに戻る */}
          <div className="mt-8 text-center">
            <Button
              onClick={() => setLocation("/")}
              variant="ghost"
              className="text-gray-500 hover:text-gray-900 font-light"
            >
              ホームに戻る
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
