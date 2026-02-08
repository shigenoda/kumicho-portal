import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import { z } from "zod";
import { getDb } from "./db";
import { eq, like, or, and, desc, asc, lte, gte } from "drizzle-orm";
import {
  posts,
  events,
  inventory,
  templates,
  rules,
  faq,
  changelog,
  secretNotes,
  households,
  leaderSchedule,
  leaderRotationLogic,
  exemptionRequests,
  ruleVersions,
  pendingQueue,
  handoverBagItems,
  memberTopSummary,
  residentEmails,
  forms,
  formQuestions,
  formChoices,
  formResponses,
  formResponseItems,
  vaultEntries,
  auditLogs,
  riverCleaningRuns,
} from "../drizzle/schema";

// 変更ログをDBに記録するヘルパー
async function logChange(summary: string, entityType: string, entityId?: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(changelog).values({
    summary,
    date: new Date(),
    relatedEntityType: entityType,
    relatedEntityId: entityId ?? null,
  });
}

export const appRouter = router({
  system: systemRouter,

  // 認証不要 - meはnullを返す
  auth: router({
    me: publicProcedure.query(() => null),
    logout: publicProcedure.mutation(() => ({ success: true }) as const),
  }),

  // シードデータ投入（初回のみ）
  seed: router({
    run: publicProcedure.mutation(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 既にデータがある場合はスキップ
      const existingHouseholds = await db.select().from(households);
      if (existingHouseholds.length > 0) {
        return { success: true, message: "データは既に投入済みです", skipped: true };
      }

      // 住戸 (101-110号室)
      const householdData = [
        { householdId: "101", moveInDate: new Date("2018-04-01"), leaderHistoryCount: 2 },
        { householdId: "102", moveInDate: new Date("2020-03-15"), leaderHistoryCount: 1 },
        { householdId: "103", moveInDate: new Date("2015-09-01"), leaderHistoryCount: 3 },
        { householdId: "104", moveInDate: new Date("2022-06-01"), leaderHistoryCount: 0 },
        { householdId: "105", moveInDate: new Date("2019-11-01"), leaderHistoryCount: 1 },
        { householdId: "106", moveInDate: new Date("2017-04-01"), leaderHistoryCount: 2 },
        { householdId: "107", moveInDate: new Date("2021-01-15"), leaderHistoryCount: 0 },
        { householdId: "108", moveInDate: new Date("2016-07-01"), leaderHistoryCount: 3 },
        { householdId: "109", moveInDate: new Date("2023-04-01"), leaderHistoryCount: 0 },
        { householdId: "110", moveInDate: new Date("2014-04-01"), leaderHistoryCount: 4 },
      ];
      for (const h of householdData) {
        await db.insert(households).values(h).onConflictDoNothing();
      }

      // 年間カレンダー（行事）
      const eventData = [
        { title: "定例総会", date: new Date("2026-04-20T10:00:00"), category: "会議", checklist: [{ id: "1", text: "議案書配布", completed: false }, { id: "2", text: "出欠確認", completed: false }], notes: "集会室にて開催", attachments: [] as Array<{url:string,name:string}> },
        { title: "春の一斉清掃", date: new Date("2026-04-13T08:00:00"), category: "清掃", checklist: [{ id: "1", text: "清掃用具準備", completed: false }], notes: "雨天時は翌週に延期", attachments: [] as Array<{url:string,name:string}> },
        { title: "河川清掃", date: new Date("2026-06-08T07:00:00"), category: "清掃", checklist: [{ id: "1", text: "安全確認", completed: false }], notes: "市の河川清掃に参加", attachments: [] as Array<{url:string,name:string}> },
        { title: "夏祭り", date: new Date("2026-08-16T16:00:00"), category: "行事", checklist: [{ id: "1", text: "テント設営", completed: false }, { id: "2", text: "食材買出し", completed: false }], notes: "駐車場にて開催", attachments: [] as Array<{url:string,name:string}> },
        { title: "秋の一斉清掃", date: new Date("2026-10-12T08:00:00"), category: "清掃", checklist: [{ id: "1", text: "落ち葉清掃", completed: false }], notes: "排水溝も確認", attachments: [] as Array<{url:string,name:string}> },
        { title: "防災訓練", date: new Date("2026-11-09T09:00:00"), category: "行事", checklist: [{ id: "1", text: "消火器点検", completed: false }, { id: "2", text: "避難経路確認", completed: false }], notes: "消防署との合同訓練", attachments: [] as Array<{url:string,name:string}> },
        { title: "年末大掃除", date: new Date("2026-12-21T08:00:00"), category: "清掃", checklist: [{ id: "1", text: "共用部清掃", completed: false }], notes: "共用部の大掃除", attachments: [] as Array<{url:string,name:string}> },
        { title: "3月定例会議", date: new Date("2026-03-15T19:00:00"), category: "会議", checklist: [{ id: "1", text: "年度末報告", completed: false }], notes: "年度末の総括", attachments: [] as Array<{url:string,name:string}> },
      ];
      for (const e of eventData) {
        await db.insert(events).values(e);
      }

      // 備品台帳
      const inventoryData = [
        { name: "折りたたみテーブル", qty: 5, location: "集会室倉庫", condition: "良好", notes: "年1回点検", tags: ["集会室", "行事用"] },
        { name: "パイプ椅子", qty: 30, location: "集会室倉庫", condition: "良好", notes: "2024年に10脚新調", tags: ["集会室"] },
        { name: "掃除機（業務用）", qty: 1, location: "管理室", condition: "良好", notes: "フィルター定期交換", tags: ["清掃"] },
        { name: "高圧洗浄機", qty: 1, location: "駐車場倉庫", condition: "使用可", notes: "使用後は水抜き", tags: ["清掃"] },
        { name: "脚立（2m）", qty: 2, location: "管理室", condition: "良好", notes: null, tags: ["工具"] },
        { name: "消火器", qty: 8, location: "各階廊下", condition: "良好", notes: "有効期限2028年", tags: ["防災"] },
        { name: "AED", qty: 1, location: "エントランス", condition: "良好", notes: "バッテリー2027年6月", tags: ["防災", "医療"] },
        { name: "草刈り機", qty: 1, location: "駐車場倉庫", condition: "使用可", notes: "混合燃料使用", tags: ["外構"] },
        { name: "トランシーバー", qty: 4, location: "管理室", condition: "良好", notes: "防災訓練・行事で使用", tags: ["防災", "行事用"] },
        { name: "救急箱", qty: 2, location: "管理室・集会室", condition: "良好", notes: "半年ごとに補充", tags: ["医療"] },
        { name: "ゴミ袋（45L）", qty: 200, location: "管理室", condition: "良好", notes: "100枚以下で発注", tags: ["清掃", "消耗品"] },
      ];
      for (const i of inventoryData) {
        await db.insert(inventory).values(i);
      }

      // FAQ
      const faqData = [
        { question: "ゴミ出しのルールは？", answer: "燃えるゴミ:月・木、資源ゴミ:火、プラスチック:水。朝8時までにゴミ置き場へ。粗大ゴミは市に事前予約。", relatedRuleIds: [] as number[], relatedPostIds: [] as number[] },
        { question: "駐車場の契約はどうすればいいですか？", answer: "組長に連絡してください。空き区画がある場合、月額5,000円で契約可能です。", relatedRuleIds: [] as number[], relatedPostIds: [] as number[] },
        { question: "騒音トラブルがある場合は？", answer: "まず当事者間で話し合いを。解決が難しい場合は組長にご相談ください。夜10時以降の生活音にはご配慮を。", relatedRuleIds: [] as number[], relatedPostIds: [] as number[] },
        { question: "共用施設の利用方法は？", answer: "集会室は予約制。組長に1週間前までに申請。利用後は清掃をお願いします。", relatedRuleIds: [] as number[], relatedPostIds: [] as number[] },
        { question: "管理費の支払い方法は？", answer: "口座振替（毎月27日引落し）。振替口座変更は組長まで届出書を提出。", relatedRuleIds: [] as number[], relatedPostIds: [] as number[] },
        { question: "ペットの飼育は可能ですか？", answer: "小型犬・猫は1匹まで可。飼育届の提出必要。共用部はリード必須。", relatedRuleIds: [] as number[], relatedPostIds: [] as number[] },
        { question: "退去時の手続きは？", answer: "退去1ヶ月前までに組長へ届出。鍵の返却、駐車場・メール登録の解除を行います。", relatedRuleIds: [] as number[], relatedPostIds: [] as number[] },
      ];
      for (const f of faqData) {
        await db.insert(faq).values(f);
      }

      // ルール・決定事項
      const rulesData = [
        { title: "ゴミ出しルール", summary: "分別と収集日の遵守", details: "燃えるゴミ（月・木）、資源ゴミ（火）、プラスチック（水）。朝8時までに指定場所へ。", status: "decided" as const, evidenceLinks: [] as string[], isHypothesis: false },
        { title: "駐車場利用規約", summary: "駐車場の契約と利用ルール", details: "月額5,000円。来客用は最大3日まで。無断駐車は警告→レッカー。", status: "decided" as const, evidenceLinks: [] as string[], isHypothesis: false },
        { title: "騒音に関する規約", summary: "夜間の生活音への配慮", details: "夜22時〜朝7時は静粛時間。楽器演奏は20時まで。工事は平日9時〜17時のみ。", status: "decided" as const, evidenceLinks: [] as string[], isHypothesis: false },
        { title: "ペット飼育規約", summary: "ペットの種類・数の制限", details: "小型犬・猫1匹まで。飼育届提出必須。共用部はリード着用。", status: "decided" as const, evidenceLinks: [] as string[], isHypothesis: false },
        { title: "共用施設利用規約", summary: "集会室の予約と利用", details: "1週間前までに予約。利用時間9時〜21時。利用後は原状回復。", status: "decided" as const, evidenceLinks: [] as string[], isHypothesis: false },
      ];
      for (const r of rulesData) {
        await db.insert(rules).values(r);
      }

      // テンプレート
      const templateData = [
        { title: "総会議案書テンプレート", body: "令和○年度 グリーンピア焼津 定例総会 議案書\n\n日時: 令和○年○月○日\n場所: 集会室\n\n【第1号議案】事業報告\n【第2号議案】決算報告\n【第3号議案】事業計画（案）\n【第4号議案】予算（案）\n【第5号議案】役員改選", category: "会議", tags: ["総会", "議案書"] },
        { title: "回覧板テンプレート", body: "グリーンピア焼津 回覧\n\n日付: 令和○年○月○日\n発信者: 組長\n\n件名: ○○○について\n\n本文:\n\n※確認後、次の方へお回しください。", category: "連絡", tags: ["回覧板"] },
        { title: "工事届出書テンプレート", body: "リフォーム工事届出書\n\n届出日:\n届出者: ○号室\n\n工事内容:\n工事期間:\n作業時間:\n施工業者:\n連絡先:\n\n※工事は平日9時〜17時に限ります。", category: "届出", tags: ["工事", "届出"] },
        { title: "退去届テンプレート", body: "退去届\n\n届出日:\n届出者: ○号室\n\n退去予定日:\n連絡先:\n\n返却物:\n□ 鍵\n□ 駐車場リモコン", category: "届出", tags: ["退去"] },
        { title: "飼育届テンプレート", body: "ペット飼育届\n\n届出日:\n届出者: ○号室\n\nペットの種類: □犬 □猫\n品種:\n名前:\n体重:\n\n予防接種: □狂犬病 □混合ワクチン", category: "届出", tags: ["ペット"] },
      ];
      for (const t of templateData) {
        await db.insert(templates).values(t);
      }

      // 引き継ぎ袋チェックリスト
      const handoverData = [
        { name: "管理室の鍵", location: "引き継ぎ袋", isChecked: false, description: "管理室のマスターキー", notes: "スペアキーは金庫内" },
        { name: "集会室の鍵", location: "引き継ぎ袋", isChecked: false, description: "集会室の鍵（2本）", notes: null },
        { name: "管理組合印鑑", location: "引き継ぎ袋", isChecked: false, description: "実印と認印", notes: "銀行届出印" },
        { name: "通帳", location: "引き継ぎ袋", isChecked: false, description: "管理費口座の通帳", notes: "○○銀行焼津支店" },
        { name: "管理規約原本", location: "引き継ぎ袋", isChecked: false, description: "管理規約と細則の原本", notes: "改訂履歴付き" },
        { name: "過去議事録ファイル", location: "引き継ぎ袋", isChecked: false, description: "過去5年分の議事録", notes: null },
        { name: "住民名簿", location: "引き継ぎ袋", isChecked: false, description: "全住戸の連絡先", notes: "個人情報注意" },
        { name: "業者連絡先リスト", location: "引き継ぎ袋", isChecked: false, description: "管理会社・業者の連絡先", notes: "緊急時は管理会社へ" },
        { name: "ポータルサイト情報", location: "引き継ぎ袋", isChecked: false, description: "ポータルの管理情報", notes: "Vaultにも登録済" },
      ];
      for (const h of handoverData) {
        await db.insert(handoverBagItems).values(h);
      }

      // ローテスケジュール
      const scheduleData = [
        { year: 2026, primaryHouseholdId: "104", backupHouseholdId: "107", status: "confirmed" as const, reason: "2026年度確定" },
        { year: 2027, primaryHouseholdId: "107", backupHouseholdId: "109", status: "draft" as const, reason: "自動計算" },
        { year: 2028, primaryHouseholdId: "109", backupHouseholdId: "102", status: "draft" as const, reason: "自動計算" },
        { year: 2029, primaryHouseholdId: "102", backupHouseholdId: "105", status: "draft" as const, reason: "自動計算" },
        { year: 2030, primaryHouseholdId: "105", backupHouseholdId: "101", status: "draft" as const, reason: "自動計算" },
      ];
      for (const s of scheduleData) {
        await db.insert(leaderSchedule).values(s);
      }

      // ローテーションロジック
      await db.insert(leaderRotationLogic).values({
        version: 1,
        logic: { priority: ["入居年数が長い順", "組長経験回数が少ない順"], excludeConditions: ["入居1年未満", "免除申請承認済み"] },
        reason: "初期設定",
      });

      // 返信待ちキュー
      const pendingData = [
        { title: "エレベーター点検の見積もり", description: "年次点検の見積もり依頼中", toWhom: "○○エレベーターサービス", priority: "high" as const, status: "pending" as const },
        { title: "駐輪場の増設相談", description: "自転車増加のため増設を管理会社に相談中", toWhom: "△△管理会社", priority: "medium" as const, status: "pending" as const },
      ];
      for (const p of pendingData) {
        await db.insert(pendingQueue).values(p);
      }

      // 年度ログ
      const postsData = [
        { title: "エントランスの照明をLEDに交換", body: "電気代削減のため、エントランスと共用廊下の照明をLEDに交換。年間約3万円の削減見込み。", tags: ["設備", "コスト削減"] as string[], year: 2026, category: "improvement" as const, status: "published" as const, isHypothesis: false, relatedLinks: [] as string[], publishedAt: new Date("2026-01-15") },
        { title: "3階排水管の詰まり対応", body: "3階共用排水管が詰まり、業者対応。原因は油脂の蓄積。各住戸に注意喚起の回覧を配布。", tags: ["設備", "トラブル"] as string[], year: 2026, category: "trouble" as const, status: "published" as const, isHypothesis: false, relatedLinks: [] as string[], publishedAt: new Date("2026-01-20") },
        { title: "管理費の値上げについて（検討中）", body: "物価上昇に伴い管理費見直しを検討。現行:月額15,000円→案:16,500円。次回総会で決議予定。", tags: ["管理費", "総会議題"] as string[], year: 2026, category: "pending" as const, status: "published" as const, isHypothesis: true, relatedLinks: [] as string[], publishedAt: new Date("2026-02-01") },
        { title: "宅配ボックス設置の要望", body: "複数の住民から設置要望あり。見積もり取得中。設置場所はエントランス横を予定。", tags: ["設備", "要望"] as string[], year: 2026, category: "inquiry" as const, status: "published" as const, isHypothesis: false, relatedLinks: [] as string[], publishedAt: new Date("2026-02-05") },
      ];
      for (const p of postsData) {
        await db.insert(posts).values(p);
      }

      // 河川清掃実施ログ
      const riverCleaningData = [
        { date: new Date("2025-06-08"), participantsCount: 18, issues: "護岸付近にゴミ集積あり", whatWorked: "班分けして効率的に清掃できた", whatToImprove: "長靴のサイズが不足。次回は事前に確認", attachments: [] as Array<{url:string,name:string}>, linkedInventoryIds: [] as number[] },
        { date: new Date("2025-12-14"), participantsCount: 15, issues: "落ち葉が多く排水溝が詰まっていた", whatWorked: "高圧洗浄機が活躍", whatToImprove: "寒さ対策として温かい飲み物の準備", attachments: [] as Array<{url:string,name:string}>, linkedInventoryIds: [] as number[] },
        { date: new Date("2026-01-12"), participantsCount: 12, issues: null, whatWorked: "前回の改善点を反映し、スムーズに進行", whatToImprove: null, attachments: [] as Array<{url:string,name:string}>, linkedInventoryIds: [] as number[] },
      ];
      for (const r of riverCleaningData) {
        await db.insert(riverCleaningRuns).values(r);
      }

      // Private Vault エントリ
      const vaultData = [
        { category: "銀行", key: "管理費口座 暗証番号", maskedValue: "****", actualValue: "5927", classification: "confidential" as const },
        { category: "銀行", key: "管理費口座 口座番号", maskedValue: "○○銀行 ****321", actualValue: "普通 1234321 焼津支店", classification: "confidential" as const },
        { category: "管理", key: "集会室Wi-Fiパスワード", maskedValue: "G****zu", actualValue: "Greenpia2024yaizu", classification: "internal" as const },
        { category: "管理", key: "管理室セキュリティコード", maskedValue: "****", actualValue: "8012", classification: "confidential" as const },
        { category: "業者", key: "管理会社 担当者直通", maskedValue: "054-***-****", actualValue: "054-628-3100 山田さん", classification: "internal" as const },
        { category: "ポータル", key: "Vercel管理画面", maskedValue: "admin@***.com", actualValue: "admin@greenpia-yaizu.jp / Gp2024!portal", classification: "confidential" as const },
      ];
      for (const v of vaultData) {
        await db.insert(vaultEntries).values(v);
      }

      // 秘匿メモ
      const secretNotesData = [
        { title: "103号室の騒音問題メモ", body: "2025年11月から夜間の音楽騒音の苦情あり。12月に直接訪問し改善依頼。1月以降は収束。念のため経過観察中。" },
        { title: "管理会社契約更新メモ", body: "現契約: 2027年3月末まで。更新交渉は2026年12月頃に開始予定。他社見積もりも取ること。現行月額48,000円。" },
      ];
      for (const s of secretNotesData) {
        await db.insert(secretNotes).values(s);
      }

      // 初回ログ
      await db.insert(changelog).values({
        summary: "グリーンピア焼津ポータル初期データ投入完了",
        date: new Date(),
        relatedEntityType: "system",
        relatedEntityId: null,
      });

      return { success: true, message: "シードデータを投入しました", skipped: false };
    }),
  }),

  // Member トップ用 API
  memberTop: router({
    getSummary: publicProcedure
      .input(z.object({ year: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;

        const summary = await db
          .select()
          .from(memberTopSummary)
          .where(eq(memberTopSummary.year, input.year))
          .limit(1);

        return summary[0] || null;
      }),

    getLeaderSchedule: publicProcedure
      .input(z.object({ year: z.number().optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const currentYear = input.year || new Date().getFullYear();
        const schedules = await db
          .select()
          .from(leaderSchedule)
          .where(and(gte(leaderSchedule.year, currentYear), lte(leaderSchedule.year, currentYear + 8)))
          .orderBy(asc(leaderSchedule.year));

        return schedules;
      }),

    getPendingQueue: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      const pending = await db
        .select()
        .from(pendingQueue)
        .where(eq(pendingQueue.status, "pending"))
        .orderBy(desc(pendingQueue.priority), asc(pendingQueue.createdAt));

      return pending;
    }),
  }),

  // ローテ管理 API
  leaderRotation: router({
    calculateNextYear: publicProcedure
      .input(z.object({ year: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const logicRecords = await db
          .select()
          .from(leaderRotationLogic)
          .orderBy(desc(leaderRotationLogic.version))
          .limit(1);

        const logic = logicRecords[0]?.logic;
        if (!logic) throw new Error("No rotation logic defined");

        const allHouseholds = await db.select().from(households);

        const prevYear = input.year - 1;
        const prevScheduleArray = await db
          .select()
          .from(leaderSchedule)
          .where(eq(leaderSchedule.year, prevYear))
          .limit(1);
        const prevSchedule = prevScheduleArray[0];

        const exemptions = await db
          .select()
          .from(exemptionRequests)
          .where(
            and(
              eq(exemptionRequests.year, input.year),
              eq(exemptionRequests.status, "approved")
            )
          );

        const exemptedHouseholds = new Set(exemptions.map((e) => e.householdId));

        const candidates = allHouseholds
          .filter((h) => !exemptedHouseholds.has(h.householdId))
          .sort((a, b) => {
            const aYearsSinceLast = prevSchedule
              ? prevSchedule.primaryHouseholdId === a.householdId ? 1 : 999
              : 999;
            const bYearsSinceLast = prevSchedule
              ? prevSchedule.primaryHouseholdId === b.householdId ? 1 : 999
              : 999;

            if (aYearsSinceLast !== bYearsSinceLast) {
              return bYearsSinceLast - aYearsSinceLast;
            }

            if (a.moveInDate && b.moveInDate) {
              return a.moveInDate.getTime() - b.moveInDate.getTime();
            }

            return a.householdId.localeCompare(b.householdId);
          });

        if (candidates.length < 2) {
          throw new Error("Not enough eligible households for rotation");
        }

        const primary = candidates[0];
        const backup = candidates[1];

        await db.insert(leaderSchedule).values({
          year: input.year,
          primaryHouseholdId: primary.householdId,
          backupHouseholdId: backup.householdId,
          status: "draft",
          reason: `自動計算: 前回担当からの経過年数、入居開始日、住戸ID昇順で選定`,
        });

        await logChange(`${input.year}年度ローテを自動計算`, "leaderSchedule");

        return {
          success: true,
          primary: primary.householdId,
          backup: backup.householdId,
        };
      }),

    confirm: publicProcedure
      .input(z.object({ scheduleId: z.number(), status: z.enum(["conditional", "confirmed"]) }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db
          .update(leaderSchedule)
          .set({ status: input.status })
          .where(eq(leaderSchedule.id, input.scheduleId));

        await logChange(`ローテステータスを「${input.status}」に変更`, "leaderSchedule", input.scheduleId);

        return { success: true };
      }),

    updateLogic: publicProcedure
      .input(
        z.object({
          priority: z.array(z.string()),
          excludeConditions: z.array(z.string()),
          reason: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const latestLogic = await db
          .select()
          .from(leaderRotationLogic)
          .orderBy(desc(leaderRotationLogic.version))
          .limit(1);

        const nextVersion = (latestLogic[0]?.version || 0) + 1;

        await db.insert(leaderRotationLogic).values({
          version: nextVersion,
          logic: {
            priority: input.priority,
            excludeConditions: input.excludeConditions,
          },
          reason: input.reason,
        });

        await logChange(`ローテロジック v${nextVersion} を更新`, "leaderRotationLogic");

        return { success: true, version: nextVersion };
      }),
  }),

  // 検索機能
  search: router({
    global: publicProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const searchTerm = `%${input.query}%`;

        try {
          const results = await Promise.all([
            db
              .select()
              .from(posts)
              .where(or(like(posts.title, searchTerm), like(posts.body, searchTerm)))
              .limit(5),
            db
              .select()
              .from(inventory)
              .where(or(like(inventory.name, searchTerm), like(inventory.notes, searchTerm)))
              .limit(5),
            db
              .select()
              .from(rules)
              .where(or(like(rules.title, searchTerm), like(rules.details, searchTerm)))
              .limit(5),
            db
              .select()
              .from(faq)
              .where(or(like(faq.question, searchTerm), like(faq.answer, searchTerm)))
              .limit(5),
            db
              .select()
              .from(templates)
              .where(or(like(templates.title, searchTerm), like(templates.body, searchTerm)))
              .limit(5),
          ]);

          return {
            posts: results[0],
            inventory: results[1],
            rules: results[2],
            faq: results[3],
            templates: results[4],
          };
        } catch (error) {
          console.error("Search error:", error);
          return [];
        }
      }),
  }),

  // データ取得・更新 API（全て公開）
  data: router({
    getEvents: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(events).orderBy(asc(events.date));
    }),

    getInventory: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(inventory).orderBy(asc(inventory.name));
    }),

    getTemplates: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(templates).orderBy(asc(templates.category));
    }),

    getRules: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(rules).orderBy(asc(rules.title));
    }),

    getFAQ: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(faq).orderBy(asc(faq.question));
    }),

    updateFAQ: publicProcedure
      .input(
        z.object({
          id: z.number(),
          question: z.string().min(1).optional(),
          answer: z.string().min(1).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        const updateData: any = { updatedAt: new Date() };
        if (input.question !== undefined) updateData.question = input.question;
        if (input.answer !== undefined) updateData.answer = input.answer;

        await db.update(faq).set(updateData).where(eq(faq.id, input.id));

        await logChange(`FAQ (ID: ${input.id}) を更新`, "faq", input.id);

        return { success: true };
      }),

    deleteFAQ: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        await db.delete(faq).where(eq(faq.id, input.id));

        await logChange(`FAQ (ID: ${input.id}) を削除`, "faq", input.id);

        return { success: true };
      }),

    getPosts: publicProcedure
      .input(z.object({ year: z.number().optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const currentYear = input.year || new Date().getFullYear();
        return await db
          .select()
          .from(posts)
          .where(eq(posts.year, currentYear))
          .orderBy(desc(posts.updatedAt));
      }),

    getChangelog: publicProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return await db
          .select()
          .from(changelog)
          .orderBy(desc(changelog.date))
          .limit(input.limit);
      }),

    getSecretNotes: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(secretNotes).orderBy(desc(secretNotes.updatedAt));
    }),

    getHandoverBagItems: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(handoverBagItems).orderBy(asc(handoverBagItems.name));
    }),

    createHandoverBagItem: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        location: z.string().min(1),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [item] = await db.insert(handoverBagItems).values({
          name: input.name,
          description: input.description || null,
          location: input.location,
          notes: input.notes || null,
          isChecked: false,
        }).returning();
        await logChange(`引き継ぎ袋「${input.name}」を追加`, "handoverBagItems", item.id);
        return item;
      }),

    updateHandoverBagItem: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        location: z.string().min(1).optional(),
        notes: z.string().optional(),
        isChecked: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const updateData: any = { updatedAt: new Date() };
        if (input.name !== undefined) updateData.name = input.name;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.location !== undefined) updateData.location = input.location;
        if (input.notes !== undefined) updateData.notes = input.notes;
        if (input.isChecked !== undefined) updateData.isChecked = input.isChecked;
        await db.update(handoverBagItems).set(updateData).where(eq(handoverBagItems.id, input.id));
        await logChange(`引き継ぎ袋アイテム (ID: ${input.id}) を更新`, "handoverBagItems", input.id);
        return { success: true };
      }),

    deleteHandoverBagItem: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(handoverBagItems).where(eq(handoverBagItems.id, input.id));
        await logChange(`引き継ぎ袋アイテム (ID: ${input.id}) を削除`, "handoverBagItems", input.id);
        return { success: true };
      }),

    // PendingQueue CRUD
    getPendingQueueAll: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(pendingQueue).orderBy(desc(pendingQueue.createdAt));
    }),

    createPendingQueueItem: publicProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        toWhom: z.string().min(1),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [item] = await db.insert(pendingQueue).values({
          title: input.title,
          description: input.description,
          toWhom: input.toWhom,
          priority: input.priority,
          status: "pending",
        }).returning();
        await logChange(`返信待ち「${input.title}」を追加`, "pendingQueue", item.id);
        return item;
      }),

    updatePendingQueueItem: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        toWhom: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        status: z.enum(["pending", "resolved", "transferred"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const updateData: any = { updatedAt: new Date() };
        if (input.title !== undefined) updateData.title = input.title;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.toWhom !== undefined) updateData.toWhom = input.toWhom;
        if (input.priority !== undefined) updateData.priority = input.priority;
        if (input.status !== undefined) {
          updateData.status = input.status;
          if (input.status === "resolved") updateData.resolvedAt = new Date();
        }
        await db.update(pendingQueue).set(updateData).where(eq(pendingQueue.id, input.id));
        await logChange(`返信待ち (ID: ${input.id}) を更新`, "pendingQueue", input.id);
        return { success: true };
      }),

    deletePendingQueueItem: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(pendingQueue).where(eq(pendingQueue.id, input.id));
        await logChange(`返信待ち (ID: ${input.id}) を削除`, "pendingQueue", input.id);
        return { success: true };
      }),

    // Vault Entries CRUD
    getVaultEntries: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(vaultEntries).orderBy(asc(vaultEntries.category));
    }),

    createVaultEntry: publicProcedure
      .input(z.object({
        category: z.string().min(1),
        key: z.string().min(1),
        maskedValue: z.string().min(1),
        actualValue: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [entry] = await db.insert(vaultEntries).values({
          category: input.category,
          key: input.key,
          maskedValue: input.maskedValue,
          actualValue: input.actualValue,
        }).returning();
        await logChange(`Vault「${input.key}」を追加`, "vaultEntries", entry.id);
        return entry;
      }),

    updateVaultEntry: publicProcedure
      .input(z.object({
        id: z.number(),
        category: z.string().optional(),
        key: z.string().optional(),
        maskedValue: z.string().optional(),
        actualValue: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const updateData: any = { updatedAt: new Date() };
        if (input.category !== undefined) updateData.category = input.category;
        if (input.key !== undefined) updateData.key = input.key;
        if (input.maskedValue !== undefined) updateData.maskedValue = input.maskedValue;
        if (input.actualValue !== undefined) updateData.actualValue = input.actualValue;
        await db.update(vaultEntries).set(updateData).where(eq(vaultEntries.id, input.id));
        await logChange(`Vault (ID: ${input.id}) を更新`, "vaultEntries", input.id);
        return { success: true };
      }),

    deleteVaultEntry: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(vaultEntries).where(eq(vaultEntries.id, input.id));
        await logChange(`Vault (ID: ${input.id}) を削除`, "vaultEntries", input.id);
        return { success: true };
      }),

    // Audit Logs
    getAuditLogs: publicProcedure
      .input(z.object({ limit: z.number().default(100) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return await db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp)).limit(input.limit);
      }),

    // Secret Notes CRUD
    createSecretNote: publicProcedure
      .input(z.object({ title: z.string().min(1), body: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [note] = await db.insert(secretNotes).values({
          title: input.title,
          body: input.body,
        }).returning();
        await logChange(`秘匿メモ「${input.title}」を追加`, "secretNotes", note.id);
        return note;
      }),

    updateSecretNote: publicProcedure
      .input(z.object({ id: z.number(), title: z.string().optional(), body: z.string().optional() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const updateData: any = { updatedAt: new Date() };
        if (input.title !== undefined) updateData.title = input.title;
        if (input.body !== undefined) updateData.body = input.body;
        await db.update(secretNotes).set(updateData).where(eq(secretNotes.id, input.id));
        await logChange(`秘匿メモ (ID: ${input.id}) を更新`, "secretNotes", input.id);
        return { success: true };
      }),

    deleteSecretNote: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(secretNotes).where(eq(secretNotes.id, input.id));
        await logChange(`秘匿メモ (ID: ${input.id}) を削除`, "secretNotes", input.id);
        return { success: true };
      }),

    // Events CRUD
    createEvent: publicProcedure
      .input(z.object({
        title: z.string().min(1),
        date: z.string(),
        category: z.string().min(1),
        notes: z.string().optional(),
        checklist: z.array(z.object({ id: z.string(), text: z.string(), completed: z.boolean() })).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [event] = await db.insert(events).values({
          title: input.title,
          date: new Date(input.date),
          category: input.category,
          checklist: input.checklist || [],
          notes: input.notes || null,
          attachments: [],
        }).returning();
        await logChange(`イベント「${input.title}」を追加`, "events", event.id);
        return event;
      }),

    updateEvent: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        date: z.string().optional(),
        category: z.string().optional(),
        notes: z.string().optional(),
        checklist: z.array(z.object({ id: z.string(), text: z.string(), completed: z.boolean() })).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const updateData: any = { updatedAt: new Date() };
        if (input.title !== undefined) updateData.title = input.title;
        if (input.date !== undefined) updateData.date = new Date(input.date);
        if (input.category !== undefined) updateData.category = input.category;
        if (input.notes !== undefined) updateData.notes = input.notes;
        if (input.checklist !== undefined) updateData.checklist = input.checklist;
        await db.update(events).set(updateData).where(eq(events.id, input.id));
        await logChange(`イベント (ID: ${input.id}) を更新`, "events", input.id);
        return { success: true };
      }),

    deleteEvent: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(events).where(eq(events.id, input.id));
        await logChange(`イベント (ID: ${input.id}) を削除`, "events", input.id);
        return { success: true };
      }),

    // Inventory CRUD
    createInventoryItem: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        qty: z.number().default(0),
        location: z.string().min(1),
        condition: z.string().optional(),
        photo: z.string().optional(),
        notes: z.string().optional(),
        tags: z.array(z.string()).default([]),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [item] = await db.insert(inventory).values({
          name: input.name,
          qty: input.qty,
          location: input.location,
          condition: input.condition || null,
          photo: input.photo || null,
          notes: input.notes || null,
          tags: input.tags,
        }).returning();
        await logChange(`備品「${input.name}」を追加`, "inventory", item.id);
        return item;
      }),

    updateInventoryItem: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        qty: z.number().optional(),
        location: z.string().optional(),
        condition: z.string().optional(),
        photo: z.string().optional(),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
        lastCheckedAt: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const updateData: any = { updatedAt: new Date() };
        if (input.name !== undefined) updateData.name = input.name;
        if (input.qty !== undefined) updateData.qty = input.qty;
        if (input.location !== undefined) updateData.location = input.location;
        if (input.condition !== undefined) updateData.condition = input.condition;
        if (input.photo !== undefined) updateData.photo = input.photo;
        if (input.notes !== undefined) updateData.notes = input.notes;
        if (input.tags !== undefined) updateData.tags = input.tags;
        if (input.lastCheckedAt !== undefined) updateData.lastCheckedAt = new Date(input.lastCheckedAt);
        await db.update(inventory).set(updateData).where(eq(inventory.id, input.id));
        await logChange(`備品 (ID: ${input.id}) を更新`, "inventory", input.id);
        return { success: true };
      }),

    deleteInventoryItem: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(inventory).where(eq(inventory.id, input.id));
        await logChange(`備品 (ID: ${input.id}) を削除`, "inventory", input.id);
        return { success: true };
      }),

    // FAQ Create
    createFAQ: publicProcedure
      .input(z.object({
        question: z.string().min(1),
        answer: z.string().min(1),
        relatedRuleIds: z.array(z.number()).default([]),
        relatedPostIds: z.array(z.number()).default([]),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [item] = await db.insert(faq).values({
          question: input.question,
          answer: input.answer,
          relatedRuleIds: input.relatedRuleIds,
          relatedPostIds: input.relatedPostIds,
        }).returning();
        await logChange(`FAQ「${input.question}」を追加`, "faq", item.id);
        return item;
      }),

    // Templates CRUD
    createTemplate: publicProcedure
      .input(z.object({
        title: z.string().min(1),
        body: z.string().min(1),
        category: z.string().min(1),
        tags: z.array(z.string()).default([]),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [item] = await db.insert(templates).values({
          title: input.title,
          body: input.body,
          category: input.category,
          tags: input.tags,
        }).returning();
        await logChange(`テンプレート「${input.title}」を追加`, "templates", item.id);
        return item;
      }),

    updateTemplate: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        body: z.string().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const updateData: any = { updatedAt: new Date() };
        if (input.title !== undefined) updateData.title = input.title;
        if (input.body !== undefined) updateData.body = input.body;
        if (input.category !== undefined) updateData.category = input.category;
        if (input.tags !== undefined) updateData.tags = input.tags;
        await db.update(templates).set(updateData).where(eq(templates.id, input.id));
        await logChange(`テンプレート (ID: ${input.id}) を更新`, "templates", input.id);
        return { success: true };
      }),

    deleteTemplate: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(templates).where(eq(templates.id, input.id));
        await logChange(`テンプレート (ID: ${input.id}) を削除`, "templates", input.id);
        return { success: true };
      }),

    // Rules CRUD
    createRule: publicProcedure
      .input(z.object({
        title: z.string().min(1),
        summary: z.string().min(1),
        details: z.string().min(1),
        status: z.enum(["draft", "decided", "published"]).default("decided"),
        evidenceLinks: z.array(z.string()).default([]),
        isHypothesis: z.boolean().default(false),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [rule] = await db.insert(rules).values({
          title: input.title,
          summary: input.summary,
          details: input.details,
          status: input.status,
          evidenceLinks: input.evidenceLinks,
          isHypothesis: input.isHypothesis,
        }).returning();
        await logChange(`ルール「${input.title}」を追加`, "rules", rule.id);
        return rule;
      }),

    updateRule: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        summary: z.string().optional(),
        details: z.string().optional(),
        status: z.enum(["draft", "decided", "published"]).optional(),
        evidenceLinks: z.array(z.string()).optional(),
        isHypothesis: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const updateData: any = { updatedAt: new Date() };
        if (input.title !== undefined) updateData.title = input.title;
        if (input.summary !== undefined) updateData.summary = input.summary;
        if (input.details !== undefined) updateData.details = input.details;
        if (input.status !== undefined) updateData.status = input.status;
        if (input.evidenceLinks !== undefined) updateData.evidenceLinks = input.evidenceLinks;
        if (input.isHypothesis !== undefined) updateData.isHypothesis = input.isHypothesis;
        await db.update(rules).set(updateData).where(eq(rules.id, input.id));
        await logChange(`ルール (ID: ${input.id}) を更新`, "rules", input.id);
        return { success: true };
      }),

    deleteRule: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(rules).where(eq(rules.id, input.id));
        await logChange(`ルール (ID: ${input.id}) を削除`, "rules", input.id);
        return { success: true };
      }),

    getHouseholds: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(households).orderBy(asc(households.householdId));
    }),

    updateHousehold: publicProcedure
      .input(
        z.object({
          householdId: z.string(),
          moveInDate: z.date().optional(),
          leaderHistoryCount: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db
          .update(households)
          .set({
            moveInDate: input.moveInDate,
            leaderHistoryCount: input.leaderHistoryCount,
          })
          .where(eq(households.householdId, input.householdId));

        // Get the numeric ID for the changelog
        const household = await db.select().from(households).where(eq(households.householdId, input.householdId)).limit(1);
        await logChange(`住戸 ${input.householdId} の情報を更新`, "households", household[0]?.id);

        return { success: true };
      }),

    recalculateSchedules: publicProcedure
      .input(z.object({ year: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const allHouseholds = await db.select().from(households);
        const prevYear = input.year - 1;
        const prevScheduleArray = await db
          .select()
          .from(leaderSchedule)
          .where(eq(leaderSchedule.year, prevYear))
          .limit(1);
        const prevSchedule = prevScheduleArray[0];

        const exemptions = await db
          .select()
          .from(exemptionRequests)
          .where(
            and(
              eq(exemptionRequests.year, input.year),
              eq(exemptionRequests.status, "approved")
            )
          );

        const exemptedHouseholds = new Set(exemptions.map((e) => e.householdId));
        const now = new Date();
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
        const lessThanYearHouseholds = new Set(
          allHouseholds
            .filter((h) => h.moveInDate && h.moveInDate > twelveMonthsAgo)
            .map((h) => h.householdId)
        );

        const recentLeaderHouseholds = new Set(
          allHouseholds
            .filter((h) => (h.leaderHistoryCount || 0) > 0)
            .map((h) => h.householdId)
        );

        const candidates = allHouseholds
          .filter((h) => {
            return !exemptedHouseholds.has(h.householdId) &&
                   !lessThanYearHouseholds.has(h.householdId) &&
                   !recentLeaderHouseholds.has(h.householdId);
          })
          .sort((a, b) => {
            const aYearsSinceLast = prevSchedule
              ? prevSchedule.primaryHouseholdId === a.householdId ? 1 : 999
              : 999;
            const bYearsSinceLast = prevSchedule
              ? prevSchedule.primaryHouseholdId === b.householdId ? 1 : 999
              : 999;

            if (aYearsSinceLast !== bYearsSinceLast) {
              return bYearsSinceLast - aYearsSinceLast;
            }

            if (a.moveInDate && b.moveInDate) {
              return a.moveInDate.getTime() - b.moveInDate.getTime();
            }

            return a.householdId.localeCompare(b.householdId);
          });

        await db
          .delete(leaderSchedule)
          .where(eq(leaderSchedule.year, input.year));

        if (candidates.length >= 2) {
          const primary = candidates[0];
          const backup = candidates[1];

          await db.insert(leaderSchedule).values({
            year: input.year,
            primaryHouseholdId: primary.householdId,
            backupHouseholdId: backup.householdId,
            status: "draft",
            reason: "自動再計算",
          });
        }

        await logChange(`${input.year}年度ローテを再計算`, "leaderSchedule");

        return { success: true, candidateCount: candidates.length };
      }),

    getRotationWithReasons: publicProcedure
      .input(z.object({ year: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const allHouseholds = await db.select().from(households);

        const prevYear = input.year - 1;
        const prevScheduleArray = await db
          .select()
          .from(leaderSchedule)
          .where(eq(leaderSchedule.year, prevYear))
          .limit(1);
        const prevSchedule = prevScheduleArray[0];

        const exemptions = await db
          .select()
          .from(exemptionRequests)
          .where(
            and(
              eq(exemptionRequests.year, input.year),
              eq(exemptionRequests.status, "approved")
            )
          );

        const exemptedHouseholds = new Set(exemptions.map((e) => e.householdId));

        const now = new Date();
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
        const lessThanYearHouseholds = new Set(
          allHouseholds
            .filter((h) => h.moveInDate && h.moveInDate > twelveMonthsAgo)
            .map((h) => h.householdId)
        );

        const recentLeaderHouseholds = new Set(
          allHouseholds
            .filter((h) => (h.leaderHistoryCount || 0) > 0)
            .map((h) => h.householdId)
        );

        const householdsWithReasons = allHouseholds.map((h) => {
          const reasons: string[] = [];
          if (lessThanYearHouseholds.has(h.householdId)) {
            reasons.push("A");
          }
          if (recentLeaderHouseholds.has(h.householdId)) {
            reasons.push("B");
          }
          if (exemptedHouseholds.has(h.householdId)) {
            reasons.push("C");
          }

          return {
            householdId: h.householdId,
            moveInDate: h.moveInDate,
            leaderHistoryCount: h.leaderHistoryCount || 0,
            reasons: reasons,
            isCandidate: reasons.length === 0,
          };
        });

        const schedule = await db
          .select()
          .from(leaderSchedule)
          .where(eq(leaderSchedule.year, input.year))
          .limit(1);

        return {
          year: input.year,
          households: householdsWithReasons,
          schedule: schedule[0] || null,
        };
      }),

    getResidentEmails: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(residentEmails);
    }),

    upsertResidentEmail: publicProcedure
      .input(z.object({
        householdId: z.string().min(1),
        email: z.string().email(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        // Check if email exists for this household
        const existing = await db.select().from(residentEmails)
          .where(eq(residentEmails.householdId, input.householdId)).limit(1);
        if (existing.length > 0) {
          await db.update(residentEmails)
            .set({ email: input.email, updatedAt: new Date() })
            .where(eq(residentEmails.id, existing[0].id));
          await logChange(`住戸${input.householdId}のメールを更新`, "residentEmails", existing[0].id);
        } else {
          const [entry] = await db.insert(residentEmails).values({
            householdId: input.householdId,
            email: input.email,
          }).returning();
          await logChange(`住戸${input.householdId}のメールを登録`, "residentEmails", entry.id);
        }
        return { success: true };
      }),

    deleteResidentEmail: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(residentEmails).where(eq(residentEmails.id, input.id));
        await logChange(`住民メール (ID: ${input.id}) を削除`, "residentEmails", input.id);
        return { success: true };
      }),

    // River Cleaning Runs CRUD
    getRiverCleaningRuns: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(riverCleaningRuns).orderBy(desc(riverCleaningRuns.date));
    }),

    createRiverCleaningRun: publicProcedure
      .input(z.object({
        date: z.string(),
        participantsCount: z.number().optional(),
        issues: z.string().optional(),
        whatWorked: z.string().optional(),
        whatToImprove: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [run] = await db.insert(riverCleaningRuns).values({
          date: new Date(input.date),
          participantsCount: input.participantsCount ?? null,
          issues: input.issues || null,
          whatWorked: input.whatWorked || null,
          whatToImprove: input.whatToImprove || null,
          attachments: [],
          linkedInventoryIds: [],
        }).returning();
        await logChange(`河川清掃記録を追加 (${input.date})`, "riverCleaningRuns", run.id);
        return run;
      }),

    updateRiverCleaningRun: publicProcedure
      .input(z.object({
        id: z.number(),
        date: z.string().optional(),
        participantsCount: z.number().optional(),
        issues: z.string().optional(),
        whatWorked: z.string().optional(),
        whatToImprove: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const updateData: any = { updatedAt: new Date() };
        if (input.date !== undefined) updateData.date = new Date(input.date);
        if (input.participantsCount !== undefined) updateData.participantsCount = input.participantsCount;
        if (input.issues !== undefined) updateData.issues = input.issues;
        if (input.whatWorked !== undefined) updateData.whatWorked = input.whatWorked;
        if (input.whatToImprove !== undefined) updateData.whatToImprove = input.whatToImprove;
        await db.update(riverCleaningRuns).set(updateData).where(eq(riverCleaningRuns.id, input.id));
        await logChange(`河川清掃記録 (ID: ${input.id}) を更新`, "riverCleaningRuns", input.id);
        return { success: true };
      }),

    deleteRiverCleaningRun: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(riverCleaningRuns).where(eq(riverCleaningRuns.id, input.id));
        await logChange(`河川清掃記録 (ID: ${input.id}) を削除`, "riverCleaningRuns", input.id);
        return { success: true };
      }),

    getForms: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(forms).orderBy(desc(forms.createdAt));
    }),

    // 認証不要：アクティブなフォーム一覧を返す
    getActiveForms: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      const activeForms = await db
        .select()
        .from(forms)
        .where(eq(forms.status, "active"))
        .orderBy(desc(forms.createdAt));

      const formsWithDetails = await Promise.all(
        activeForms.map(async (form) => {
          const questions = await db
            .select()
            .from(formQuestions)
            .where(eq(formQuestions.formId, form.id))
            .orderBy(asc(formQuestions.orderIndex));

          const questionsWithChoices = await Promise.all(
            questions.map(async (question) => {
              const choices = await db
                .select()
                .from(formChoices)
                .where(eq(formChoices.questionId, question.id))
                .orderBy(asc(formChoices.orderIndex));

              return { ...question, choices };
            })
          );

          return { ...form, questions: questionsWithChoices };
        })
      );

      return formsWithDetails;
    }),

    submitFormResponse: publicProcedure
      .input(
        z.object({
          formId: z.number(),
          householdId: z.string().optional(),
          answers: z.array(
            z.object({
              questionId: z.number(),
              choiceId: z.number().optional(),
              textAnswer: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        try {
          const [createdResponse] = await db.insert(formResponses).values({
            formId: input.formId,
            householdId: input.householdId || null,
            submittedAt: new Date(),
          }).returning();

          const responseId = createdResponse.id;

          for (const answer of input.answers) {
            await db.insert(formResponseItems).values({
              responseId,
              questionId: answer.questionId,
              choiceId: answer.choiceId || null,
              textAnswer: answer.textAnswer || null,
            });
          }

          const formData = await db.select().from(forms).where(eq(forms.id, input.formId)).limit(1);
          if (formData.length > 0) {
            try {
              await notifyOwner({
                title: `フォーム回答: ${formData[0].title}`,
                content: `${input.householdId || "匿名"} から「${formData[0].title}」への回答がありました。`,
              });
            } catch (notifyError) {
              console.warn("Failed to send notification:", notifyError);
            }
          }

          await logChange(`フォーム「${formData[0]?.title}」に回答`, "formResponses", responseId);

          return { success: true, responseId };
        } catch (error) {
          console.error("Form submission error:", error);
          throw new Error("Failed to submit form response");
        }
      }),

    createForm: publicProcedure
      .input(
        z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          dueDate: z.string().optional(),
          questions: z.array(
            z.object({
              text: z.string().min(1),
              type: z.enum(["single_choice", "multiple_choice"]),
              choices: z.array(z.string().min(1)),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        try {
          const [createdForm] = await db.insert(forms).values({
            title: input.title,
            description: input.description || null,
            dueDate: input.dueDate ? new Date(input.dueDate) : null,
            status: "draft",
          }).returning();

          const formId = createdForm.id;

          for (let qIndex = 0; qIndex < input.questions.length; qIndex++) {
            const question = input.questions[qIndex];

            const [createdQuestion] = await db.insert(formQuestions).values({
              formId,
              questionText: question.text,
              questionType: question.type,
              required: true,
              orderIndex: qIndex,
            }).returning();

            const questionId = createdQuestion.id;

            for (let cIndex = 0; cIndex < question.choices.length; cIndex++) {
              const choice = question.choices[cIndex];
              if (choice.trim()) {
                await db.insert(formChoices).values({
                  questionId,
                  choiceText: choice,
                  orderIndex: cIndex,
                });
              }
            }
          }

          await logChange(`フォーム「${input.title}」を作成`, "forms", formId);

          return { success: true, formId };
        } catch (error) {
          console.error("Form creation error:", error);
          throw new Error("Failed to create form");
        }
      }),

    getFormStats: publicProcedure
      .input(z.object({ formId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;

        try {
          const form = await db.select().from(forms).where(eq(forms.id, input.formId)).limit(1);
          if (!form.length) throw new Error("Form not found");

          const questions = await db
            .select()
            .from(formQuestions)
            .where(eq(formQuestions.formId, input.formId))
            .orderBy(asc(formQuestions.orderIndex));

          const questionStats = await Promise.all(
            questions.map(async (question) => {
              const choices = await db
                .select()
                .from(formChoices)
                .where(eq(formChoices.questionId, question.id))
                .orderBy(asc(formChoices.orderIndex));

              const choiceStats = await Promise.all(
                choices.map(async (choice) => {
                  const count = await db
                    .select()
                    .from(formResponseItems)
                    .where(and(eq(formResponseItems.questionId, question.id), eq(formResponseItems.choiceId, choice.id)));

                  return {
                    id: choice.id,
                    text: choice.choiceText,
                    count: count.length,
                  };
                })
              );

              return {
                id: question.id,
                text: question.questionText,
                type: question.questionType,
                choices: choiceStats,
              };
            })
          );

          const responses = await db
            .select()
            .from(formResponses)
            .where(eq(formResponses.formId, input.formId));

          const respondents = await Promise.all(
            responses.map(async (response) => {
              const items = await db
                .select()
                .from(formResponseItems)
                .where(eq(formResponseItems.responseId, response.id));

              return {
                id: response.id,
                householdId: response.householdId,
                submittedAt: response.submittedAt,
                answerCount: items.length,
              };
            })
          );

          const allHouseholds = await db.select().from(households);
          const respondedHouseholds = new Set(respondents.map((r) => r.householdId));
          const unansweredHouseholds = allHouseholds.filter(
            (h) => !respondedHouseholds.has(h.householdId)
          );

          return {
            form: form[0],
            questions: questionStats,
            respondents,
            totalHouseholds: allHouseholds.length,
            respondedCount: respondents.length,
            unansweredCount: unansweredHouseholds.length,
            unansweredHouseholds,
          };
        } catch (error) {
          console.error("Form stats error:", error);
          throw new Error("Failed to get form stats");
        }
      }),

    updateForm: publicProcedure
      .input(
        z.object({
          formId: z.number(),
          title: z.string().min(1).optional(),
          description: z.string().optional(),
          dueDate: z.string().optional(),
          status: z.enum(["draft", "active", "closed"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        try {
          const updateData: any = {};
          if (input.title) updateData.title = input.title;
          if (input.description !== undefined) updateData.description = input.description || null;
          if (input.dueDate !== undefined) updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
          if (input.status) updateData.status = input.status;

          await db.update(forms).set(updateData).where(eq(forms.id, input.formId));

          await logChange(`フォーム (ID: ${input.formId}) を更新`, "forms", input.formId);

          return { success: true };
        } catch (error) {
          console.error("Form update error:", error);
          throw new Error("Failed to update form");
        }
      }),

    deleteForm: publicProcedure
      .input(z.object({ formId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        try {
          const responses = await db
            .select()
            .from(formResponses)
            .where(eq(formResponses.formId, input.formId));

          for (const response of responses) {
            await db
              .delete(formResponseItems)
              .where(eq(formResponseItems.responseId, response.id));
          }

          await db.delete(formResponses).where(eq(formResponses.formId, input.formId));

          const questions = await db
            .select()
            .from(formQuestions)
            .where(eq(formQuestions.formId, input.formId));

          for (const question of questions) {
            await db.delete(formChoices).where(eq(formChoices.questionId, question.id));
          }

          await db.delete(formQuestions).where(eq(formQuestions.formId, input.formId));

          await db.delete(forms).where(eq(forms.id, input.formId));

          await logChange(`フォーム (ID: ${input.formId}) を削除`, "forms", input.formId);

          return { success: true };
        } catch (error) {
          console.error("Form deletion error:", error);
          throw new Error("Failed to delete form");
        }
      }),
  }),

  // 投稿管理 API
  posts: router({
    create: publicProcedure
      .input(
        z.object({
          title: z.string(),
          body: z.string(),
          tags: z.array(z.string()),
          category: z.enum(["inquiry", "answer", "decision", "pending", "trouble", "improvement"]),
          year: z.number(),
          isHypothesis: z.boolean().default(false),
          relatedLinks: z.array(z.string()).default([]),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.insert(posts).values({
          title: input.title,
          body: input.body,
          tags: input.tags,
          category: input.category,
          year: input.year,
          status: "published",
          isHypothesis: input.isHypothesis,
          relatedLinks: input.relatedLinks,
          publishedAt: new Date(),
        });

        await logChange(`投稿「${input.title}」を作成`, "posts");

        return { success: true };
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        body: z.string().optional(),
        tags: z.array(z.string()).optional(),
        category: z.enum(["inquiry", "answer", "decision", "pending", "trouble", "improvement"]).optional(),
        isHypothesis: z.boolean().optional(),
        relatedLinks: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const updateData: any = { updatedAt: new Date() };
        if (input.title !== undefined) updateData.title = input.title;
        if (input.body !== undefined) updateData.body = input.body;
        if (input.tags !== undefined) updateData.tags = input.tags;
        if (input.category !== undefined) updateData.category = input.category;
        if (input.isHypothesis !== undefined) updateData.isHypothesis = input.isHypothesis;
        if (input.relatedLinks !== undefined) updateData.relatedLinks = input.relatedLinks;
        await db.update(posts).set(updateData).where(eq(posts.id, input.id));
        await logChange(`投稿 (ID: ${input.id}) を更新`, "posts", input.id);
        return { success: true };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(posts).where(eq(posts.id, input.id));
        await logChange(`投稿 (ID: ${input.id}) を削除`, "posts", input.id);
        return { success: true };
      }),
  }),

  // リマインダーメール送信
  reminder: router({
    sendFormReminderEmails: publicProcedure.mutation(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const upcomingForms = await db
        .select()
        .from(forms)
        .where(
          and(
            eq(forms.status, "active"),
            gte(forms.dueDate, now),
            lte(forms.dueDate, in24Hours)
          )
        );

      for (const form of upcomingForms) {
        const unansweredHouseholds = await db
          .select({ householdId: households.householdId })
          .from(households)
          .leftJoin(
            formResponses,
            and(
              eq(formResponses.householdId, households.householdId),
              eq(formResponses.formId, form.id)
            )
          )
          .where(eq(formResponses.id, null as any));

        for (const household of unansweredHouseholds) {
          await notifyOwner({
            title: `フォーム回答リマインダー: ${form.title}`,
            content: `住戸 ${household.householdId} へ\n\n下記のフォームの回答期限が近づいています。\n\nフォーム: ${form.title}\n期限: ${form.dueDate?.toLocaleString("ja-JP")}\n\nお早めに回答いただけるようお願いします。`,
          });
        }
      }

      await logChange(`リマインダーメール送信: ${upcomingForms.length}件`, "reminder");
      return { success: true, formsProcessed: upcomingForms.length };
    }),
  }),
});

export type AppRouter = typeof appRouter;
