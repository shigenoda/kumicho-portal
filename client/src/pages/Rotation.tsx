import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Calendar, Users, AlertTriangle, CheckCircle, Clock, Info } from "lucide-react";
import { useLocation } from "wouter";

/**
 * ローテーション表示ページ
 * 先9年分の組長ローテーションを表示
 * 免除理由と根拠も表示
 */
export default function Rotation() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // API からデータ取得
  const { data: schedules = [], isLoading: schedulesLoading } = trpc.memberTop.getLeaderSchedule.useQuery({});
  const { data: households = [], isLoading: householdsLoading } = trpc.leaderRotation.getHouseholds.useQuery();
  const { data: exemptionStatuses = [] } = trpc.leaderRotation.getExemptionStatus.useQuery({});
  const { data: exemptionTypes = [] } = trpc.leaderRotation.getExemptionTypes.useQuery();
  const { data: history = [] } = trpc.leaderRotation.getHistory.useQuery({});

  const isLoading = schedulesLoading || householdsLoading;

  // 住戸IDから入居日を取得
  const getHouseholdInfo = (householdId: string) => {
    const household = households.find((h) => h.householdId === householdId);
    return household;
  };

  // 住戸の担当回数を取得
  const getExperienceCount = (householdId: string) => {
    return history.filter((h) => h.householdId === householdId).length;
  };

  // 住戸の免除状態を取得
  const getExemptionInfo = (householdId: string) => {
    const status = exemptionStatuses.find((s) => s.householdId === householdId && s.status === "active");
    if (!status) return null;
    
    const type = exemptionTypes.find((t) => t.code === status.exemptionTypeCode);
    return {
      code: status.exemptionTypeCode,
      name: type?.name || status.exemptionTypeCode,
      endDate: status.endDate,
    };
  };

  // ステータスに応じたアイコンと色
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
            <CheckCircle className="w-3 h-3" />
            確定
          </span>
        );
      case "conditional":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded">
            <AlertTriangle className="w-3 h-3" />
            条件付き
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
            <Clock className="w-3 h-3" />
            仮
          </span>
        );
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setLocation("/")}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              戻る
            </Button>
            <div>
              <h1 className="text-xl font-light text-gray-900">組長ローテーション</h1>
              <p className="text-sm text-gray-500">先9年分の予定表</p>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="pt-24 pb-16 max-w-7xl mx-auto px-6">
        {/* 説明 */}
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">ローテーションルール</p>
              <ul className="space-y-1 leading-relaxed">
                <li>• 入居年月が古い順に選定</li>
                <li>• 免除対象：A（入居12ヶ月未満）、B（直近組長2年免除）、C（就任困難申告）</li>
                <li>• 毎年12月の組長会議で次年度組長を確定</li>
              </ul>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" />
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">ローテーションデータがまだ登録されていません</p>
          </div>
        ) : (
          <>
            {/* ローテーション表 */}
            <div className="mb-12">
              <h2 className="text-lg font-light text-gray-900 mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-900" />
                先9年ローテーション
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b">年度</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b">Primary（正）</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b">Backup（副）</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b">ステータス</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b">選定理由</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((schedule) => {
                      const isPast = schedule.year < currentYear;
                      const isCurrent = schedule.year === currentYear;
                      
                      return (
                        <tr
                          key={schedule.id}
                          className={`
                            ${isPast ? "bg-gray-50 text-gray-400" : ""}
                            ${isCurrent ? "bg-blue-50" : ""}
                            hover:bg-gray-50 transition-colors
                          `}
                        >
                          <td className="px-4 py-4 border-b">
                            <span className={`font-medium ${isCurrent ? "text-blue-900" : ""}`}>
                              {schedule.year}年度
                              {isCurrent && (
                                <span className="ml-2 text-xs bg-blue-900 text-white px-2 py-0.5 rounded">
                                  現年度
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-4 border-b">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-lg">{schedule.primaryHouseholdId}</span>
                              <span className="text-xs text-gray-500">号室</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 border-b">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-lg text-gray-600">{schedule.backupHouseholdId}</span>
                              <span className="text-xs text-gray-500">号室</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 border-b">
                            {getStatusBadge(schedule.status)}
                          </td>
                          <td className="px-4 py-4 border-b">
                            <p className="text-sm text-gray-600 max-w-md leading-relaxed">
                              {schedule.reason || "—"}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 住戸一覧と免除状態 */}
            <div className="mb-12">
              <h2 className="text-lg font-light text-gray-900 mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-900" />
                住戸一覧と免除状態
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {households.map((household) => {
                  const exemption = getExemptionInfo(household.householdId);
                  const experienceCount = getExperienceCount(household.householdId);
                  
                  return (
                    <div
                      key={household.id}
                      className={`p-4 border rounded ${
                        exemption ? "border-yellow-300 bg-yellow-50" : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="font-mono text-xl font-medium">{household.householdId}</span>
                          <span className="text-sm text-gray-500 ml-1">号室</span>
                        </div>
                        {exemption && (
                          <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                            免除（{exemption.code}）
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          入居：{household.moveInDate
                            ? new Date(household.moveInDate).toLocaleDateString("ja-JP", {
                                year: "numeric",
                                month: "long",
                              })
                            : "不明"}
                        </p>
                        <p>担当回数：{experienceCount}回</p>
                        {exemption && (
                          <p className="text-yellow-700">
                            {exemption.name}
                            {exemption.endDate && (
                              <span className="ml-1">
                                （〜{new Date(exemption.endDate).toLocaleDateString("ja-JP")}）
                              </span>
                            )}
                          </p>
                        )}
                        {household.notes && (
                          <p className="text-gray-500 text-xs mt-2">{household.notes}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 免除タイプ説明 */}
            <div className="p-6 bg-gray-50 rounded border border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-4">免除タイプ一覧</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {exemptionTypes.map((type) => (
                  <div key={type.id} className="p-4 bg-white rounded border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">
                        {type.code}
                      </span>
                      <span className="font-medium text-gray-900">{type.name}</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{type.description}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      {type.autoApply ? "自動適用" : "申告制"}
                      {type.durationMonths && ` • ${type.durationMonths}ヶ月`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
