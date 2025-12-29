import { useAuth } from "@/_core/hooks/useAuth";
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
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { formId } = useParams<{ formId: string }>();
  const [answers, setAnswers] = useState<{ [key: number]: number | string | number[] }>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // フォーム詳細を取得
  const { data: forms = [] } = trpc.data.getUnansweredForms.useQuery();
  const form = useMemo(() => {
    return forms.find((f: any) => f.id === parseInt(formId || "0"));
  }, [forms, formId]);

  // 回答保存 API
  const submitFormResponse = trpc.data.submitFormResponse.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setTimeout(() => {
        setLocation("/");
      }, 2000);
    },
    onError: (error: any) => {
      console.error("Failed to submit form:", error);
      alert("フォームの提出に失敗しました");
    },
  });

  const handleSubmit = async () => {
    if (!form || !user) return;

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
      answers: Object.entries(answers).map(([questionId, answer]) => ({
        questionId: parseInt(questionId),
        choiceId: typeof answer === "number" ? answer : undefined,
        textAnswer: typeof answer === "string" ? answer : undefined,
      })),
    });
    setIsSubmitting(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">ログインが必要です</p>
          <Button onClick={() => setLocation("/")} className="bg-blue-900">
            ホームに戻る
          </Button>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-light text-gray-900 mb-2">
            回答を提出しました
          </h1>
          <p className="text-gray-600 mb-6">
            ご回答ありがとうございます。ホームページに戻ります。
          </p>
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
        </div>
      </main>
    </div>
  );
}
