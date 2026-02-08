import { X, BarChart3, Users, CheckCircle, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function FormStatsModal({
  formId,
  onClose,
}: {
  formId: number;
  onClose: () => void;
}) {
  const { data: stats, isLoading } = trpc.data.getFormStats.useQuery({ formId });

  if (isLoading || !stats) {
    return (
      <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full">
          <div className="p-12 text-center">
            <p className="text-sm font-light text-gray-400">読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  const responseRate =
    stats.totalHouseholds > 0
      ? ((stats.respondedCount / stats.totalHouseholds) * 100).toFixed(1)
      : "0";

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-6 flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-5 h-5 text-gray-400" />
              <h2 className="text-xl font-light text-gray-900 tracking-wide">
                統計
              </h2>
            </div>
            <p className="text-sm font-light text-gray-400">{stats.form.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-50 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="px-8 py-8 space-y-10">
          {/* Response Rate Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium tracking-wide text-gray-900 uppercase">
                回答率
              </h3>
            </div>

            <div className="mb-3">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-2xl font-light text-gray-900">
                  {stats.respondedCount} / {stats.totalHouseholds}{" "}
                  <span className="text-sm font-light text-gray-400">
                    住戸回答済み
                  </span>
                </span>
                <span className="text-2xl font-light text-blue-900">
                  {responseRate}%
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-900 rounded-full transition-all duration-500"
                  style={{ width: `${responseRate}%` }}
                />
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-light text-gray-400 uppercase tracking-wide">
                    総住戸数
                  </span>
                </div>
                <div className="text-2xl font-light text-gray-900">
                  {stats.totalHouseholds}
                </div>
              </div>
              <div className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-light text-gray-400 uppercase tracking-wide">
                    回答済み
                  </span>
                </div>
                <div className="text-2xl font-light text-gray-900">
                  {stats.respondedCount}
                </div>
              </div>
              <div className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-light text-gray-400 uppercase tracking-wide">
                    未回答
                  </span>
                </div>
                <div className="text-2xl font-light text-gray-900">
                  {stats.unansweredCount}
                </div>
              </div>
            </div>
          </section>

          {/* Per-Question Breakdown */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium tracking-wide text-gray-900 uppercase">
                質問別集計
              </h3>
            </div>

            <div className="space-y-8">
              {stats.questions.map((question: any, qIndex: number) => {
                const maxCount = Math.max(
                  ...question.choices.map((c: any) => c.count),
                  1
                );

                return (
                  <div
                    key={question.id}
                    className="border border-gray-100 rounded-lg p-6"
                  >
                    <div className="mb-1 text-xs font-light text-gray-400 tracking-wide">
                      Q{qIndex + 1}{" "}
                      {question.type === "single_choice"
                        ? "単一選択"
                        : "複数選択"}
                    </div>
                    <h4 className="text-base font-light text-gray-900 mb-6">
                      {question.text}
                    </h4>

                    {/* Horizontal Bar Chart */}
                    <div className="space-y-3">
                      {question.choices.map((choice: any) => {
                        const total = stats.respondedCount;
                        const percentage =
                          total > 0
                            ? ((choice.count / total) * 100).toFixed(1)
                            : "0";
                        const barWidth =
                          maxCount > 0
                            ? ((choice.count / maxCount) * 100).toFixed(1)
                            : "0";

                        return (
                          <div key={choice.id}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-sm font-light text-gray-900">
                                {choice.text}
                              </span>
                              <span className="text-xs font-light text-gray-400 tabular-nums ml-4 whitespace-nowrap">
                                {choice.count}票 ({percentage}%)
                              </span>
                            </div>
                            <div className="w-full h-6 bg-gray-100 rounded overflow-hidden">
                              <div
                                className="h-full bg-blue-900 rounded transition-all duration-500 flex items-center"
                                style={{ width: `${barWidth}%`, minWidth: choice.count > 0 ? '2px' : '0' }}
                              >
                                {Number(barWidth) > 15 && (
                                  <span className="text-xs font-light text-white pl-2">
                                    {choice.count}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Respondent Timeline */}
          {stats.respondents.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-medium tracking-wide text-gray-900 uppercase">
                  回答履歴
                </h3>
              </div>

              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-3">
                        住戸
                      </th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-3">
                        回答日時
                      </th>
                      <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wide px-4 py-3">
                        回答数
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...stats.respondents]
                      .sort(
                        (a: any, b: any) =>
                          new Date(b.submittedAt).getTime() -
                          new Date(a.submittedAt).getTime()
                      )
                      .map((respondent: any) => (
                        <tr
                          key={respondent.id}
                          className="border-b border-gray-50 last:border-0"
                        >
                          <td className="px-4 py-3 text-sm font-light text-gray-900">
                            {respondent.householdId}号室
                          </td>
                          <td className="px-4 py-3 text-sm font-light text-gray-400">
                            {new Date(respondent.submittedAt).toLocaleString(
                              "ja-JP",
                              {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-light text-gray-400 text-right">
                            {respondent.answerCount}件
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Unanswered Households */}
          {stats.unansweredHouseholds.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-medium tracking-wide text-gray-900 uppercase">
                  未回答住戸 ({stats.unansweredCount})
                </h3>
              </div>

              <div className="border border-gray-100 rounded-lg p-6">
                <div className="flex flex-wrap gap-2">
                  {stats.unansweredHouseholds.map((household: any) => (
                    <span
                      key={household.householdId}
                      className="inline-flex items-center px-3 py-1.5 bg-gray-50 border border-gray-100 rounded text-sm font-light text-gray-600"
                    >
                      {household.householdId}号室
                    </span>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
