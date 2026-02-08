import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import {
  households,
  events,
  inventory,
  faq,
  rules,
  templates,
  handoverBagItems,
  leaderSchedule,
  leaderRotationLogic,
  pendingQueue,
  changelog,
  posts,
} from "../drizzle/schema";

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!dbUrl) {
  console.error("DATABASE_URL or POSTGRES_URL is required");
  process.exit(1);
}

const client = postgres(dbUrl);
const db = drizzle(client);

async function seed() {
  console.log("Seeding database for グリーンピア焼津...");

  // 1. Households (101-110号室)
  const householdData = [
    { householdId: "101", moveInDate: new Date("2018-04-01"), leaderHistoryCount: 2, notes: null },
    { householdId: "102", moveInDate: new Date("2020-03-15"), leaderHistoryCount: 1, notes: null },
    { householdId: "103", moveInDate: new Date("2015-09-01"), leaderHistoryCount: 3, notes: null },
    { householdId: "104", moveInDate: new Date("2022-06-01"), leaderHistoryCount: 0, notes: null },
    { householdId: "105", moveInDate: new Date("2019-11-01"), leaderHistoryCount: 1, notes: null },
    { householdId: "106", moveInDate: new Date("2017-04-01"), leaderHistoryCount: 2, notes: null },
    { householdId: "107", moveInDate: new Date("2021-01-15"), leaderHistoryCount: 0, notes: null },
    { householdId: "108", moveInDate: new Date("2016-07-01"), leaderHistoryCount: 3, notes: null },
    { householdId: "109", moveInDate: new Date("2023-04-01"), leaderHistoryCount: 0, notes: null },
    { householdId: "110", moveInDate: new Date("2014-04-01"), leaderHistoryCount: 4, notes: null },
  ];
  for (const h of householdData) {
    await db.insert(households).values(h).onConflictDoNothing();
  }
  console.log("  ✓ Households (10 units)");

  // 2. Events (年間カレンダー)
  const eventData = [
    { title: "定例総会", date: new Date("2026-04-20T10:00:00"), category: "会議", checklist: [{ id: "1", text: "議案書配布", completed: false }, { id: "2", text: "出欠確認", completed: false }, { id: "3", text: "会場準備", completed: false }], notes: "集会室にて開催。委任状の回収を忘れずに。", attachments: [] as Array<{url:string,name:string}> },
    { title: "春の一斉清掃", date: new Date("2026-04-13T08:00:00"), category: "清掃", checklist: [{ id: "1", text: "清掃用具準備", completed: false }, { id: "2", text: "ゴミ袋配布", completed: false }], notes: "雨天時は翌週に延期", attachments: [] as Array<{url:string,name:string}> },
    { title: "河川清掃", date: new Date("2026-06-08T07:00:00"), category: "清掃", checklist: [{ id: "1", text: "安全確認", completed: false }, { id: "2", text: "道具チェック", completed: false }], notes: "市の河川清掃活動に参加", attachments: [] as Array<{url:string,name:string}> },
    { title: "夏祭り", date: new Date("2026-08-16T16:00:00"), category: "行事", checklist: [{ id: "1", text: "テント設営", completed: false }, { id: "2", text: "食材買い出し", completed: false }, { id: "3", text: "音響準備", completed: false }], notes: "駐車場にて開催。雨天時は集会室。", attachments: [] as Array<{url:string,name:string}> },
    { title: "秋の一斉清掃", date: new Date("2026-10-12T08:00:00"), category: "清掃", checklist: [{ id: "1", text: "落ち葉清掃", completed: false }, { id: "2", text: "排水溝チェック", completed: false }], notes: "排水溝の詰まりも確認", attachments: [] as Array<{url:string,name:string}> },
    { title: "防災訓練", date: new Date("2026-11-09T09:00:00"), category: "行事", checklist: [{ id: "1", text: "消火器点検", completed: false }, { id: "2", text: "避難経路確認", completed: false }, { id: "3", text: "安否確認名簿", completed: false }], notes: "消防署との合同訓練", attachments: [] as Array<{url:string,name:string}> },
    { title: "年末大掃除", date: new Date("2026-12-21T08:00:00"), category: "清掃", checklist: [{ id: "1", text: "共用部清掃", completed: false }, { id: "2", text: "ゴミ置き場整理", completed: false }], notes: "共用部の大掃除", attachments: [] as Array<{url:string,name:string}> },
    { title: "新年挨拶回り", date: new Date("2027-01-05T10:00:00"), category: "行事", checklist: [{ id: "1", text: "手土産準備", completed: false }], notes: "各戸への年始挨拶", attachments: [] as Array<{url:string,name:string}> },
    { title: "3月定例会議", date: new Date("2026-03-15T19:00:00"), category: "会議", checklist: [{ id: "1", text: "年度末報告", completed: false }, { id: "2", text: "来期予算案", completed: false }], notes: "年度末の総括と来期準備", attachments: [] as Array<{url:string,name:string}> },
  ];
  for (const e of eventData) {
    await db.insert(events).values(e).onConflictDoNothing();
  }
  console.log("  ✓ Events (9 items)");

  // 3. Inventory (備品台帳)
  const inventoryData = [
    { name: "折りたたみテーブル", qty: 5, location: "集会室倉庫", condition: "良好", notes: "年1回点検", tags: ["集会室", "行事用"] },
    { name: "パイプ椅子", qty: 30, location: "集会室倉庫", condition: "良好", notes: "2024年に10脚新調", tags: ["集会室", "行事用"] },
    { name: "掃除機（業務用）", qty: 1, location: "管理室", condition: "良好", notes: "フィルター定期交換", tags: ["清掃"] },
    { name: "高圧洗浄機", qty: 1, location: "駐車場倉庫", condition: "使用可", notes: "使用後は必ず水抜き", tags: ["清掃", "外構"] },
    { name: "脚立（2m）", qty: 2, location: "管理室", condition: "良好", notes: null, tags: ["工具"] },
    { name: "消火器", qty: 8, location: "各階廊下", condition: "良好", notes: "2025年3月点検済。有効期限2028年。", tags: ["防災"] },
    { name: "AED", qty: 1, location: "エントランス", condition: "良好", notes: "バッテリー有効期限2027年6月", tags: ["防災", "医療"] },
    { name: "草刈り機", qty: 1, location: "駐車場倉庫", condition: "使用可", notes: "混合燃料使用。替え刃在庫あり", tags: ["外構", "清掃"] },
    { name: "ブルーシート（大）", qty: 3, location: "駐車場倉庫", condition: "良好", notes: "行事用", tags: ["行事用"] },
    { name: "トランシーバー", qty: 4, location: "管理室", condition: "良好", notes: "防災訓練・行事で使用", tags: ["防災", "行事用"] },
    { name: "救急箱", qty: 2, location: "管理室・集会室", condition: "良好", notes: "中身は半年ごとに補充", tags: ["医療"] },
    { name: "ゴミ袋（45L）", qty: 200, location: "管理室", condition: "良好", notes: "清掃用。在庫100枚以下で発注", tags: ["清掃", "消耗品"] },
  ];
  for (const i of inventoryData) {
    await db.insert(inventory).values(i).onConflictDoNothing();
  }
  console.log("  ✓ Inventory (12 items)");

  // 4. FAQ
  const faqData = [
    { question: "ゴミ出しのルールは？", answer: "燃えるゴミ: 月・木、資源ゴミ: 火、プラスチック: 水、粗大ゴミ: 要予約（市に連絡）。朝8時までにゴミ置き場へ。", relatedRuleIds: [] as number[], relatedPostIds: [] as number[] },
    { question: "駐車場の契約はどうすればいいですか？", answer: "管理組合（組長）に連絡してください。空き区画がある場合、月額5,000円で契約可能です。", relatedRuleIds: [] as number[], relatedPostIds: [] as number[] },
    { question: "騒音トラブルがある場合は？", answer: "まず当事者間で話し合いをお願いします。解決が難しい場合は組長にご相談ください。夜10時以降の生活音にはご配慮を。", relatedRuleIds: [] as number[], relatedPostIds: [] as number[] },
    { question: "共用施設の利用方法は？", answer: "集会室は予約制です。組長に利用日の1週間前までに申請してください。利用後は清掃をお願いします。", relatedRuleIds: [] as number[], relatedPostIds: [] as number[] },
    { question: "管理費の支払い方法は？", answer: "口座振替が基本です。毎月27日に引き落とし。振替口座の変更は組長まで届出書を提出してください。", relatedRuleIds: [] as number[], relatedPostIds: [] as number[] },
    { question: "ペットの飼育は可能ですか？", answer: "小型犬・猫は1匹まで可。飼育届の提出が必要です。共用部ではリード必須、排泄物は必ず持ち帰り。", relatedRuleIds: [] as number[], relatedPostIds: [] as number[] },
    { question: "退去時の手続きは？", answer: "退去の1ヶ月前までに組長へ届出。鍵の返却、駐車場・メール登録の解除を行います。", relatedRuleIds: [] as number[], relatedPostIds: [] as number[] },
  ];
  for (const f of faqData) {
    await db.insert(faq).values(f).onConflictDoNothing();
  }
  console.log("  ✓ FAQ (7 items)");

  // 5. Rules
  const rulesData = [
    { title: "ゴミ出しルール", summary: "分別と収集日の遵守", details: "燃えるゴミ（月・木）、資源ゴミ（火）、プラスチック（水）。朝8時までに指定場所へ。粗大ゴミは市への事前予約が必要。違反が続く場合は掲示板で注意喚起。", status: "decided" as const, evidenceLinks: [] as string[], isHypothesis: false },
    { title: "駐車場利用規約", summary: "駐車場の契約と利用ルール", details: "月額5,000円。来客用駐車場は最大3日まで。無断駐車は警告→レッカー。バイクは自転車置き場の指定区画。", status: "decided" as const, evidenceLinks: [] as string[], isHypothesis: false },
    { title: "騒音に関する規約", summary: "夜間の生活音への配慮", details: "夜22時〜朝7時は静粛時間。楽器演奏は20時まで。リフォーム工事は事前届出＋平日9時〜17時のみ。", status: "decided" as const, evidenceLinks: [] as string[], isHypothesis: false },
    { title: "ペット飼育規約", summary: "ペットの種類・数の制限と共用部でのルール", details: "小型犬・猫1匹まで。飼育届の提出必須。共用部はリード着用。排泄物は即時処理。他住民への迷惑行為が確認された場合は飼育禁止の可能性あり。", status: "decided" as const, evidenceLinks: [] as string[], isHypothesis: false },
    { title: "共用施設利用規約", summary: "集会室・ゲストルームの予約と利用", details: "集会室: 1週間前までに予約。利用時間9時〜21時。利用後は原状回復・清掃。営利目的の利用不可。", status: "decided" as const, evidenceLinks: [] as string[], isHypothesis: false },
    { title: "管理費滞納への対応", summary: "管理費を3ヶ月以上滞納した場合の対応", details: "1ヶ月: 書面通知。2ヶ月: 電話・訪問連絡。3ヶ月: 理事会決議で法的措置検討。分割払い相談可。", status: "decided" as const, evidenceLinks: [] as string[], isHypothesis: false },
  ];
  for (const r of rulesData) {
    await db.insert(rules).values(r).onConflictDoNothing();
  }
  console.log("  ✓ Rules (6 items)");

  // 6. Templates
  const templateData = [
    { title: "総会議案書テンプレート", body: "令和○年度 グリーンピア焼津 定例総会 議案書\n\n日時: 令和○年○月○日（○）○時〜\n場所: 集会室\n\n【第1号議案】令和○年度 事業報告\n\n【第2号議案】令和○年度 決算報告\n\n【第3号議案】令和○年度 事業計画（案）\n\n【第4号議案】令和○年度 予算（案）\n\n【第5号議案】役員改選", category: "会議", tags: ["総会", "議案書"] },
    { title: "回覧板テンプレート", body: "グリーンピア焼津 回覧\n\n日付: 令和○年○月○日\n発信者: 組長\n\n件名: ○○○○について\n\n本文:\n○○○○○○○○○○○○○○○○○○○○\n\n※ご確認いただきましたら、次の方へお回しください。\n\n101号室 → 102号室 → 103号室 → ... → 110号室", category: "連絡", tags: ["回覧板", "連絡"] },
    { title: "工事届出書テンプレート", body: "リフォーム工事届出書\n\nグリーンピア焼津 管理組合 御中\n\n届出日: 令和○年○月○日\n届出者: ○○号室 ○○○○\n\n工事内容: \n工事期間: 令和○年○月○日 〜 令和○年○月○日\n作業時間: ○時〜○時\n施工業者: \n連絡先: \n\n※工事は平日9時〜17時に限ります。\n※事前に近隣住戸への挨拶をお願いします。", category: "届出", tags: ["工事", "届出"] },
    { title: "退去届テンプレート", body: "退去届\n\nグリーンピア焼津 管理組合 御中\n\n届出日: 令和○年○月○日\n届出者: ○○号室 ○○○○\n\n退去予定日: 令和○年○月○日\n\n転居先住所（任意）:\n連絡先電話番号:\n\n返却物:\n□ 鍵（○本）\n□ 駐車場リモコン\n□ その他\n\n※退去1ヶ月前までに届出ください。", category: "届出", tags: ["退去", "届出"] },
    { title: "飼育届テンプレート", body: "ペット飼育届\n\nグリーンピア焼津 管理組合 御中\n\n届出日: 令和○年○月○日\n届出者: ○○号室 ○○○○\n\nペットの種類: □犬 □猫\n品種:\n名前:\n体重: 約○kg\n\n予防接種状況:\n□ 狂犬病ワクチン（犬のみ）\n□ 混合ワクチン\n\nかかりつけ動物病院:\n\n※飼育規約を遵守することに同意します。", category: "届出", tags: ["ペット", "届出"] },
  ];
  for (const t of templateData) {
    await db.insert(templates).values(t).onConflictDoNothing();
  }
  console.log("  ✓ Templates (5 items)");

  // 7. Handover Bag Items
  const handoverData = [
    { name: "管理室の鍵", location: "引き継ぎ袋", isChecked: false, description: "管理室のマスターキー", notes: "スペアキーは金庫内" },
    { name: "集会室の鍵", location: "引き継ぎ袋", isChecked: false, description: "集会室の鍵（2本）", notes: null },
    { name: "管理組合印鑑", location: "引き継ぎ袋", isChecked: false, description: "管理組合の実印と認印", notes: "銀行届出印はこちら" },
    { name: "通帳", location: "引き継ぎ袋", isChecked: false, description: "管理費口座の通帳", notes: "○○銀行 焼津支店" },
    { name: "管理規約原本", location: "引き継ぎ袋", isChecked: false, description: "管理規約と細則の原本", notes: "改訂履歴付き" },
    { name: "過去議事録ファイル", location: "引き継ぎ袋", isChecked: false, description: "過去5年分の総会・理事会議事録", notes: null },
    { name: "住民名簿", location: "引き継ぎ袋", isChecked: false, description: "全住戸の連絡先一覧", notes: "個人情報のため取り扱い注意" },
    { name: "業者連絡先リスト", location: "引き継ぎ袋", isChecked: false, description: "管理会社・設備業者等の連絡先", notes: "緊急時は管理会社へ" },
    { name: "ポータルサイトのログイン情報", location: "引き継ぎ袋", isChecked: false, description: "本ポータルサイトの管理情報", notes: "Vaultにも登録済" },
  ];
  for (const h of handoverData) {
    await db.insert(handoverBagItems).values(h).onConflictDoNothing();
  }
  console.log("  ✓ Handover Bag Items (9 items)");

  // 8. Leader Schedule (2026-2034)
  const scheduleData = [
    { year: 2026, primaryHouseholdId: "104", backupHouseholdId: "107", status: "confirmed" as const, reason: "2026年度確定" },
    { year: 2027, primaryHouseholdId: "107", backupHouseholdId: "109", status: "draft" as const, reason: "自動計算" },
    { year: 2028, primaryHouseholdId: "109", backupHouseholdId: "102", status: "draft" as const, reason: "自動計算" },
    { year: 2029, primaryHouseholdId: "102", backupHouseholdId: "105", status: "draft" as const, reason: "自動計算" },
    { year: 2030, primaryHouseholdId: "105", backupHouseholdId: "101", status: "draft" as const, reason: "自動計算" },
  ];
  for (const s of scheduleData) {
    await db.insert(leaderSchedule).values(s).onConflictDoNothing();
  }
  console.log("  ✓ Leader Schedule (5 years)");

  // 9. Rotation Logic
  await db.insert(leaderRotationLogic).values({
    version: 1,
    logic: {
      priority: ["入居年数が長い順", "組長経験回数が少ない順", "住戸番号昇順"],
      excludeConditions: ["入居1年未満", "免除申請承認済み", "過去2年以内に組長経験"],
    },
    reason: "初期設定",
  }).onConflictDoNothing();
  console.log("  ✓ Rotation Logic (v1)");

  // 10. Pending Queue
  const pendingData = [
    { title: "エレベーター点検の見積もり", description: "○○エレベーターサービスに年次点検の見積もりを依頼中。返答待ち。", toWhom: "○○エレベーターサービス", priority: "high" as const, status: "pending" as const },
    { title: "駐輪場の増設相談", description: "自転車が増えてきたため、駐輪場の増設について管理会社に相談中。", toWhom: "△△管理会社", priority: "medium" as const, status: "pending" as const },
    { title: "外壁塗装の長期修繕計画", description: "来年度の大規模修繕に向けて、複数業者に見積もり依頼中。", toWhom: "各塗装業者", priority: "medium" as const, status: "pending" as const },
  ];
  for (const p of pendingData) {
    await db.insert(pendingQueue).values(p).onConflictDoNothing();
  }
  console.log("  ✓ Pending Queue (3 items)");

  // 11. Posts (Year Log entries)
  const postsData = [
    { title: "エントランスの照明を LED に交換", body: "電気代削減のため、エントランスと共用廊下の照明をLEDに交換しました。年間約3万円の電気代削減が見込めます。", tags: ["設備", "コスト削減"] as string[], year: 2026, category: "improvement" as const, status: "published" as const, isHypothesis: false, relatedLinks: [] as string[], publishedAt: new Date("2026-01-15") },
    { title: "3階排水管の詰まり対応", body: "3階共用排水管が詰まり、業者に対応を依頼。原因は油脂の蓄積。各住戸に油の直接排水を控えるよう回覧を配布。", tags: ["設備", "トラブル"] as string[], year: 2026, category: "trouble" as const, status: "published" as const, isHypothesis: false, relatedLinks: [] as string[], publishedAt: new Date("2026-01-20") },
    { title: "管理費の値上げについて（検討中）", body: "物価上昇に伴い、管理費の見直しを検討中。現行: 月額15,000円。案: 月額16,500円（10%増）。次回総会で決議予定。", tags: ["管理費", "総会議題"] as string[], year: 2026, category: "pending" as const, status: "published" as const, isHypothesis: true, relatedLinks: [] as string[], publishedAt: new Date("2026-02-01") },
    { title: "宅配ボックス設置の要望", body: "複数の住民から宅配ボックスの設置要望あり。見積もり取得中。設置場所はエントランス横を予定。", tags: ["設備", "要望"] as string[], year: 2026, category: "inquiry" as const, status: "published" as const, isHypothesis: false, relatedLinks: [] as string[], publishedAt: new Date("2026-02-05") },
  ];
  for (const p of postsData) {
    await db.insert(posts).values(p).onConflictDoNothing();
  }
  console.log("  ✓ Posts (4 entries)");

  // 12. Changelog
  await db.insert(changelog).values({
    summary: "シードデータを投入",
    date: new Date(),
    relatedEntityType: "system",
    relatedEntityId: null,
  });
  console.log("  ✓ Initial changelog entry");

  console.log("\n✓ Seed complete! グリーンピア焼津のデータが投入されました。");

  await client.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
