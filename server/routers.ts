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
  pageContent,
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
    run: publicProcedure
      .input(z.object({ force: z.boolean().optional() }).optional())
      .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const force = input?.force ?? false;

      // 既にデータがある場合
      const existingHouseholds = await db.select().from(households);
      if (existingHouseholds.length > 0 && !force) {
        return { success: true, message: "データは既に投入済みです。force: true で再投入できます。", skipped: true };
      }

      // force モードの場合は既存データを削除（依存関係の順序で削除）
      if (force && existingHouseholds.length > 0) {
        await db.delete(formResponseItems);
        await db.delete(formResponses);
        await db.delete(formChoices);
        await db.delete(formQuestions);
        await db.delete(forms);
        await db.delete(changelog);
        await db.delete(secretNotes);
        await db.delete(vaultEntries);
        await db.delete(riverCleaningRuns);
        await db.delete(pageContent);
        await db.delete(posts);
        await db.delete(pendingQueue);
        await db.delete(handoverBagItems);
        await db.delete(leaderRotationLogic);
        await db.delete(leaderSchedule);
        await db.delete(exemptionRequests);
        await db.delete(ruleVersions);
        await db.delete(rules);
        await db.delete(templates);
        await db.delete(faq);
        await db.delete(inventory);
        await db.delete(events);
        await db.delete(households);
      }

      // 住戸 (9戸: 3階×3戸)
      const householdData = [
        { householdId: "101", moveInDate: new Date("2025-09-01"), leaderHistoryCount: 0 },
        { householdId: "102", moveInDate: new Date("2024-10-01"), leaderHistoryCount: 1 },
        { householdId: "103", moveInDate: new Date("2023-03-01"), leaderHistoryCount: 0 },
        { householdId: "201", moveInDate: new Date("2025-10-01"), leaderHistoryCount: 0 },
        { householdId: "202", moveInDate: new Date("2024-02-01"), leaderHistoryCount: 0 },
        { householdId: "203", moveInDate: new Date("2018-03-01"), leaderHistoryCount: 1 },
        { householdId: "301", moveInDate: new Date("2022-04-01"), leaderHistoryCount: 1 },
        { householdId: "302", moveInDate: new Date("2025-03-01"), leaderHistoryCount: 0 },
        { householdId: "303", moveInDate: new Date("2020-08-01"), leaderHistoryCount: 1 },
      ];
      for (const h of householdData) {
        await db.insert(households).values(h).onConflictDoNothing();
      }

      // 年間カレンダー（2025年度: 2025年4月〜2026年3月）
      const eventData = [
        { title: "河川清掃（第1回）", date: new Date("2025-04-20T08:00:00"), category: "清掃", checklist: [{ id: "1", text: "手袋準備", completed: false }, { id: "2", text: "参加者確認", completed: false }], notes: "黒石川周辺。出不足金対象活動。", attachments: [] as Array<{url:string,name:string}> },
        { title: "町内会報告書提出", date: new Date("2025-05-02T00:00:00"), category: "締切", checklist: [{ id: "1", text: "報告書作成", completed: false }], notes: "町内会への年間報告書", attachments: [] as Array<{url:string,name:string}> },
        { title: "総会・組長会", date: new Date("2025-04-26T19:00:00"), category: "会議", checklist: [{ id: "1", text: "議案書準備", completed: false }, { id: "2", text: "出欠確認", completed: false }], notes: "総会後に組長会。年度初回。大住公会堂にて。", attachments: [] as Array<{url:string,name:string}> },
        { title: "組長会", date: new Date("2025-05-26T19:00:00"), category: "会議", checklist: [], notes: "大住公会堂にて", attachments: [] as Array<{url:string,name:string}> },
        { title: "組長会", date: new Date("2025-06-26T19:00:00"), category: "会議", checklist: [], notes: "大住公会堂にて", attachments: [] as Array<{url:string,name:string}> },
        { title: "世帯家族調査配布・回収", date: new Date("2025-06-15T00:00:00"), category: "行事", checklist: [{ id: "1", text: "調査用紙配布", completed: false }, { id: "2", text: "回収", completed: false }], notes: "各世帯への調査用紙の配布と回収", attachments: [] as Array<{url:string,name:string}> },
        { title: "河川清掃（第2回）", date: new Date("2025-07-06T08:00:00"), category: "清掃", checklist: [{ id: "1", text: "手袋準備", completed: false }], notes: "黒石川周辺", attachments: [] as Array<{url:string,name:string}> },
        { title: "組長会", date: new Date("2025-07-26T19:00:00"), category: "会議", checklist: [], notes: "大住公会堂にて", attachments: [] as Array<{url:string,name:string}> },
        { title: "防災訓練 第1回", date: new Date("2025-08-24T17:00:00"), category: "行事", checklist: [{ id: "1", text: "訓練内容確認", completed: false }], notes: "夕方実施。近隣住民も参加。", attachments: [] as Array<{url:string,name:string}> },
        { title: "組長会", date: new Date("2025-08-26T19:00:00"), category: "会議", checklist: [], notes: "大住公会堂にて", attachments: [] as Array<{url:string,name:string}> },
        { title: "黒石川堤防草刈り", date: new Date("2025-09-21T00:00:00"), category: "行事", checklist: [], notes: "マンション住民は参加不要。地主対応。", attachments: [] as Array<{url:string,name:string}> },
        { title: "組長会", date: new Date("2025-09-26T19:00:00"), category: "会議", checklist: [], notes: "大住公会堂にて", attachments: [] as Array<{url:string,name:string}> },
        { title: "防災訓練 第2回", date: new Date("2025-10-05T09:00:00"), category: "行事", checklist: [{ id: "1", text: "訓練内容確認", completed: false }], notes: "午前中実施。", attachments: [] as Array<{url:string,name:string}> },
        { title: "赤い羽根募金", date: new Date("2025-10-15T00:00:00"), category: "行事", checklist: [{ id: "1", text: "各世帯から集金", completed: false }], notes: "各世帯から募金を集める", attachments: [] as Array<{url:string,name:string}> },
        { title: "組長会", date: new Date("2025-10-26T19:00:00"), category: "会議", checklist: [], notes: "大住公会堂にて", attachments: [] as Array<{url:string,name:string}> },
        { title: "次年度組長選定プロセス開始", date: new Date("2025-11-01T00:00:00"), category: "行事", checklist: [{ id: "1", text: "候補者リスト作成", completed: false }, { id: "2", text: "候補者へ打診", completed: false }], notes: "候補者の選定と打診", attachments: [] as Array<{url:string,name:string}> },
        { title: "組長会", date: new Date("2025-11-26T19:00:00"), category: "会議", checklist: [], notes: "大住公会堂にて", attachments: [] as Array<{url:string,name:string}> },
        { title: "組長確定・組長会に報告", date: new Date("2025-12-01T00:00:00"), category: "行事", checklist: [{ id: "1", text: "次年度組長確定", completed: false }], notes: "次年度の203号室に確定", attachments: [] as Array<{url:string,name:string}> },
        { title: "組長会", date: new Date("2025-12-26T19:00:00"), category: "会議", checklist: [], notes: "大住公会堂にて", attachments: [] as Array<{url:string,name:string}> },
        { title: "引き継ぎ準備", date: new Date("2026-01-15T00:00:00"), category: "行事", checklist: [{ id: "1", text: "ポータルサイト更新", completed: false }, { id: "2", text: "資料整理", completed: false }], notes: "ポータルサイト更新、資料整理", attachments: [] as Array<{url:string,name:string}> },
        { title: "組長会", date: new Date("2026-01-26T19:00:00"), category: "会議", checklist: [], notes: "大住公会堂にて", attachments: [] as Array<{url:string,name:string}> },
        { title: "組長会", date: new Date("2026-02-26T19:00:00"), category: "会議", checklist: [], notes: "大住公会堂にて", attachments: [] as Array<{url:string,name:string}> },
        { title: "防災訓練 第3回", date: new Date("2026-03-15T00:00:00"), category: "行事", checklist: [], notes: "予定。まだ未実施。", attachments: [] as Array<{url:string,name:string}> },
        { title: "組長会", date: new Date("2026-03-26T19:00:00"), category: "会議", checklist: [], notes: "大住公会堂にて", attachments: [] as Array<{url:string,name:string}> },
      ];
      for (const e of eventData) {
        await db.insert(events).values(e);
      }

      // 備品台帳（組長倉庫：階段下の物置）
      const inventoryData = [
        { name: "平スコップ", qty: 2, location: "組長倉庫（階段下）", condition: "使用可", notes: null, tags: ["清掃", "河川清掃"] },
        { name: "剣先スコップ", qty: 2, location: "組長倉庫（階段下）", condition: "使用可", notes: null, tags: ["清掃", "河川清掃"] },
        { name: "土嚢袋", qty: 30, location: "組長倉庫（階段下）", condition: "良好", notes: "年1回配布あり", tags: ["防災"] },
        { name: "町内会旗", qty: 3, location: "組長倉庫（階段下）", condition: "未使用", notes: "使用実績なし", tags: ["行事"] },
        { name: "使い捨て手袋", qty: 1, location: "組長倉庫（階段下）", condition: "良好", notes: "河川清掃用。毎年100均で購入（500円程度）", tags: ["清掃", "消耗品"] },
        { name: "ヘルメット", qty: 2, location: "組長倉庫（階段下）", condition: "使用可", notes: null, tags: ["防災"] },
        { name: "鎌", qty: 2, location: "組長倉庫（階段下）", condition: "使用可", notes: null, tags: ["清掃"] },
        { name: "三本爪（レーキ）", qty: 1, location: "組長倉庫（階段下）", condition: "使用可", notes: null, tags: ["清掃"] },
        { name: "三角ホー", qty: 2, location: "組長倉庫（階段下）", condition: "使用可", notes: null, tags: ["清掃"] },
      ];
      for (const i of inventoryData) {
        await db.insert(inventory).values(i);
      }

      // FAQ
      const faqData = [
        { question: "河川清掃に参加できない場合は？", answer: "2025年度までは出不足金（1回につき定額）が発生しました。2026年度からは出不足金制度は廃止されています。小さなお子さんのいる家庭は免除対象です。", relatedRuleIds: [] as number[], relatedPostIds: [] as number[] },
        { question: "組長倉庫はどこですか？", answer: "エントランス横の階段下、駐輪場付近にあります。約1畳、腰の高さの物置です。鍵は組長が管理しています。", relatedRuleIds: [] as number[], relatedPostIds: [] as number[] },
        { question: "組長の選び方は？", answer: "入居順・経験回数をベースにローテーションで決定します。免除申請がある場合は組長会で審議されます。", relatedRuleIds: [] as number[], relatedPostIds: [] as number[] },
        { question: "管理会社はどこですか？", answer: "平和ハウジング株式会社です。設備トラブル等は管理会社に直接連絡してください。", relatedRuleIds: [] as number[], relatedPostIds: [] as number[] },
        { question: "屋上に上がれますか？", answer: "原則禁止です。法的リスク（落下事故等の責任問題）があるため、緊急時は管理会社または消防署に連絡してください。", relatedRuleIds: [] as number[], relatedPostIds: [] as number[] },
        { question: "古紙回収の収入はどうなりますか？", answer: "年間約1,000円程度の収入があり、組長活動費に充当されます。", relatedRuleIds: [] as number[], relatedPostIds: [] as number[] },
        { question: "出不足金（でぶそくきん）とは？", answer: "「出」は参加の意味。河川清掃等の共同活動に参加しなかった場合のペナルティ金です。2025年度で85,000円が積み立てられ、全額を組長倉庫の購入費用に充てました。2026年度から廃止されています。", relatedRuleIds: [] as number[], relatedPostIds: [] as number[] },
      ];
      for (const f of faqData) {
        await db.insert(faq).values(f);
      }

      // ルール・決定事項
      const rulesData = [
        { title: "出不足金制度の廃止", summary: "2026年度から出不足金を廃止", details: "出不足金は「出」=参加の意味。不参加者へのペナルティ金として運用してきたが、2025年度の積立金85,000円を全額組長倉庫購入に充当し、制度を廃止。", status: "decided" as const, evidenceLinks: [] as string[], isHypothesis: false },
        { title: "河川清掃の範囲確定", summary: "ISY隣接ビルの清掃範囲を明確化", details: "隣接するISYビル周辺の河川清掃範囲について町内会長が仲介。業者による対応で解決。グリーンピアの担当範囲を明確にした。", status: "decided" as const, evidenceLinks: [] as string[], isHypothesis: false },
        { title: "屋上立入禁止", summary: "屋上への立ち入りは原則禁止", details: "落下事故時の法的責任リスクが高いため、原則立入禁止。緊急時は管理会社（平和ハウジング）または消防署に連絡。", status: "decided" as const, evidenceLinks: [] as string[], isHypothesis: false },
        { title: "小さな子供がいる家庭の清掃免除", summary: "乳幼児のいる世帯は河川清掃を免除", details: "2026年度より、小さなお子さんのいる家庭は河川清掃への参加を免除する。", status: "decided" as const, evidenceLinks: [] as string[], isHypothesis: false },
        { title: "組長免除の検討", summary: "夜勤・育児等による組長免除の可否を検討中", details: "夜勤従事者や小さな子供がいる家庭からの免除要望あり。管理会社からは相反する見解が出ており、住民アンケートで意見を集約中。2026年3月までに結論を出す予定。", status: "draft" as const, evidenceLinks: [] as string[], isHypothesis: true },
        { title: "組長選出の運用細則", summary: "入居順ベースの選出ルール確定", details: "【免除規定】\n・組長経験者：任期終了翌月から24ヶ月免除（不均衡の是正）\n・新規入居者：入居後12ヶ月免除（運営・行事理解の猶予）\n\n【選出優先順位】\n①組長経験回数の少ない方（0回→1回→2回…）\n②同回数内は入居の古い方\n③同時期入居は部屋番号昇順\n\n【年次運用】\n・11月：組長決定アンケート実施→候補者リスト作成・回覧\n・12月：平和ハウジング照会→正式決定→町内会へ報告\n\n令和7年11月9日 町内会長承認済み。", status: "decided" as const, evidenceLinks: [] as string[], isHypothesis: false },
        { title: "河川清掃の参加免除基準（提案中）", summary: "安全配慮に基づく免除対象の明確化", details: "【免除対象案】\n・小学生以下の子供がいる世帯\n・妊娠中の方\n・70歳以上の方\n・疾病・療養・介護中の方\n\n【手続き案】\n・11月の組長決定アンケートで届出受理\n・最終確認は町内会長判断\n\n【任意協力金案】\n・100〜200円（飲料・消耗品相当）を検討\n\n令和7年11月9日 町内会長へ提案書提出済み。回答待ち。", status: "draft" as const, evidenceLinks: [] as string[], isHypothesis: true },
        { title: "町内会費の徴収方法の明確化", summary: "集合住宅は管理会社が一括徴収", details: "令和7年度「組長顔合わせ会（保存版資料）」に「組長が町内会費を徴収」と記載があり誤認が発生。\n実態：集合住宅（マンション）は管理会社（平和ハウジング）が一括徴収。マンション組長による徴収は不要。\n→次年度資料への追記を提案済み。", status: "decided" as const, evidenceLinks: [] as string[], isHypothesis: false },
      ];
      for (const r of rulesData) {
        await db.insert(rules).values(r);
      }

      // テンプレート
      const templateData = [
        { title: "回覧テンプレート", body: "グリーンピア焼津 回覧\n\n日付: 令和○年○月○日\n発信者: 組長（○号室）\n\n件名: ○○○について\n\n本文:\n\n※確認後、次の方へお回しください。\n回覧順：101→102→103→201→202→203→301→302→303", category: "連絡", tags: ["回覧板"] },
        { title: "河川清掃のお知らせ", body: "河川清掃のお知らせ\n\n日時: ○月○日（○）午前8時集合\n場所: グリーンピア玄関前\n持ち物: 長靴、軍手（手袋は組長が用意します）\n\n雨天の場合は中止とし、別途連絡いたします。\n\nご協力よろしくお願いいたします。\n\n組長 ○号室", category: "連絡", tags: ["河川清掃"] },
        { title: "組長引き継ぎメモテンプレート", body: "組長引き継ぎメモ\n\n前年度組長: ○号室\n新年度組長: ○号室\n引き継ぎ日: 令和○年○月○日\n\n引き継ぎ内容:\n□ 組長倉庫の鍵\n□ クリアファイル（資料一式）\n□ 金銭出入帳\n□ 回覧ファイル（2冊）\n\n特記事項:\n", category: "引き継ぎ", tags: ["引き継ぎ"] },
        { title: "防災訓練のお知らせ", body: "防災訓練のお知らせ\n\n日時: ○月○日（○）\n集合場所: グリーンピア玄関前\n内容: 避難経路確認、消火器使用訓練\n\nご参加よろしくお願いいたします。\n\n組長 ○号室", category: "連絡", tags: ["防災訓練"] },
        { title: "世帯調査票", body: "世帯家族調査票\n\n部屋番号: ○号室\n\n世帯主氏名:\n同居家族人数:\n\n緊急連絡先:\n\n備考:\n\n※ご記入後、組長にご提出ください。", category: "届出", tags: ["調査"] },
        { title: "町内会長への提案書テンプレート", body: "令和○年度　○○に関する提案書\n\n大泉町内会\n八町内会 会長　○○ ○○ 様\n\n令和○年○月○日\nグリーンピア○号室\n8組 組長　○○ ○○\n\n拝啓　時下ますますご清祥のこととお慶び申し上げます。\n平素より格別のご高配を賜り、厚く御礼申し上げます。\n\n（本文）\n\n以上、何卒ご検討のほどよろしくお願い申し上げます。\n敬具\n\n連絡先\n8組 組長　○○ ○○（グリーンピア○号室）\nTEL：○○○-○○○○-○○○○\nEmail：○○○@○○○.com", category: "町内会", tags: ["町内会", "提案書", "正式文書"] },
        { title: "住民アンケートテンプレート（組長運用）", body: "8組 グリーンピア入居者 各位\n\n日頃より、町内会活動およびマンション内の運営にご理解・ご協力をいただき、ありがとうございます。現組長の○号室・○○です。\n\n（背景説明）\n\nそこで、まずは住民の皆さまの実情やお考えを把握するため、アンケートを実施いたします。回答は任意で、無記名でも構いません。内容は集計し、個人が特定されない形で論点を整理します。\n\nお手数ですが、アンケート用紙を封筒に入れ、○号室ポストへ投函してください。\n\n【提出期限】○年○月○日\n【提出方法】封筒に入れて○号室ポストへ投函（無記名可）\n【問い合わせ】現組長（○号室）まで\n\n住民同士が気まずくならず、安心して居住し続けられる環境を維持するためにも、無理のない範囲でご協力いただけますと幸いです。\nどうぞよろしくお願いいたします。\n\n○年○月○日\n8組 グリーンピア　組長　○○ ○○\n\n※本件は契約・規約等の解釈に関わる可能性があります。必要に応じ、賃貸借契約・重要事項説明書・管理規約・自治会規約等の確認や、専門家への相談を行ってください。", category: "アンケート", tags: ["アンケート", "住民調査", "組長運用"] },
      ];
      for (const t of templateData) {
        await db.insert(templates).values(t);
      }

      // 引き継ぎ袋チェックリスト
      const handoverData = [
        { name: "組長倉庫の鍵", location: "引き継ぎ袋", isChecked: false, description: "階段下の物置の鍵", notes: "次年度組長へ引き渡し" },
        { name: "クリアファイル", location: "引き継ぎ袋", isChecked: false, description: "各種資料一式", notes: "通知文書、議事録等" },
        { name: "金銭出入帳", location: "引き継ぎ袋", isChecked: false, description: "出不足金等の収支記録", notes: "2025年度で出不足金は廃止" },
        { name: "回覧ファイル（1冊目）", location: "引き継ぎ袋", isChecked: false, description: "回覧板用ファイル", notes: null },
        { name: "回覧ファイル（2冊目）", location: "引き継ぎ袋", isChecked: false, description: "回覧板用ファイル", notes: null },
      ];
      for (const h of handoverData) {
        await db.insert(handoverBagItems).values(h);
      }

      // ローテスケジュール
      const scheduleData = [
        { year: 2025, primaryHouseholdId: "102", backupHouseholdId: "103", status: "confirmed" as const, reason: "2025年度確定（現任）" },
        { year: 2026, primaryHouseholdId: "203", backupHouseholdId: "301", status: "confirmed" as const, reason: "102:免除B（直近組長）、103/202:免除C（就任困難）、101/201/302:免除A（入居12ヶ月未満）→繰上げで203" },
        { year: 2027, primaryHouseholdId: "302", backupHouseholdId: "101", status: "draft" as const, reason: "自動計算: 0回組で入居が古い順。102:免除B、203:免除B、103/202:免除C想定" },
        { year: 2028, primaryHouseholdId: "101", backupHouseholdId: "201", status: "draft" as const, reason: "自動計算: 0回組で入居が古い順。102:免除B期限切れで復帰候補" },
      ];
      for (const s of scheduleData) {
        await db.insert(leaderSchedule).values(s);
      }

      // 免除申請（2026年度）
      // 103号室: C免除（就任困難 - 育児）
      await db.insert(exemptionRequests).values({
        householdId: "103",
        year: 2026,
        reason: "就任困難（育児中のため）",
        status: "approved",
        approvedAt: new Date("2025-12-01"),
      });
      // 202号室: C免除（就任困難 - 夜勤）
      await db.insert(exemptionRequests).values({
        householdId: "202",
        year: 2026,
        reason: "就任困難（夜勤従事のため）",
        status: "approved",
        approvedAt: new Date("2025-12-01"),
      });

      // ローテーションロジック
      await db.insert(leaderRotationLogic).values({
        version: 1,
        logic: {
          priority: [
            "入居年月が古い順（基本方針）",
            "免除対象が発生した場合は次に古い世帯へ繰上げ",
            "経験回数は参考情報（同条件で迷う場合の説明材料）"
          ],
          excludeConditions: [
            "A: 入居12ヶ月未満（自動免除、入居12ヶ月経過の翌月に自動復帰）",
            "B: 直近組長（任期終了翌月から24ヶ月免除）",
            "C: 就任困難申告（育児・健康・介護等、年1回11〜12月に継続確認）"
          ]
        },
        reason: "令和7年11月9日 町内会長承認済みの運用細則。ポータルには免除理由＋見直し時期を必ず記載。",
      });

      // 返信待ちキュー
      const pendingData = [
        { title: "組長免除アンケートの回答集約", description: "夜勤者・育児家庭の組長免除に関するアンケートを実施中。回答を集約し、オーナーとの交渉材料にする。", toWhom: "各世帯", priority: "high" as const, status: "pending" as const },
        { title: "オーナーとの組長制度協議", description: "アンケート結果をもとに、組長制度の改善案をオーナー（管理会社経由）に提案予定。", toWhom: "平和ハウジング株式会社", priority: "medium" as const, status: "pending" as const },
        { title: "町内会長からの提案書回答待ち", description: "令和7年11月9日提出の統合提案書への回答。河川清掃免除基準・草刈り責任所在・周知改善について12月中の方向性提示を依頼済み。", toWhom: "中山裕二 会長（大泉町内会）", priority: "high" as const, status: "pending" as const },
        { title: "住民アンケート回答の集約（2/28期限）", description: "2026年2月4日配布の組長運用アンケート。提出期限2/28。回答を集約し、オーナーへの申し入れ材料として整理する。Q6の運用方向性（A/B/C/D）の集計が特に重要。", toWhom: "各世帯（9世帯）", priority: "high" as const, status: "pending" as const },
        { title: "管理会社からの対応回答待ち", description: "特定入居者の独自見解（免除全否定・退去発言等）について管理会社へ相談済み。公式な説明・指導の実施を依頼中。", toWhom: "平和ハウジング株式会社", priority: "high" as const, status: "pending" as const },
      ];
      for (const p of pendingData) {
        await db.insert(pendingQueue).values(p);
      }

      // 年度ログ（2025年度）
      const postsData = [
        { title: "組長倉庫の設置", body: "組長の備品保管場所がなく、個人宅での保管が負担になっていた問題を解決。出不足金の積立金85,000円を全額使用し、エントランス横の階段下に専用物置を購入・設置。約1畳、腰高サイズ。", tags: ["設備", "解決済み"] as string[], year: 2025, category: "improvement" as const, status: "published" as const, isHypothesis: false, relatedLinks: [] as string[], publishedAt: new Date("2025-06-01") },
        { title: "河川清掃範囲の紛争解決", body: "隣接するISYビル周辺の河川清掃範囲について紛争が発生。町内会長が仲介に入り、業者による清掃で解決。グリーンピアの担当範囲を明確にした。", tags: ["河川清掃", "解決済み"] as string[], year: 2025, category: "trouble" as const, status: "published" as const, isHypothesis: false, relatedLinks: [] as string[], publishedAt: new Date("2025-07-15") },
        { title: "屋上アクセス要請への対応", body: "住民から屋上への立ち入り要請あり。法的リスク（落下事故時の責任）を説明し、原則禁止とした。緊急時は管理会社または消防署に連絡する運用に。", tags: ["安全", "解決済み"] as string[], year: 2025, category: "decision" as const, status: "published" as const, isHypothesis: false, relatedLinks: [] as string[], publishedAt: new Date("2025-08-20") },
        { title: "河川堤防草刈りの対応", body: "黒石川堤防の草刈りについて、地主がいる土地のため直接の作業は不可。地主が業者を手配して対応完了。マンション住民の作業は不要と確認。", tags: ["河川清掃", "解決済み"] as string[], year: 2025, category: "decision" as const, status: "published" as const, isHypothesis: false, relatedLinks: [] as string[], publishedAt: new Date("2025-09-25") },
        { title: "組長免除制度の検討（進行中）", body: "夜勤従事者や小さな子供がいる家庭から組長免除の要望あり。管理会社（平和ハウジング）からは相反する見解が出ており、住民アンケートを実施して意見を集約中。2026年3月までに結論を出す予定。", tags: ["組長制度", "進行中"] as string[], year: 2025, category: "pending" as const, status: "published" as const, isHypothesis: true, relatedLinks: [] as string[], publishedAt: new Date("2025-11-01") },
        { title: "町内会長への統合提案書を提出", body: "令和7年11月9日、大泉町内会八町内会会長（中山裕二様）宛てに「組長業務改善に関する統合提案書」を提出。\n\n提案内容：\n1. 組長選出ルールの確定（運用細則の策定報告）\n2. 河川清掃の安全配慮と参加免除基準\n3. 河川草刈り作業の責任所在確認\n4. 周知事項の改善（町内会費徴収の明確化、清掃範囲の可視化）\n\n12月中に方向性の回答を依頼。最終確定は令和8年3月末。", tags: ["町内会", "提案書", "組長制度"] as string[], year: 2025, category: "decision" as const, status: "published" as const, isHypothesis: false, relatedLinks: [] as string[], publishedAt: new Date("2025-11-09") },
        { title: "管理会社へ特定入居者対応を相談", body: "特定の入居者から組長免除の全否定や「組長をしないなら退去すべき」という趣旨の強い意見が複数回文書で示されたため、管理会社（平和ハウジング）へ公式な説明・指導を依頼。\n組長業務のローテーション位置づけ、免除の考え方、退去云々は正式ルールではないことの3点について説明を要請。回答待ち。\n※該当号室は秘匿（秘匿メモ参照）", tags: ["管理会社", "住民対応", "進行中"] as string[], year: 2025, category: "trouble" as const, status: "published" as const, isHypothesis: false, relatedLinks: [] as string[], publishedAt: new Date("2026-01-15") },
        { title: "住民アンケートを配布", body: "2026年2月4日、全9世帯に組長運用に関するアンケートを配布。\n\n主な質問内容:\n・組長業務の負担感\n・組長会や河川清掃への参加可否\n・今後の運用方向性（住民持ち回り/オーナー担当/折衷案）\n・引き継ぎ方法の改善\n\n背景として、町内会長からのオーナー側運用への示唆、他マンション実例（21組等）、管理会社の不関与スタンスを共有。\n提出期限: 2026年2月28日。回答を集約し、オーナーへの申し入れ材料とする予定。", tags: ["アンケート", "組長制度", "住民調査"] as string[], year: 2025, category: "decision" as const, status: "published" as const, isHypothesis: false, relatedLinks: [] as string[], publishedAt: new Date("2026-02-04") },
      ];
      for (const p of postsData) {
        await db.insert(posts).values(p);
      }

      // 河川清掃実施ログ（2025年度）
      const riverCleaningData = [
        { date: new Date("2025-04-20"), participantsCount: 15, issues: null, whatWorked: "黒石川周辺の清掃を班分けして効率的に実施", whatToImprove: null, attachments: [] as Array<{url:string,name:string}>, linkedInventoryIds: [] as number[] },
        { date: new Date("2025-07-06"), participantsCount: 12, issues: null, whatWorked: "前回の経験を活かしスムーズに進行", whatToImprove: null, attachments: [] as Array<{url:string,name:string}>, linkedInventoryIds: [] as number[] },
      ];
      for (const r of riverCleaningData) {
        await db.insert(riverCleaningRuns).values(r);
      }

      // Private Vault エントリ
      const vaultData = [
        { category: "管理", key: "組長倉庫 鍵の場所", maskedValue: "組長が管理", actualValue: "組長が保管。引き継ぎ時に次年度組長へ渡す", classification: "internal" as const },
        { category: "管理", key: "管理会社連絡先", maskedValue: "平和ハウジング", actualValue: "平和ハウジング株式会社（詳細は引き継ぎ資料参照）", classification: "internal" as const },
        { category: "ポータル", key: "ポータルサイト管理", maskedValue: "****", actualValue: "kumicho-portal.vercel.app（管理情報は別途）", classification: "confidential" as const },
        { category: "町内会", key: "町内会長 連絡先", maskedValue: "中山様", actualValue: "大泉町内会 八町内会 会長 中山裕二様（詳細は引き継ぎ資料参照）", classification: "internal" as const },
      ];
      for (const v of vaultData) {
        await db.insert(vaultEntries).values(v);
      }

      // 秘匿メモ
      const secretNotesData = [
        { title: "組長免除問題の経緯メモ", body: "夜勤者と小さな子供がいる家庭から免除要望あり。管理会社からは「免除は認められない」と「相談してください」の両方の見解が出ており統一されていない。住民アンケートを実施し、3月までに方針を決める必要がある。オーナーとの最終交渉は管理会社経由で行う予定。" },
        { title: "ISY河川清掃紛争の記録", body: "隣接するISYビル周辺の清掃範囲で紛争発生。町内会長に相談し仲介してもらった。最終的に業者対応で解決。今後同様の問題が起きた場合は町内会長を通すのが有効。" },
        { title: "統合提案書の全文記録（令和7年11月9日）", body: "令和7年度 組長業務改善に関する統合提案書\n宛先: 大泉町内会 八町内会 会長 中山裕二様\n提出日: 令和7年11月9日\n提出者: グリーンピア102号室 8組組長 野田誠紀\n\n【提案内容】\n1. 組長選出ルールの確定（運用細則の策定報告）\n - 免除規定: 経験者24ヶ月免除、新入居者12ヶ月免除\n - 優先順位: 経験回数少→入居古→部屋番号昇順\n - 年次運用: 11月アンケート→12月確定→報告\n\n2. 河川清掃の安全配慮と参加免除基準\n - 免除対象案: 小学生以下同伴/妊娠中/70歳以上/疾病・介護\n - 任意協力金100-200円を検討\n - 出不足金は廃止済み（85,000円→倉庫購入に充当）\n\n3. 河川草刈り作業の責任所在確認\n - 管理会社は関与なし、業者作業を1回確認\n - 町内会の方針を確認中\n\n4. 周知事項の改善\n - 町内会費: マンションは管理会社一括徴収（組長不要）\n - 清掃範囲: マンション前区間を基本担当に変更提案\n\n回答期限: 12月中（最終確定3月末）" },
        { title: "管理会社への相談メール記録（特定入居者対応）", body: "【宛先】平和ハウジング株式会社 静岡店 岡本様\n【発信者】102号室 野田\n【件名】特定入居者への対応ご相談\n\n【概要】\n特定の入居者から、組長業務や免除の運用に関して強い独自見解が複数回にわたり文書で示されている。\n\n主な内容:\n・いかなる事情（育児・介護・健康）であっても組長免除は認めるべきではないという主張\n・町内会で検討した免除案・ローテーション案の全否定\n・「組長をやらないなら退去すべき」という趣旨の表現\n\nこれらは一入居者の立場からの発言であり、退去の可否を判断できる立場にない方からの発言としては行き過ぎ。\n当該入居者は管理会社・オーナーからの説明には従う方と認識しており、権限を持つ管理会社から公式に説明・指導いただくよう依頼。\n\n【要請事項】\n1. 組長業務やローテーションの位置づけの説明\n2. 免除の考え方（育児・介護・健康・新入居・直近組長等）の説明\n3. 「組長をしない＝退去」は本物件の正式ルールではないことの説明\n\n※号室番号は秘匿。詳細は添付スキャン画像参照。" },
        { title: "住民アンケート全文（2026年2月4日配布）", body: "【配布日】2026年2月4日\n【提出期限】2026年2月28日\n【提出方法】封筒に入れて102号室ポストへ投函（無記名可）\n\n【カバーレター要旨】\n・河川清掃の範囲がマンション前に縮小される見込み（町内会長からの共有）\n・2025年度に運用上の論点（組長選出・免除・出不足金）で住民間の認識の分かれが複数発生\n・町内会長からの示唆: オーナー側が組長業務を担う方向の検討\n・管理会社（平和ハウジング）は町内会活動への関与を行わないスタンス\n\n【別紙B: 背景共有 6項目】\n1. 2025年度の主な論点（組長選出・河川清掃範囲・出不足金）\n2. 町内会側の認識（確認対応の集中が問題）\n3. 河川清掃のISY前範囲の進捗（関係先が業者手配・費用負担）\n4. 他マンション実例（21組等: オーナー側が役割を担う）\n5. 管理会社スタンス（関与しない）\n6. 組長業務の実態（負担感）\n\n【別紙C: アンケート質問 8問】\nQ1. 組長経験の有無\nQ2. 組長業務の負担感（5段階）\nQ3. 組長会（毎月26日19:00）への参加可否\nQ4. 河川清掃（土日朝8:00-9:00）への参加可否\nQ5. 負担が大きいと感じる業務（複数選択）\nQ6. 今後の運用方向性（A:住民持ち回り / B:オーナー担当 / C:折衷案 / D:わからない）\nQ7. 引き継ぎの改善（紙+Web / Web中心 / 紙中心）\nQ8. 自由記載" },
      ];
      for (const s of secretNotesData) {
        await db.insert(secretNotes).values(s);
      }

      // フォーム（住民アンケート）
      const [surveyForm] = await db.insert(forms).values({
        title: "組長運用に関するアンケート",
        description: "組長選出方法・町内会対応の運用ルール・役割分担の方向性についてのアンケートです。2026年2月4日配布。",
        dueDate: new Date("2026-02-28"),
        status: "active" as const,
      }).returning();

      // Q1: 組長経験
      const [q1] = await db.insert(formQuestions).values({
        formId: surveyForm.id,
        questionText: "組長経験について",
        questionType: "single_choice" as const,
        required: true,
        orderIndex: 1,
      }).returning();
      await db.insert(formChoices).values([
        { questionId: q1.id, choiceText: "ない（未経験）", orderIndex: 1 },
        { questionId: q1.id, choiceText: "ある（経験あり）", orderIndex: 2 },
        { questionId: q1.id, choiceText: "わからない", orderIndex: 3 },
      ]);

      // Q2: 負担感
      const [q2] = await db.insert(formQuestions).values({
        formId: surveyForm.id,
        questionText: "組長業務の負担感（イメージでも可）",
        questionType: "single_choice" as const,
        required: true,
        orderIndex: 2,
      }).returning();
      await db.insert(formChoices).values([
        { questionId: q2.id, choiceText: "かなり重い", orderIndex: 1 },
        { questionId: q2.id, choiceText: "重い", orderIndex: 2 },
        { questionId: q2.id, choiceText: "ふつう", orderIndex: 3 },
        { questionId: q2.id, choiceText: "軽い", orderIndex: 4 },
        { questionId: q2.id, choiceText: "わからない", orderIndex: 5 },
      ]);

      // Q3: 組長会参加
      const [q3] = await db.insert(formQuestions).values({
        formId: surveyForm.id,
        questionText: "組長会（毎月26日19:00〜）への参加の難しさ",
        questionType: "single_choice" as const,
        required: true,
        orderIndex: 3,
      }).returning();
      await db.insert(formChoices).values([
        { questionId: q3.id, choiceText: "参加できる", orderIndex: 1 },
        { questionId: q3.id, choiceText: "条件により参加できる", orderIndex: 2 },
        { questionId: q3.id, choiceText: "参加が難しい", orderIndex: 3 },
        { questionId: q3.id, choiceText: "わからない", orderIndex: 4 },
      ]);

      // Q4: 河川清掃参加
      const [q4] = await db.insert(formQuestions).values({
        formId: surveyForm.id,
        questionText: "河川清掃（土曜/日曜 朝8:00〜9:00）への参加の難しさ",
        questionType: "single_choice" as const,
        required: true,
        orderIndex: 4,
      }).returning();
      await db.insert(formChoices).values([
        { questionId: q4.id, choiceText: "参加できる", orderIndex: 1 },
        { questionId: q4.id, choiceText: "条件により参加できる", orderIndex: 2 },
        { questionId: q4.id, choiceText: "参加が難しい", orderIndex: 3 },
        { questionId: q4.id, choiceText: "わからない", orderIndex: 4 },
      ]);

      // Q5: 負担が大きい業務（複数選択）
      const [q5] = await db.insert(formQuestions).values({
        formId: surveyForm.id,
        questionText: "組長業務のうち「負担が大きい」と感じるもの（複数選択可）",
        questionType: "multiple_choice" as const,
        required: false,
        orderIndex: 5,
      }).returning();
      await db.insert(formChoices).values([
        { questionId: q5.id, choiceText: "町内会・管理会社との連絡調整", orderIndex: 1 },
        { questionId: q5.id, choiceText: "住民への周知（配布物作成、各戸投函等）", orderIndex: 2 },
        { questionId: q5.id, choiceText: "住民意見の整理（問い合わせ対応、調整等）", orderIndex: 3 },
        { questionId: q5.id, choiceText: "次年度組長の選出・引き継ぎ対応", orderIndex: 4 },
        { questionId: q5.id, choiceText: "組長会への参加（夜間の固定日時）", orderIndex: 5 },
        { questionId: q5.id, choiceText: "河川清掃等の町内行事対応（早朝帯）", orderIndex: 6 },
        { questionId: q5.id, choiceText: "上記すべて", orderIndex: 7 },
      ]);

      // Q6: 今後の運用方向性
      const [q6] = await db.insert(formQuestions).values({
        formId: surveyForm.id,
        questionText: "今後の運用の方向性について、最も近いものを1つ選んでください",
        questionType: "single_choice" as const,
        required: true,
        orderIndex: 6,
      }).returning();
      await db.insert(formChoices).values([
        { questionId: q6.id, choiceText: "A：住民の持ち回りを基本に、外部・内部対応とも住民側で対応", orderIndex: 1 },
        { questionId: q6.id, choiceText: "B：オーナー側が外部・内部対応とも担う（外部委託含む）", orderIndex: 2 },
        { questionId: q6.id, choiceText: "C：折衷案（外部対応と内部対応を住民・オーナーで分担）", orderIndex: 3 },
        { questionId: q6.id, choiceText: "D：わからない／判断材料が足りない", orderIndex: 4 },
      ]);

      // Q7: 引き継ぎ改善
      const [q7] = await db.insert(formQuestions).values({
        formId: surveyForm.id,
        questionText: "引き継ぎの改善（手順の見える化）について",
        questionType: "single_choice" as const,
        required: true,
        orderIndex: 7,
      }).returning();
      await db.insert(formChoices).values([
        { questionId: q7.id, choiceText: "紙＋Webの併用がよい", orderIndex: 1 },
        { questionId: q7.id, choiceText: "Web中心がよい", orderIndex: 2 },
        { questionId: q7.id, choiceText: "紙中心がよい", orderIndex: 3 },
        { questionId: q7.id, choiceText: "わからない", orderIndex: 4 },
      ]);

      // Q8 is free-text, skip for now (schema only supports choice-based questions)

      // 河川清掃出欠確認フォーム（テンプレート的に作成）
      const [cleaningForm] = await db.insert(forms).values({
        title: "河川清掃 出欠確認",
        description: "次回の河川清掃への参加可否を確認します。",
        status: "draft" as const,
      }).returning();

      const [cq1] = await db.insert(formQuestions).values({
        formId: cleaningForm.id,
        questionText: "次回の河川清掃に参加できますか？",
        questionType: "single_choice" as const,
        required: true,
        orderIndex: 1,
      }).returning();
      await db.insert(formChoices).values([
        { questionId: cq1.id, choiceText: "参加する", orderIndex: 1 },
        { questionId: cq1.id, choiceText: "参加できない", orderIndex: 2 },
        { questionId: cq1.id, choiceText: "未定", orderIndex: 3 },
      ]);

      const [cq2] = await db.insert(formQuestions).values({
        formId: cleaningForm.id,
        questionText: "参加できない場合、理由を教えてください",
        questionType: "single_choice" as const,
        required: false,
        orderIndex: 2,
      }).returning();
      await db.insert(formChoices).values([
        { questionId: cq2.id, choiceText: "仕事", orderIndex: 1 },
        { questionId: cq2.id, choiceText: "体調不良", orderIndex: 2 },
        { questionId: cq2.id, choiceText: "家庭の事情", orderIndex: 3 },
        { questionId: cq2.id, choiceText: "その他", orderIndex: 4 },
      ]);

      // ── ページコンテンツ（河川清掃SOP）──
      const riverCleaningSections = [
        { sectionKey: "policy", title: "2026年度 方針変更", sortOrder: 0, items: [
          "出不足金（でぶそくきん）制度を廃止",
          "小さなお子さんのいる家庭は参加免除",
          "参加は任意だが、可能な限り協力をお願いする運営へ移行",
        ]},
        { sectionKey: "timeline", title: "準備タイムライン", sortOrder: 1, items: [
          "T-14日: 組長会で日程確定、回覧作成開始",
          "T-7日: 回覧配布（参加確認）",
          "T-2日: 手袋・ゴミ袋を購入（100均、約500円）",
          "当日 7:50: 組長倉庫から道具を出す",
          "当日 8:00: グリーンピア玄関前に集合",
          "当日 8:00-9:00: 清掃作業（黒石川周辺）",
          "当日 9:00: 片付け・道具を倉庫に戻す",
        ]},
        { sectionKey: "equipment", title: "必要な道具", sortOrder: 2, items: [
          "平スコップ x2（倉庫）",
          "剣先スコップ x2（倉庫）",
          "鎌 x2（倉庫）",
          "三本爪（レーキ）x1（倉庫）",
          "三角ホー x2（倉庫）",
          "使い捨て手袋（組長が毎回購入）",
          "ゴミ袋（組長が毎回購入）",
          "各自: 長靴・帽子・飲み物",
        ]},
        { sectionKey: "safety", title: "安全確認事項", sortOrder: 3, items: [
          "雨天・増水時は中止（前日に判断し回覧で通知）",
          "長靴の着用必須（川辺の作業あり）",
          "夏季は帽子・水分補給を徹底（熱中症対策）",
          "単独行動禁止、声かけ合って作業する",
          "体調不良時は無理せず即時報告",
          "刃物（鎌・ホー）の取り扱いに注意",
        ]},
        { sectionKey: "procedure", title: "当日の流れ", sortOrder: 4, items: [
          "1. 集合（グリーンピア玄関前）- 出欠確認",
          "2. 道具配布・エリア分担の説明",
          "3. 作業開始（黒石川沿い、約1時間）",
          "4. 集合・点呼・ゴミまとめ",
          "5. 道具の洗浄・倉庫に返却",
          "6. 組長が記録を作成（このポータルに入力）",
        ]},
        { sectionKey: "after", title: "清掃後の作業", sortOrder: 5, items: [
          "道具を洗って乾かし、倉庫に収納",
          "参加者数・問題点をポータルに記録",
          "次回の改善点があればメモ",
          "使い捨て手袋の残数を確認、次回分の購入計画",
        ]},
        { sectionKey: "notes", title: "組長メモ（非公開情報）", sortOrder: 6, items: [
          "倉庫の鍵: 組長が管理（引き継ぎ時に渡す）",
          "水道蛇口: エントランス横にあり（道具洗浄用）",
          "ゴミ袋・手袋の購入費: 1回約500円（古紙回収収入から充当）",
          "ISY隣接ビル周辺は清掃範囲外（2025年度に確定済み）",
        ]},
      ];
      for (const section of riverCleaningSections) {
        await db.insert(pageContent).values({
          pageKey: "river_cleaning",
          sectionKey: section.sectionKey,
          title: section.title,
          items: section.items,
          sortOrder: section.sortOrder,
          updatedAt: new Date(),
        });
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

        // B免除: 直近2年以内に組長を務めた世帯
        const recentLeaderSchedules = await db
          .select()
          .from(leaderSchedule)
          .where(
            and(
              gte(leaderSchedule.year, input.year - 2),
              lte(leaderSchedule.year, input.year - 1)
            )
          );
        const recentLeaderHouseholds = new Set(
          recentLeaderSchedules
            .filter((s) => s.status === "confirmed")
            .map((s) => s.primaryHouseholdId)
        );

        // C免除
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

        // A免除: 対象年度4月1日時点で入居12ヶ月未満
        const fiscalYearStart = new Date(input.year, 3, 1); // 4月1日
        const twelveMonthsBefore = new Date(input.year - 1, 3, 1); // 前年4月1日
        const lessThanYearHouseholds = new Set(
          allHouseholds
            .filter((h) => h.moveInDate && h.moveInDate > twelveMonthsBefore)
            .map((h) => h.householdId)
        );

        const candidates = allHouseholds
          .filter((h) => {
            return !exemptedHouseholds.has(h.householdId) &&
                   !lessThanYearHouseholds.has(h.householdId) &&
                   !recentLeaderHouseholds.has(h.householdId);
          })
          .sort((a, b) => {
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

        // B免除: 直近2年以内に組長を務めた世帯（leaderScheduleから判定）
        const recentLeaderSchedules = await db
          .select()
          .from(leaderSchedule)
          .where(
            and(
              gte(leaderSchedule.year, input.year - 2),
              lte(leaderSchedule.year, input.year - 1)
            )
          );
        const recentLeaderHouseholds = new Set(
          recentLeaderSchedules
            .filter((s) => s.status === "confirmed")
            .map((s) => s.primaryHouseholdId)
        );

        // C免除: exemptionRequests テーブルから
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

        // A免除: 対象年度4月1日時点で入居12ヶ月未満
        const fiscalYearStart = new Date(input.year, 3, 1); // 4月1日
        const twelveMonthsBefore = new Date(input.year - 1, 3, 1); // 前年4月1日
        const lessThanYearHouseholds = new Set(
          allHouseholds
            .filter((h) => h.moveInDate && h.moveInDate > twelveMonthsBefore)
            .map((h) => h.householdId)
        );

        const candidates = allHouseholds
          .filter((h) => {
            return !exemptedHouseholds.has(h.householdId) &&
                   !lessThanYearHouseholds.has(h.householdId) &&
                   !recentLeaderHouseholds.has(h.householdId);
          })
          .sort((a, b) => {
            // 入居が古い順（基本方針）
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
        if (!db) return { year: input.year, households: [], schedule: null };

        const allHouseholds = await db.select().from(households);

        // B免除: 直近2年以内に組長を務めた世帯（leaderScheduleから判定）
        const recentLeaderSchedules = await db
          .select()
          .from(leaderSchedule)
          .where(
            and(
              gte(leaderSchedule.year, input.year - 2),
              lte(leaderSchedule.year, input.year - 1)
            )
          );
        const recentLeaderHouseholds = new Set(
          recentLeaderSchedules
            .filter((s) => s.status === "confirmed")
            .map((s) => s.primaryHouseholdId)
        );

        // C免除: exemptionRequests テーブルから
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

        // A免除: 対象年度4月1日時点で入居12ヶ月未満
        const fiscalYearStart = new Date(input.year, 3, 1); // 4月1日
        const twelveMonthsBefore = new Date(input.year - 1, 3, 1); // 前年4月1日
        const lessThanYearHouseholds = new Set(
          allHouseholds
            .filter((h) => h.moveInDate && h.moveInDate > twelveMonthsBefore)
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
      const allForms = await db.select().from(forms).orderBy(desc(forms.createdAt));
      const allHouseholds = await db.select().from(households);
      const totalHouseholds = allHouseholds.length;

      const formsWithStats = await Promise.all(
        allForms.map(async (form) => {
          const responses = await db
            .select()
            .from(formResponses)
            .where(eq(formResponses.formId, form.id));
          return {
            ...form,
            responseCount: responses.length,
            totalHouseholds,
          };
        })
      );
      return formsWithStats;
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

    // ── ページコンテンツ管理 ──
    getPageContent: publicProcedure
      .input(z.object({ pageKey: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        return db
          .select()
          .from(pageContent)
          .where(eq(pageContent.pageKey, input.pageKey))
          .orderBy(asc(pageContent.sortOrder));
      }),

    upsertPageContent: publicProcedure
      .input(
        z.object({
          pageKey: z.string(),
          sectionKey: z.string(),
          title: z.string(),
          items: z.array(z.string()),
          sortOrder: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const existing = await db
          .select()
          .from(pageContent)
          .where(
            and(
              eq(pageContent.pageKey, input.pageKey),
              eq(pageContent.sectionKey, input.sectionKey)
            )
          );

        if (existing.length > 0) {
          await db
            .update(pageContent)
            .set({
              title: input.title,
              items: input.items,
              sortOrder: input.sortOrder ?? existing[0].sortOrder,
              updatedAt: new Date(),
            })
            .where(eq(pageContent.id, existing[0].id));

          await logChange(
            `ページコンテンツ「${input.title}」を更新 (${input.pageKey}/${input.sectionKey})`,
            "pageContent",
            existing[0].id
          );
          return { success: true, id: existing[0].id };
        } else {
          const [row] = await db
            .insert(pageContent)
            .values({
              pageKey: input.pageKey,
              sectionKey: input.sectionKey,
              title: input.title,
              items: input.items,
              sortOrder: input.sortOrder ?? 0,
              updatedAt: new Date(),
            })
            .returning();

          await logChange(
            `ページコンテンツ「${input.title}」を作成 (${input.pageKey}/${input.sectionKey})`,
            "pageContent",
            row.id
          );
          return { success: true, id: row.id };
        }
      }),

    updatePageContentItem: publicProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          items: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const updateData: Record<string, any> = { updatedAt: new Date() };
        if (input.title !== undefined) updateData.title = input.title;
        if (input.items !== undefined) updateData.items = input.items;

        await db
          .update(pageContent)
          .set(updateData)
          .where(eq(pageContent.id, input.id));

        await logChange(
          `ページコンテンツ (ID: ${input.id}) を更新`,
          "pageContent",
          input.id
        );
        return { success: true };
      }),

    deletePageContent: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(pageContent).where(eq(pageContent.id, input.id));
        await logChange(
          `ページコンテンツ (ID: ${input.id}) を削除`,
          "pageContent",
          input.id
        );
        return { success: true };
      }),

    // ページコンテンツの一括初期化（デフォルトデータ投入）
    initPageContent: publicProcedure
      .input(
        z.object({
          pageKey: z.string(),
          sections: z.array(
            z.object({
              sectionKey: z.string(),
              title: z.string(),
              items: z.array(z.string()),
              sortOrder: z.number(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Only init if page has no content yet
        const existing = await db
          .select()
          .from(pageContent)
          .where(eq(pageContent.pageKey, input.pageKey));

        if (existing.length > 0) {
          return { success: true, skipped: true };
        }

        for (const section of input.sections) {
          await db.insert(pageContent).values({
            pageKey: input.pageKey,
            sectionKey: section.sectionKey,
            title: section.title,
            items: section.items,
            sortOrder: section.sortOrder,
            updatedAt: new Date(),
          });
        }

        await logChange(
          `ページコンテンツ「${input.pageKey}」を初期化 (${input.sections.length}セクション)`,
          "pageContent"
        );
        return { success: true, skipped: false };
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
