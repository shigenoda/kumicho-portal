import { X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function FormStatsModal({
  formId,
  onClose,
}: {
  formId: number;
  onClose: () => void;
}) {
  const { data: stats } = trpc.data.getFormStats.useQuery({ formId });

  if (!stats) {
    return (
      <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 text-center">
            <p className="text-gray-600">読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-light text-gray-900">
            結果: {stats.form.title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* 回答率概要 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-600 font-medium mb-1">
                総住戸数
              </div>
              <div className="text-3xl font-light text-blue-900">
                {stats.totalHouseholds}
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm text-green-600 font-medium mb-1">
                回答済み
              </div>
              <div className="text-3xl font-light text-green-900">
                {stats.respondedCount}
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-sm text-red-600 font-medium mb-1">
                未回答
              </div>
              <div className="text-3xl font-light text-red-900">
                {stats.unansweredCount}
              </div>
            </div>
          </div>

          {/* 質問別統計 */}
          {stats.questions.map((question: any, qIndex: number) => {
            const chartData = question.choices.map((choice: any) => ({
              name: choice.text,
              count: choice.count,
              percentage:
                stats.respondedCount > 0
                  ? ((choice.count / stats.respondedCount) * 100).toFixed(1)
                  : 0,
            }));

            return (
              <div key={question.id} className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Q{qIndex + 1}. {question.text}
                </h3>

                {/* グラフ表示 */}
                <div className="mb-6 bg-gray-50 rounded-lg p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: any) => `${value}人`}
                        contentStyle={{
                          backgroundColor: "#f9fafb",
                          border: "1px solid #e5e7eb",
                          borderRadius: "0.5rem",
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#1e3a8a"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* 詳細統計 */}
                <div className="space-y-3">
                  {question.choices.map((choice: any) => {
                    const total = stats.respondedCount;
                    const percentage =
                      total > 0
                        ? ((choice.count / total) * 100).toFixed(1)
                        : 0;
                    return (
                      <div key={choice.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-700">{choice.text}</span>
                          <span className="text-sm text-gray-600">
                            {choice.count} / {total} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-900 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* 未回答者一覧 */}
          {stats.unansweredHouseholds.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                未回答者 ({stats.unansweredCount})
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {stats.unansweredHouseholds.map((household: any) => (
                  <div key={household.id} className="text-sm text-gray-600">
                    {household.householdId}号室
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
