import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Settings, X, ArrowRight, BarChart3, CheckCircle, AlertCircle, FileText, Package, BookOpen, HelpCircle, FileCheck, CalendarDays, Mail } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { FormStatsModal } from "@/pages/FormStats";
import { QRCodeSVG } from "qrcode.react";


/**
 * Member トップページ - Minato Editorial Luxury デザイン
 * 「雑誌の目次」型レイアウト：左上ラベル、中央H1、下Index List、右下更新ログ
 */
export default function MemberHome() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();
  const [showSettings, setShowSettings] = useState(false);
  const [newEmails, setNewEmails] = useState<{ [key: number]: string }>({});
  const [showStats, setShowStats] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  const { data: households = [] } = trpc.data.getHouseholds.useQuery();
  const { data: residentEmails = [] } = trpc.data.getResidentEmails.useQuery();
  const { data: activeForms = [] } = trpc.data.getActiveForms.useQuery();
  const { data: allForms = [] } = trpc.data.getForms.useQuery();
  const { data: recentChanges = [] } = trpc.data.getChangelog.useQuery({ limit: 1 });

  // localStorage で回答済みフォームを追跡
  const [answeredFormIds, setAnsweredFormIds] = useState<number[]>([]);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("answeredForms") || "[]");
      setAnsweredFormIds(stored);
    } catch {}
  }, []);

  // 検索デバウンス
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 検索結果の表示/非表示
  useEffect(() => {
    setShowSearchResults(debouncedQuery.length > 0);
  }, [debouncedQuery]);

  // 検索窓の外をクリックしたら閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 検索API
  const { data: searchResults, isLoading: isSearching } = trpc.search.global.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length > 0 }
  );

  const totalResults = useMemo(() => {
    if (!searchResults || Array.isArray(searchResults)) return 0;
    return (
      (searchResults.posts?.length || 0) +
      (searchResults.inventory?.length || 0) +
      (searchResults.rules?.length || 0) +
      (searchResults.faq?.length || 0) +
      (searchResults.templates?.length || 0) +
      (searchResults.events?.length || 0)
    );
  }, [searchResults]);

  const navigateAndCloseSearch = (path: string) => {
    setShowSearchResults(false);
    setSearchQuery("");
    setLocation(path);
  };

  // 現在の年度を自動判定（4月が新年度）
  const currentYear = useMemo(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    return month >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  }, []);

  const nextYear = currentYear + 1;

  // 現年度・次年度の組長情報を取得
  const { data: currentLeader } = trpc.data.getRotationWithReasons.useQuery(
    { year: currentYear },
    { enabled: !!currentYear }
  );
  const { data: nextLeader } = trpc.data.getRotationWithReasons.useQuery(
    { year: nextYear },
    { enabled: !!nextYear }
  );

  // 現年度の担当・次年度の候補を抽出
  const currentPrimary = useMemo(() => {
    if (!currentLeader) return null;
    const data = currentLeader as any;
    if (data.schedule?.primaryHouseholdId) {
      return { householdId: data.schedule.primaryHouseholdId };
    }
    return null;
  }, [currentLeader]);

  const nextPrimary = useMemo(() => {
    if (!nextLeader) return null;
    const data = nextLeader as any;
    if (data.schedule?.primaryHouseholdId) {
      return { householdId: data.schedule.primaryHouseholdId };
    }
    // Fallback: first candidate
    if (data.households) {
      const candidate = data.households.find((h: any) => h.isCandidate);
      return candidate ? { householdId: candidate.householdId } : null;
    }
    return null;
  }, [nextLeader]);

  // 次年度のスケジュール情報
  const nextSchedule = useMemo(() => {
    if (!nextLeader) return null;
    return (nextLeader as any).schedule ?? null;
  }, [nextLeader]);

  const deleteFormMutation = trpc.data.deleteForm.useMutation();

  // Household edit state
  const [householdEdits, setHouseholdEdits] = useState<{
    [householdId: string]: { moveInDate?: string; leaderHistoryCount?: number };
  }>({});
  const [householdFeedback, setHouseholdFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSavingHouseholds, setIsSavingHouseholds] = useState(false);

  const updateHouseholdMutation = trpc.data.updateHousehold.useMutation();
  const recalculateSchedulesMutation = trpc.data.recalculateSchedules.useMutation();

  // Email mutations & feedback state
  const utils = trpc.useUtils();
  const [emailFeedback, setEmailFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSavingEmails, setIsSavingEmails] = useState(false);

  const upsertEmailMutation = trpc.data.upsertResidentEmail.useMutation();
  const deleteEmailMutation = trpc.data.deleteResidentEmail.useMutation();
  const sendRegistrationEmail = trpc.email.sendRegistration.useMutation();

  const handleSaveEmails = async () => {
    setEmailFeedback(null);
    setIsSavingEmails(true);
    try {
      const entries = Object.entries(newEmails);
      if (entries.length === 0) {
        setEmailFeedback({ type: "error", message: "変更されたメールアドレスがありません。" });
        setIsSavingEmails(false);
        return;
      }

      // バリデーション
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEntries = entries.filter(([, email]) => email.trim() !== "" && !emailRegex.test(email.trim()));
      if (invalidEntries.length > 0) {
        setEmailFeedback({ type: "error", message: "無効なメールアドレスがあります。修正してください。" });
        setIsSavingEmails(false);
        return;
      }

      let savedCount = 0;
      for (const [householdDbId, email] of entries) {
        const household = households.find((h: any) => h.id === Number(householdDbId));
        if (!household) continue;
        if (email.trim() === "") continue;
        await upsertEmailMutation.mutateAsync({
          householdId: household.householdId,
          email: email.trim(),
        });
        savedCount++;
      }
      await utils.data.getResidentEmails.invalidate();
      setNewEmails({});
      setEmailFeedback({ type: "success", message: `${savedCount}件のメールアドレスを保存しました。` });
    } catch (err: any) {
      setEmailFeedback({ type: "error", message: "保存に失敗しました: " + (err.message || "不明なエラー") });
    } finally {
      setIsSavingEmails(false);
    }
  };

  const handleDeleteEmail = async (emailRecord: any) => {
    if (!confirm(`${emailRecord.householdId}号室のメールアドレスを削除しますか？`)) return;
    try {
      await deleteEmailMutation.mutateAsync({ id: emailRecord.id });
      await utils.data.getResidentEmails.invalidate();
      // Clear any local edit for this household
      const household = households.find((h: any) => h.householdId === emailRecord.householdId);
      if (household) {
        setNewEmails((prev) => {
          const next = { ...prev };
          delete next[household.id];
          return next;
        });
      }
      setEmailFeedback({ type: "success", message: `${emailRecord.householdId}号室のメールアドレスを削除しました。` });
    } catch (err: any) {
      setEmailFeedback({ type: "error", message: "削除に失敗しました: " + (err.message || "不明なエラー") });
    }
  };

  const handleSaveHouseholds = async () => {
    setHouseholdFeedback(null);
    setIsSavingHouseholds(true);
    try {
      const entries = Object.entries(householdEdits);
      if (entries.length === 0) {
        setHouseholdFeedback({ type: "error", message: "変更された世帯情報がありません。" });
        setIsSavingHouseholds(false);
        return;
      }
      for (const [householdId, edits] of entries) {
        const updateData: { householdId: string; moveInDate?: Date; leaderHistoryCount?: number } = { householdId };
        if (edits.moveInDate) {
          updateData.moveInDate = new Date(edits.moveInDate);
        }
        if (edits.leaderHistoryCount !== undefined) {
          updateData.leaderHistoryCount = edits.leaderHistoryCount;
        }
        await updateHouseholdMutation.mutateAsync(updateData);
      }
      // 世帯データ更新後、次年度以降のスケジュールを再計算
      await recalculateSchedulesMutation.mutateAsync({ year: nextYear });
      await utils.data.getHouseholds.invalidate();
      await utils.data.getRotationWithReasons.invalidate();
      await utils.memberTop.getLeaderSchedule.invalidate();
      setHouseholdEdits({});
      setHouseholdFeedback({ type: "success", message: "世帯情報を保存し、ローテーションを再計算しました。" });
    } catch (err: any) {
      setHouseholdFeedback({ type: "error", message: "保存に失敗しました: " + (err.message || "不明なエラー") });
    } finally {
      setIsSavingHouseholds(false);
    }
  };

  const handleDeleteUnansweredForm = (formId: string) => {
    if (confirm("このフォームを削除しますか？")) {
      deleteFormMutation.mutate(
        { formId: parseInt(formId) },
        {
          onSuccess: () => {
            // フォーム一覧を再取得
            window.location.reload();
          },
          onError: (error) => {
            alert("削除に失敗しました: " + error.message);
          },
        }
      );
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <header className="fixed top-0 left-0 right-0 bg-cover bg-center border-b border-gray-200 z-50" style={{ backgroundImage: "url('/greenpia-yaizu.jpg')" }}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50" />
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between relative">
          <div className="flex-1" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white" />
              <Input
                type="text"
                placeholder="検索（河川、備品、会費など）"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => debouncedQuery.length > 0 && setShowSearchResults(true)}
                className="w-full max-w-md bg-white/20 border-white/30 text-white placeholder:text-white/50 pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); setShowSearchResults(false); }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* 検索結果ドロップダウン */}
              {showSearchResults && (
                <div className="absolute top-full left-0 mt-2 w-full max-w-md bg-white rounded-lg shadow-xl border border-gray-200 max-h-[70vh] overflow-y-auto z-50">
                  {isSearching ? (
                    <div className="p-6 text-center text-gray-400 text-sm">検索中...</div>
                  ) : totalResults === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-sm">
                      「{debouncedQuery}」に一致する結果はありません
                    </div>
                  ) : (
                    <div className="py-2">
                      <div className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                        {totalResults}件の結果
                      </div>

                      {/* 年度ログ（posts） */}
                      {searchResults && !Array.isArray(searchResults) && searchResults.posts?.length > 0 && (
                        <div>
                          <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5" />
                            年度ログ
                          </div>
                          {searchResults.posts.map((item: any) => (
                            <button
                              key={`post-${item.id}`}
                              onClick={() => navigateAndCloseSearch("/year-log")}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                            >
                              <div className="text-sm font-medium text-gray-900 truncate">{item.title}</div>
                              {item.body && (
                                <div className="text-xs text-gray-500 mt-1 line-clamp-1">{item.body}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* イベント */}
                      {searchResults && !Array.isArray(searchResults) && searchResults.events?.length > 0 && (
                        <div>
                          <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 flex items-center gap-2">
                            <CalendarDays className="w-3.5 h-3.5" />
                            カレンダー
                          </div>
                          {searchResults.events.map((item: any) => (
                            <button
                              key={`event-${item.id}`}
                              onClick={() => navigateAndCloseSearch("/calendar")}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                            >
                              <div className="text-sm font-medium text-gray-900 truncate">{item.title}</div>
                              {item.date && (
                                <div className="text-xs text-gray-500 mt-1">{new Date(item.date).toLocaleDateString("ja-JP")}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* 備品 */}
                      {searchResults && !Array.isArray(searchResults) && searchResults.inventory?.length > 0 && (
                        <div>
                          <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 flex items-center gap-2">
                            <Package className="w-3.5 h-3.5" />
                            備品台帳
                          </div>
                          {searchResults.inventory.map((item: any) => (
                            <button
                              key={`inv-${item.id}`}
                              onClick={() => navigateAndCloseSearch("/inventory")}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                            >
                              <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                              {item.notes && (
                                <div className="text-xs text-gray-500 mt-1 line-clamp-1">{item.notes}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* ルール */}
                      {searchResults && !Array.isArray(searchResults) && searchResults.rules?.length > 0 && (
                        <div>
                          <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5" />
                            ルール・決定事項
                          </div>
                          {searchResults.rules.map((item: any) => (
                            <button
                              key={`rule-${item.id}`}
                              onClick={() => navigateAndCloseSearch("/rules")}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                            >
                              <div className="text-sm font-medium text-gray-900 truncate">{item.title}</div>
                              {item.details && (
                                <div className="text-xs text-gray-500 mt-1 line-clamp-1">{item.details}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* FAQ */}
                      {searchResults && !Array.isArray(searchResults) && searchResults.faq?.length > 0 && (
                        <div>
                          <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 flex items-center gap-2">
                            <HelpCircle className="w-3.5 h-3.5" />
                            FAQ
                          </div>
                          {searchResults.faq.map((item: any) => (
                            <button
                              key={`faq-${item.id}`}
                              onClick={() => navigateAndCloseSearch("/faq")}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                            >
                              <div className="text-sm font-medium text-gray-900 truncate">{item.question}</div>
                              {item.answer && (
                                <div className="text-xs text-gray-500 mt-1 line-clamp-1">{item.answer}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* テンプレ */}
                      {searchResults && !Array.isArray(searchResults) && searchResults.templates?.length > 0 && (
                        <div>
                          <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 flex items-center gap-2">
                            <FileCheck className="w-3.5 h-3.5" />
                            テンプレ
                          </div>
                          {searchResults.templates.map((item: any) => (
                            <button
                              key={`tpl-${item.id}`}
                              onClick={() => navigateAndCloseSearch("/templates")}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                            >
                              <div className="text-sm font-medium text-gray-900 truncate">{item.title}</div>
                              {item.body && (
                                <div className="text-xs text-gray-500 mt-1 line-clamp-1">{item.body}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 ml-6">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-white/10 rounded transition-colors"
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="pt-24 pb-16">
        {/* ヒーロー背景 */}
        <div
          className="relative h-96 bg-cover bg-center overflow-hidden"
          style={{
            backgroundImage: "url('/greenpia-yaizu.jpg')",
            backgroundAttachment: "fixed",
          }}
        >
          {/* オーバーレイ */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />

          {/* コンテンツ */}
          <div className="relative h-full flex flex-col justify-between p-8 max-w-7xl mx-auto w-full">
            {/* 左上：ラベル */}
            <div className="flex items-start justify-between">
              <div className="text-sm text-white/80 font-light tracking-wider">
                <div>焼津市 集合住宅「グリーンピア」</div>
                <div className="mt-1">年度：{currentYear}</div>
              </div>
            </div>

            {/* 中央：H1 + 次期組長 */}
            <div className="text-center">
              <h1 className="text-5xl md:text-6xl font-light text-white mb-4 tracking-tight">
                組長引き継ぎ
              </h1>
              {nextPrimary && (
                <button
                  onClick={() => setLocation("/rules")}
                  className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-6 py-3 hover:bg-white/20 transition-all group"
                >
                  <div className="text-left">
                    <div className="text-xs text-white/60 font-light tracking-wider">
                      {nextYear}年度 組長候補
                    </div>
                    <div className="text-xl font-light text-white tracking-wide">
                      {nextPrimary.householdId}号室
                      {nextSchedule?.status === "confirmed" && (
                        <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded">確定</span>
                      )}
                      {nextSchedule?.status === "draft" && (
                        <span className="ml-2 text-xs bg-yellow-500/30 px-2 py-0.5 rounded">暫定</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
                </button>
              )}
            </div>

            {/* 右下：Last updated + 現組長 + QR */}
            <div className="flex justify-between items-end">
              <div className="text-xs text-white/60 font-light">
                {currentPrimary && (
                  <div>
                    <span className="text-white/40">現組長</span>{" "}
                    <span className="text-white/80">{currentPrimary.householdId}号室</span>
                  </div>
                )}
              </div>
              <div className="flex items-end gap-4">
                <div className="text-xs text-white/60 font-light text-right">
                  <div>Last updated</div>
                  <div className="mt-1 text-white/70">{recentChanges[0]?.date ? new Date(recentChanges[0].date).toLocaleDateString("ja-JP") : ""}</div>
                </div>
                <div className="bg-white rounded-md p-1.5">
                  <QRCodeSVG
                    value={typeof window !== "undefined" ? window.location.origin : "https://kumicho-portal.vercel.app"}
                    size={56}
                    level="M"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* フォーム ダッシュボード */}
        {allForms.length > 0 && (
          <div className="bg-gray-50 border-t border-gray-200 py-16">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-medium text-gray-900 flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-gray-400" />
                  フォーム
                </h2>
                <button
                  onClick={() => setLocation("/forms")}
                  className="text-sm font-light text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-1"
                >
                  管理画面
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-4">
                {allForms.map((form: any) => {
                  const isActive = form.status === "active";
                  const isAnswered = answeredFormIds.includes(form.id);
                  const responseCount = form.responseCount ?? 0;
                  const totalHouseholds = form.totalHouseholds ?? 9;
                  const responseRate = totalHouseholds > 0 ? Math.round((responseCount / totalHouseholds) * 100) : 0;

                  return (
                    <div
                      key={form.id}
                      className={`bg-white border rounded-lg p-6 ${
                        isActive ? "border-blue-200" : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-light text-gray-900">
                              {form.title}
                            </h3>
                            {isActive && (
                              <span className="text-xs font-light text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                                受付中
                              </span>
                            )}
                            {isAnswered && (
                              <span className="text-xs font-light text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                回答済み
                              </span>
                            )}
                          </div>
                          {form.description && (
                            <p className="text-sm text-gray-500 font-light mb-3">
                              {form.description}
                            </p>
                          )}

                          {/* 回答率プログレスバー */}
                          <div className="mb-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-light text-gray-500">
                                {responseCount}/{totalHouseholds} 世帯回答済み
                              </span>
                              <span className="text-xs font-light text-gray-400">
                                {responseRate}%
                              </span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-900 rounded-full transition-all duration-500"
                                style={{ width: `${responseRate}%` }}
                              />
                            </div>
                          </div>

                          {form.dueDate && (
                            <div className="text-xs font-light text-gray-400">
                              期限: {new Date(form.dueDate).toLocaleDateString("ja-JP")}
                            </div>
                          )}
                        </div>

                        {/* アクションボタン */}
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          {isActive && !isAnswered && (
                            <button
                              onClick={() => setLocation(`/form-response/${form.id}`)}
                              className="px-4 py-2 text-sm font-light text-white bg-gray-900 rounded hover:bg-gray-800 transition-colors"
                            >
                              回答する
                            </button>
                          )}
                          {isActive && isAnswered && (
                            <button
                              onClick={() => setLocation(`/form-response/${form.id}`)}
                              className="px-4 py-2 text-sm font-light text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                            >
                              代理入力
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedFormId(form.id);
                              setShowStats(true);
                            }}
                            className="px-4 py-2 text-sm font-light text-gray-500 border border-gray-200 rounded hover:bg-gray-50 transition-colors flex items-center gap-1 justify-center"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                            統計
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Index List（導線 01..07） */}
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {/* 01: 年間カレンダー */}
            <button
              onClick={() => setLocation("/calendar")}
              className="group cursor-pointer transition-all duration-300 text-left"
            >
              <div className="mb-6">
                <span className="text-3xl font-bold text-gray-100 tracking-tight">
                  01
                </span>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2 group-hover:text-blue-900 transition-colors">
                年間カレンダー
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light">
                行事・締切・清掃・会議のスケジュールとチェックリスト
              </p>
              <div className="mt-4 h-0.5 w-0 bg-blue-900 group-hover:w-8 transition-all duration-300" />
            </button>

            {/* 02: 河川清掃 */}
            <button
              onClick={() => setLocation("/river-cleaning")}
              className="group cursor-pointer transition-all duration-300 text-left"
            >
              <div className="mb-6">
                <span className="text-3xl font-bold text-gray-100 tracking-tight">
                  02
                </span>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2 group-hover:text-blue-900 transition-colors">
                河川清掃
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light">
                SOP・実施ログ・安全ガイド
              </p>
              <div className="mt-4 h-0.5 w-0 bg-blue-900 group-hover:w-8 transition-all duration-300" />
            </button>

            {/* 03: 倉庫・備品 */}
            <button
              onClick={() => setLocation("/inventory")}
              className="group cursor-pointer transition-all duration-300 text-left"
            >
              <div className="mb-6">
                <span className="text-3xl font-bold text-gray-100 tracking-tight">
                  03
                </span>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2 group-hover:text-blue-900 transition-colors">
                倉庫・備品台帳
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light">
                写真・数量・保管場所・棚卸し管理
              </p>
              <div className="mt-4 h-0.5 w-0 bg-blue-900 group-hover:w-8 transition-all duration-300" />
            </button>

            {/* 04: テンプレ置き場 */}
            <button
              onClick={() => setLocation("/templates")}
              className="group cursor-pointer transition-all duration-300 text-left"
            >
              <div className="mb-6">
                <span className="text-3xl font-bold text-gray-100 tracking-tight">
                  04
                </span>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2 group-hover:text-blue-900 transition-colors">
                テンプレ置き場
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light">
                文書テンプレ・通知文・メール文例
              </p>
              <div className="mt-4 h-0.5 w-0 bg-blue-900 group-hover:w-8 transition-all duration-300" />
            </button>

            {/* 05: ルール・決定事項 */}
            <button
              onClick={() => setLocation("/rules")}
              className="group cursor-pointer transition-all duration-300 text-left"
            >
              <div className="mb-6">
                <span className="text-3xl font-bold text-gray-100 tracking-tight">
                  05
                </span>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2 group-hover:text-blue-900 transition-colors">
                ルール・決定事項
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light">
                会費・免除・ローテ・出不足金
              </p>
              <div className="mt-4 h-0.5 w-0 bg-blue-900 group-hover:w-8 transition-all duration-300" />
            </button>

            {/* 06: 年度ログ */}
            <button
              onClick={() => setLocation("/year-log")}
              className="group cursor-pointer transition-all duration-300 text-left"
            >
              <div className="mb-6">
                <span className="text-3xl font-bold text-gray-100 tracking-tight">
                  06
                </span>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2 group-hover:text-blue-900 transition-colors">
                年度ログ
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light">
                証跡タイムライン・決定・質問・改善提案
              </p>
              <div className="mt-4 h-0.5 w-0 bg-blue-900 group-hover:w-8 transition-all duration-300" />
            </button>

            {/* 07: フォーム作成 */}
            <button
              onClick={() => setLocation("/form-builder")}
              className="group cursor-pointer transition-all duration-300 text-left"
            >
              <div className="mb-6">
                <span className="text-3xl font-bold text-gray-100 tracking-tight">
                  07
                </span>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2 group-hover:text-blue-900 transition-colors">
                フォーム作成
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light">
                アンケート・統計・回答管理
              </p>
              <div className="mt-4 h-0.5 w-0 bg-blue-900 group-hover:w-8 transition-all duration-300" />
            </button>
          </div>
        </div>

        {/* 追加セクション：Pending / FAQ / Vault etc. */}
        <div className="bg-gray-50 border-t border-gray-200 py-24">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-12">
              More
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {/* 返信待ちキュー */}
              <button
                onClick={() => setLocation("/pending-queue")}
                className="group cursor-pointer text-left"
              >
                <h3 className="text-base font-medium text-gray-900 mb-1 group-hover:text-blue-900 transition-colors">
                  返信待ちキュー
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed font-light">
                  未返信の問い合わせを追跡
                </p>
              </button>

              {/* 引き継ぎ袋 */}
              <button
                onClick={() => setLocation("/handover-bag")}
                className="group cursor-pointer text-left"
              >
                <h3 className="text-base font-medium text-gray-900 mb-1 group-hover:text-blue-900 transition-colors">
                  引き継ぎ袋
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed font-light">
                  物理の中身チェックリスト
                </p>
              </button>

              {/* FAQ */}
              <button
                onClick={() => setLocation("/faq")}
                className="group cursor-pointer text-left"
              >
                <h3 className="text-base font-medium text-gray-900 mb-1 group-hover:text-blue-900 transition-colors">
                  FAQ
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed font-light">
                  よくある質問と回答
                </p>
              </button>

              {/* Private Vault */}
              <button
                onClick={() => setLocation("/vault")}
                className="group cursor-pointer text-left"
              >
                <h3 className="text-base font-medium text-gray-900 mb-1 group-hover:text-blue-900 transition-colors">
                  Private Vault
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed font-light">
                  秘匿情報
                </p>
              </button>

              {/* 監査ログ */}
              <button
                onClick={() => setLocation("/audit-logs")}
                className="group cursor-pointer text-left"
              >
                <h3 className="text-base font-medium text-gray-900 mb-1 group-hover:text-blue-900 transition-colors">
                  監査ログ
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed font-light">
                  変更履歴・アクセスログの一覧
                </p>
              </button>

              {/* 更新履歴 */}
              <button
                onClick={() => setLocation("/changelog")}
                className="group cursor-pointer text-left"
              >
                <h3 className="text-base font-medium text-gray-900 mb-1 group-hover:text-blue-900 transition-colors">
                  更新履歴
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed font-light">
                  ポータルの変更・更新の記録
                </p>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Settings パネル */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-end">
          <div className="w-full max-w-2xl bg-white rounded-t-lg shadow-lg max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-medium text-gray-900">設定</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* 住戸管理セクション */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">住戸管理</h3>
                <p className="text-sm text-gray-500 font-light mb-6">入居年月や組長経歴を変更すると、保存時にローテーションが自動再計算されます。</p>
                {householdFeedback && (
                  <div className={`mb-4 p-3 rounded text-sm ${householdFeedback.type === "success" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
                    <p>{householdFeedback.message}</p>
                  </div>
                )}
                <div className="space-y-4">
                  {households.map((household: any) => {
                    const currentMoveIn = householdEdits[household.householdId]?.moveInDate
                      ?? (household.moveInDate ? new Date(household.moveInDate).toISOString().split('T')[0] : '');
                    const currentCount = householdEdits[household.householdId]?.leaderHistoryCount
                      ?? (household.leaderHistoryCount || 0);
                    return (
                      <div key={household.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-base font-medium text-gray-900">{household.householdId}号室</span>
                          {household.exemptionType && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{household.exemptionType}</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">入居年月</label>
                            <input
                              type="date"
                              value={currentMoveIn}
                              onChange={(e) => setHouseholdEdits(prev => ({
                                ...prev,
                                [household.householdId]: {
                                  ...prev[household.householdId],
                                  moveInDate: e.target.value,
                                },
                              }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-900 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">組長経歴（回数）</label>
                            <input
                              type="number"
                              min="0"
                              value={currentCount}
                              onChange={(e) => setHouseholdEdits(prev => ({
                                ...prev,
                                [household.householdId]: {
                                  ...prev[household.householdId],
                                  leaderHistoryCount: parseInt(e.target.value) || 0,
                                },
                              }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-900 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex gap-3">
                  <Button
                    onClick={handleSaveHouseholds}
                    disabled={isSavingHouseholds || Object.keys(householdEdits).length === 0}
                    className="flex-1 bg-blue-900 hover:bg-blue-800 text-white disabled:opacity-50"
                  >
                    {isSavingHouseholds ? "保存・再計算中..." : "世帯情報を保存（ローテ再計算）"}
                  </Button>
                </div>
              </section>

              {/* 住民メールアドレス登録セクション */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">住民メールアドレス登録</h3>
                <p className="text-sm text-gray-500 font-light mb-4">
                  各住戸のメールアドレスを登録すると、通知メールが届くようになります。
                </p>

                {/* 登録状況サマリー */}
                <div className="mb-4 flex items-center gap-4 text-sm">
                  <span className="text-gray-500">
                    登録済み: <span className="font-medium text-gray-900">{residentEmails.length}</span> / {households.length} 世帯
                  </span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-900 rounded-full transition-all duration-300"
                      style={{ width: `${households.length > 0 ? (residentEmails.length / households.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {emailFeedback && (
                  <div className={`mb-4 p-3 rounded text-sm flex items-center gap-2 ${emailFeedback.type === "success" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
                    {emailFeedback.type === "success" ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                    <p>{emailFeedback.message}</p>
                  </div>
                )}

                <div className="space-y-3">
                  {households.map((household: any) => {
                    const existingEmail = residentEmails.find((e: any) => e.householdId === household.householdId);
                    const editValue = newEmails[household.id];
                    const displayValue = editValue !== undefined ? editValue : (existingEmail?.email || "");
                    const isModified = editValue !== undefined && editValue !== (existingEmail?.email || "");
                    const isValidEmail = displayValue === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(displayValue);

                    return (
                      <div key={household.id} className={`border rounded-lg p-4 transition-colors ${isModified ? "border-blue-300 bg-blue-50/30" : existingEmail ? "border-green-200 bg-green-50/20" : "border-gray-200"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{household.householdId}号室</span>
                            {existingEmail && !isModified && (
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                登録済み
                              </span>
                            )}
                            {isModified && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                変更あり
                              </span>
                            )}
                          </div>
                          {existingEmail && (
                            <span className="text-xs text-gray-400">
                              {new Date(existingEmail.updatedAt).toLocaleDateString("ja-JP")} 登録
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="email"
                            value={displayValue}
                            onChange={(e) => setNewEmails({ ...newEmails, [household.id]: e.target.value })}
                            placeholder="example@email.com"
                            className={`flex-1 px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 ${!isValidEmail ? "border-red-300 bg-red-50" : "border-gray-300"}`}
                          />
                          {existingEmail && (
                            <>
                              <button
                                onClick={async () => {
                                  try {
                                    const result = await sendRegistrationEmail.mutateAsync({ householdId: household.householdId });
                                    setEmailFeedback({ type: result.success ? "success" : "error", message: result.message });
                                  } catch {
                                    setEmailFeedback({ type: "error", message: "送信に失敗しました" });
                                  }
                                }}
                                disabled={sendRegistrationEmail.isPending}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                                title="登録完了メールを再送信"
                              >
                                <Mail className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteEmail(existingEmail)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="メールアドレスを削除"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                        {!isValidEmail && displayValue && (
                          <p className="text-xs text-red-500 mt-1">有効なメールアドレスを入力してください</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-500">
                  登録したメールアドレスに、ポータルからの通知メールが送信されます。
                </div>
              </section>

              {/* 保存ボタン */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => setShowSettings(false)}
                  variant="outline"
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleSaveEmails}
                  disabled={isSavingEmails}
                  className="flex-1 bg-blue-900 hover:bg-blue-800 text-white disabled:opacity-50"
                >
                  {isSavingEmails ? "保存中..." : "保存"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* フォーム統計モーダル */}
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
