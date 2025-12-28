import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Calendar, Package, FileText, BookOpen, HelpCircle, LogOut, Settings, Search, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function MemberHome() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: changelog = [] } = trpc.data.getChangelog.useQuery({ limit: 5 });
  const { data: leaderSchedule = [] } = trpc.memberTop.getLeaderSchedule.useQuery({});
  const { data: pendingQueue = [] } = trpc.memberTop.getPendingQueue.useQuery();

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const quickLinks = [
    { icon: Calendar, label: "年間カレンダー", path: "/calendar", description: "行事・締切・チェックリスト" },
    { icon: FileText, label: "河川清掃ガイド", path: "/river-cleaning", description: "準備・役割・安全" },
    { icon: Package, label: "備品台帳", path: "/inventory", description: "写真・数量・保管場所" },
    { icon: BookOpen, label: "テンプレ置き場", path: "/templates", description: "文書テンプレ" },
    { icon: AlertCircle, label: "ルール・決定事項", path: "/rules", description: "会費・ローテーション" },
    { icon: HelpCircle, label: "FAQ", path: "/faq", description: "よくある質問" },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#e5e5e5]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-light text-[#1a1a1a]">焼津市 集合住宅「グリーンピア」</h1>
              <p className="text-sm text-[#666666] mt-1">組長引き継ぎ（年度：2025）</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/admin")}
                className="text-[#666666] hover:text-[#1a1a1a]"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-[#666666] hover:text-[#1a1a1a]"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#999999]" />
            <input
              type="text"
              placeholder="検索（河川、備品、会費など）"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#e5e5e5] rounded text-sm text-[#1a1a1a] placeholder-[#999999] focus:outline-none focus:border-[#4a7c7e]"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Info Card */}
        <div className="mb-12 p-4 border border-[#e5e5e5] rounded bg-[#f9f9f9]">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#4a7c7e] flex-shrink-0 mt-0.5" />
            <div className="text-sm text-[#666666]">
              <p className="font-medium text-[#1a1a1a] mb-1">対象範囲</p>
              <p>焼津市 集合住宅「グリーンピア」| 年度：2025 | ロール：{user?.role || "member"}</p>
            </div>
          </div>
        </div>

        {/* 4 Cards Section */}
        <section className="mb-16">
          <h2 className="text-xl font-light text-[#1a1a1a] mb-8">今週の状況</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Card 1: This Week Tasks */}
            <Card className="p-6 border-[#e5e5e5] bg-white hover:shadow-sm transition-shadow">
              <h3 className="text-lg font-medium text-[#1a1a1a] mb-4">今週やること</h3>
              <div className="space-y-3">
                {[
                  "河川清掃準備（装備確認）",
                  "会費徴収リマインド",
                  "ローテ確定通知",
                ].map((task, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm text-[#666666]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#4a7c7e] mt-2 flex-shrink-0" />
                    <span>{task}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Card 2: Top Priorities */}
            <Card className="p-6 border-[#e5e5e5] bg-white hover:shadow-sm transition-shadow">
              <h3 className="text-lg font-medium text-[#1a1a1a] mb-4">最優先3課題</h3>
              <div className="space-y-3">
                {[
                  "先9年ローテを確定",
                  "会費徴収ルール更新",
                  "誤徴収防止マニュアル",
                ].map((priority, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm text-[#666666]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#8a7a5a] mt-2 flex-shrink-0" />
                    <span>{priority}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Card 3: Unresolved Issues */}
            <Card className="p-6 border-[#e5e5e5] bg-white hover:shadow-sm transition-shadow">
              <h3 className="text-lg font-medium text-[#1a1a1a] mb-4">未解決（仮説）</h3>
              <div className="space-y-3">
                {[
                  "免除条件の条文化",
                  "過去担当履歴の穴",
                  "出不足金の計算方法",
                ].map((issue, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm text-[#666666]">
                    <div className="px-2 py-0.5 bg-[#f5f1e8] text-[#8a7a5a] rounded text-xs font-medium">仮説</div>
                    <span className="mt-0.5">{issue}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Card 4: Pending Replies */}
            <Card className="p-6 border-[#e5e5e5] bg-white hover:shadow-sm transition-shadow">
              <h3 className="text-lg font-medium text-[#1a1a1a] mb-4">返信待ち</h3>
              <div className="space-y-3">
                {pendingQueue.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-start gap-3 text-sm text-[#666666]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#8a7a5a] mt-2 flex-shrink-0" />
                    <div>
                      <p>{item.title}</p>
                      <p className="text-xs text-[#999999] mt-1">→ {item.toWhom}</p>
                    </div>
                  </div>
                ))}
                {pendingQueue.length === 0 && (
                  <p className="text-sm text-[#999999]">返信待ちなし</p>
                )}
              </div>
            </Card>
          </div>
        </section>

        {/* 9-Year Rotation Schedule */}
        <section className="mb-16">
          <h2 className="text-xl font-light text-[#1a1a1a] mb-8">先9年 ローテーション</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e5e5]">
                  <th className="text-left py-3 px-4 font-medium text-[#1a1a1a]">年度</th>
                  <th className="text-left py-3 px-4 font-medium text-[#1a1a1a]">Primary</th>
                  <th className="text-left py-3 px-4 font-medium text-[#1a1a1a]">Backup</th>
                  <th className="text-left py-3 px-4 font-medium text-[#1a1a1a]">ステータス</th>
                </tr>
              </thead>
              <tbody>
                {leaderSchedule.map((schedule) => (
                  <tr key={schedule.id} className="border-b border-[#e5e5e5] hover:bg-[#f9f9f9]">
                    <td className="py-3 px-4 text-[#1a1a1a]">{schedule.year}</td>
                    <td className="py-3 px-4 text-[#666666]">{schedule.primaryHouseholdId}</td>
                    <td className="py-3 px-4 text-[#666666]">{schedule.backupHouseholdId}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        schedule.status === "confirmed" ? "bg-[#e8f5e9] text-[#2e7d32]" :
                        schedule.status === "conditional" ? "bg-[#fff3e0] text-[#e65100]" :
                        "bg-[#f5f5f5] text-[#666666]"
                      }`}>
                        {schedule.status === "confirmed" ? "確定" :
                         schedule.status === "conditional" ? "条件付き" :
                         "ドラフト"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Quick Links */}
        <section className="mb-16">
          <h2 className="text-xl font-light text-[#1a1a1a] mb-8">困ったらここ</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.path}
                  onClick={() => setLocation(link.path)}
                  className="p-6 border border-[#e5e5e5] rounded hover:border-[#4a7c7e] hover:bg-[#f9f9f9] transition-all text-left group"
                >
                  <Icon className="w-6 h-6 text-[#4a7c7e] mb-3 group-hover:text-[#2d5a5c]" />
                  <h3 className="font-medium text-[#1a1a1a] mb-1">{link.label}</h3>
                  <p className="text-sm text-[#999999]">{link.description}</p>
                  <ChevronRight className="w-4 h-4 text-[#999999] mt-3 group-hover:text-[#4a7c7e] group-hover:translate-x-1 transition-all" />
                </button>
              );
            })}
          </div>
        </section>

        {/* Latest Updates */}
        <section>
          <h2 className="text-xl font-light text-[#1a1a1a] mb-8">最新更新</h2>
          <div className="space-y-4">
            {changelog.map((item) => (
              <div key={item.id} className="flex items-start gap-4 p-4 border-l-2 border-[#4a7c7e] bg-[#f9f9f9]">
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#1a1a1a]">{item.summary}</p>
                  <p className="text-xs text-[#999999] mt-1">
                    {new Date(item.date).toLocaleDateString('ja-JP')} • {item.authorRole}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
