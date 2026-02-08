import { ArrowLeft, CheckCircle, Home } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";

/**
 * フォーム回答画面 - スマホ最適化
 * ステップ: 部屋番号選択 → 質問に回答 → 送信完了
 */
export default function FormResponse() {
  const [, setLocation] = useLocation();
  const { formId } = useParams<{ formId: string }>();
  const [answers, setAnswers] = useState<{ [key: number]: number | string | number[] }>({});
  const [submitted, setSubmitted] = useState(false);
  const [selectedHousehold, setSelectedHousehold] = useState<string>("");

  const { data: forms = [] } = trpc.data.getActiveForms.useQuery();
  const { data: households = [] } = trpc.data.getHouseholds.useQuery();

  const form = useMemo(() => {
    return forms.find((f: any) => f.id === parseInt(formId || "0"));
  }, [forms, formId]);

  const sortedHouseholds = useMemo(() => {
    return [...households].sort((a: any, b: any) =>
      a.householdId.localeCompare(b.householdId)
    );
  }, [households]);

  const submitFormResponse = trpc.data.submitFormResponse.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      try {
        const answered = JSON.parse(localStorage.getItem("answeredForms") || "[]");
        if (!answered.includes(form?.id)) {
          answered.push(form?.id);
          localStorage.setItem("answeredForms", JSON.stringify(answered));
        }
      } catch {}
    },
    onError: () => {
      alert("送信に失敗しました。もう一度お試しください。");
    },
  });

  // すべての必須質問に回答済みか
  const allRequiredAnswered = useMemo(() => {
    if (!form) return false;
    return form.questions.every(
      (q: any) => !q.required || answers[q.id] !== undefined
    );
  }, [form, answers]);

  const canSubmit = selectedHousehold && allRequiredAnswered;

  const handleSubmit = () => {
    if (!form || !canSubmit) return;
    submitFormResponse.mutate({
      formId: form.id,
      householdId: selectedHousehold,
      answers: Object.entries(answers).map(([questionId, answer]) => ({
        questionId: parseInt(questionId),
        choiceId: typeof answer === "number" ? answer : undefined,
        textAnswer: typeof answer === "string" ? answer : undefined,
      })),
    });
  };

  const handleReset = () => {
    setAnswers({});
    setSelectedHousehold("");
    setSubmitted(false);
  };

  // フォームが見つからない
  if (!form) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-gray-500 mb-6">フォームが見つかりません</p>
          <button
            onClick={() => setLocation("/")}
            className="px-6 py-3 bg-gray-900 text-white rounded-xl text-lg"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  // 送信完了
  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-medium text-gray-900 mb-2">
            送信完了
          </h1>
          <p className="text-gray-500 mb-8">
            {selectedHousehold}号室の回答を受け付けました
          </p>
          <div className="space-y-3">
            <button
              onClick={handleReset}
              className="w-full px-6 py-4 bg-gray-900 text-white rounded-xl text-lg font-medium"
            >
              別の部屋の回答を入力
            </button>
            <button
              onClick={() => setLocation("/")}
              className="w-full px-6 py-4 border-2 border-gray-200 text-gray-700 rounded-xl text-lg font-medium flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              ホームに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* シンプルヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setLocation("/")}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-base font-medium text-gray-900 truncate">
            {form.title}
          </span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* フォーム説明 */}
        {form.description && (
          <p className="text-sm text-gray-500 leading-relaxed">
            {form.description}
          </p>
        )}

        {/* STEP 1: 部屋番号選択 */}
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
            部屋番号を選択
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {sortedHouseholds.map((h: any) => (
              <button
                key={h.id}
                onClick={() => setSelectedHousehold(h.householdId)}
                className={`py-4 rounded-xl text-center text-lg font-medium transition-all ${
                  selectedHousehold === h.householdId
                    ? "bg-gray-900 text-white shadow-lg scale-[1.02]"
                    : "bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-400"
                }`}
              >
                {h.householdId}
              </button>
            ))}
          </div>
        </section>

        {/* STEP 2: 質問 */}
        {selectedHousehold && form.questions.map((question: any, qIndex: number) => (
          <section key={question.id} className="bg-white rounded-xl p-5 border border-gray-200">
            <h3 className="text-base font-medium text-gray-900 mb-4">
              {form.questions.length > 1 && (
                <span className="text-gray-400 mr-1">Q{qIndex + 1}.</span>
              )}
              {question.questionText}
              {question.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </h3>

            {question.questionType === "single_choice" ? (
              <div className="space-y-2">
                {question.choices.map((choice: any) => {
                  const isSelected = answers[question.id] === choice.id;
                  return (
                    <button
                      key={choice.id}
                      onClick={() =>
                        setAnswers({ ...answers, [question.id]: choice.id })
                      }
                      className={`w-full py-3.5 px-4 rounded-xl text-left text-base font-medium transition-all ${
                        isSelected
                          ? "bg-blue-900 text-white shadow-md"
                          : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {choice.choiceText}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {question.choices.map((choice: any) => {
                  const currentAnswers = Array.isArray(answers[question.id])
                    ? (answers[question.id] as number[])
                    : [];
                  const isSelected = currentAnswers.includes(choice.id);
                  return (
                    <button
                      key={choice.id}
                      onClick={() => {
                        if (isSelected) {
                          setAnswers({
                            ...answers,
                            [question.id]: currentAnswers.filter(
                              (id) => id !== choice.id
                            ),
                          });
                        } else {
                          setAnswers({
                            ...answers,
                            [question.id]: [...currentAnswers, choice.id],
                          });
                        }
                      }}
                      className={`w-full py-3.5 px-4 rounded-xl text-left text-base font-medium transition-all ${
                        isSelected
                          ? "bg-blue-900 text-white shadow-md"
                          : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {choice.choiceText}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        ))}

        {/* STEP 3: 送信ボタン */}
        {selectedHousehold && (
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitFormResponse.isPending}
            className={`w-full py-4 rounded-xl text-lg font-medium transition-all ${
              canSubmit && !submitFormResponse.isPending
                ? "bg-gray-900 text-white shadow-lg hover:bg-gray-800 active:scale-[0.98]"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {submitFormResponse.isPending
              ? "送信中..."
              : `${selectedHousehold}号室で送信`}
          </button>
        )}

        {/* 余白 */}
        <div className="h-8" />
      </main>
    </div>
  );
}
