import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["public", "member", "editor", "admin"]).default("member").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// 住戸（個人情報なし、住戸IDのみ）
export const households = mysqlTable("households", {
  id: int("id").autoincrement().primaryKey(),
  householdId: varchar("householdId", { length: 50 }).notNull().unique(), // 例：101, 102, 201 など
  moveInDate: timestamp("moveInDate"),
  leaderHistoryCount: int("leaderHistoryCount").default(0).notNull(), // 過去の組長経歴回数
  notes: text("notes"), // 個人情報なし。例：「角部屋」「エレベーター近い」など
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Household = typeof households.$inferSelect;
export type InsertHousehold = typeof households.$inferInsert;

// 先9年ローテ（Primary/Backup）
export const leaderSchedule = mysqlTable("leader_schedule", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").notNull(), // 2025, 2026, ...
  primaryHouseholdId: varchar("primaryHouseholdId", { length: 50 }).notNull(),
  backupHouseholdId: varchar("backupHouseholdId", { length: 50 }).notNull(),
  status: mysqlEnum("status", ["draft", "conditional", "confirmed"]).default("draft").notNull(),
  reason: text("reason"), // 「前回担当から3年経過」「入居開始が古い」など
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeaderSchedule = typeof leaderSchedule.$inferSelect;
export type InsertLeaderSchedule = typeof leaderSchedule.$inferInsert;

// ローテ選定ロジック（版管理）
export const leaderRotationLogic = mysqlTable("leader_rotation_logic", {
  id: int("id").autoincrement().primaryKey(),
  version: int("version").default(1).notNull(), // v1, v2, v3, ...
  logic: json("logic").$type<{
    priority: string[]; // 例：["yearsFromLastTerm", "moveInDate", "householdIdAsc"]
    excludeConditions: string[]; // 例：["moveOutWithin6Months"]
  }>().notNull(),
  reason: text("reason"), // 「前回担当からの経過年数を優先」など
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeaderRotationLogic = typeof leaderRotationLogic.$inferSelect;
export type InsertLeaderRotationLogic = typeof leaderRotationLogic.$inferInsert;

// 免除申請（版管理）
export const exemptionRequests = mysqlTable("exemption_requests", {
  id: int("id").autoincrement().primaryKey(),
  householdId: varchar("householdId", { length: 50 }).notNull(),
  year: int("year").notNull(),
  version: int("version").default(1).notNull(),
  reason: text("reason"), // 個人情報なし。例：「健康上の理由」「転勤予定」など
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  approvedBy: int("approvedBy"), // Admin ID
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExemptionRequest = typeof exemptionRequests.$inferSelect;
export type InsertExemptionRequest = typeof exemptionRequests.$inferInsert;

// 年度ログ（投稿）
export const posts = mysqlTable("posts", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  tags: json("tags").$type<string[]>().notNull(),
  year: int("year").notNull(),
  category: mysqlEnum("category", ["inquiry", "answer", "decision", "pending", "trouble", "improvement"]).notNull(),
  status: mysqlEnum("status", ["draft", "pending", "published"]).default("draft").notNull(),
  authorId: int("authorId").notNull(),
  authorRole: mysqlEnum("authorRole", ["editor", "admin"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  publishedAt: timestamp("publishedAt"),
  relatedLinks: json("relatedLinks").$type<string[]>().notNull(),
  isHypothesis: boolean("isHypothesis").default(false).notNull(), // （仮説）タグ
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

// 年間カレンダー（行事）
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  date: timestamp("date").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  checklist: json("checklist").$type<Array<{ id: string; text: string; completed: boolean }>>().notNull(),
  notes: text("notes"),
  attachments: json("attachments").$type<Array<{ url: string; name: string }>>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

// 河川清掃実施ログ
export const riverCleaningRuns = mysqlTable("river_cleaning_runs", {
  id: int("id").autoincrement().primaryKey(),
  date: timestamp("date").notNull(),
  participantsCount: int("participantsCount"),
  issues: text("issues"),
  whatWorked: text("whatWorked"),
  whatToImprove: text("whatToImprove"),
  attachments: json("attachments").$type<Array<{ url: string; name: string }>>().notNull(),
  linkedInventoryIds: json("linkedInventoryIds").$type<number[]>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RiverCleaningRun = typeof riverCleaningRuns.$inferSelect;
export type InsertRiverCleaningRun = typeof riverCleaningRuns.$inferInsert;

// 備品台帳
export const inventory = mysqlTable("inventory", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  photo: varchar("photo", { length: 500 }),
  qty: int("qty").default(0).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  condition: varchar("condition", { length: 100 }),
  lastCheckedAt: timestamp("lastCheckedAt"),
  notes: text("notes"),
  tags: json("tags").$type<string[]>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InventoryItem = typeof inventory.$inferSelect;
export type InsertInventoryItem = typeof inventory.$inferInsert;

// テンプレ
export const templates = mysqlTable("templates", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  tags: json("tags").$type<string[]>().notNull(),
});

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;

// ルール・決定事項（版管理）
export const rules = mysqlTable("rules", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["decided", "pending"]).default("decided").notNull(),
  summary: text("summary").notNull(),
  details: text("details").notNull(),
  evidenceLinks: json("evidenceLinks").$type<string[]>().notNull(),
  isHypothesis: boolean("isHypothesis").default(false).notNull(), // （仮説）タグ
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Rule = typeof rules.$inferSelect;
export type InsertRule = typeof rules.$inferInsert;

// ルール版管理
export const ruleVersions = mysqlTable("rule_versions", {
  id: int("id").autoincrement().primaryKey(),
  ruleId: int("ruleId").notNull(),
  version: int("version").default(1).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  summary: text("summary").notNull(),
  details: text("details").notNull(),
  reason: text("reason"), // 「会費徴収方法を変更」など
  changedBy: int("changedBy").notNull(), // Admin ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RuleVersion = typeof ruleVersions.$inferSelect;
export type InsertRuleVersion = typeof ruleVersions.$inferInsert;

// FAQ
export const faq = mysqlTable("faq", {
  id: int("id").autoincrement().primaryKey(),
  question: varchar("question", { length: 500 }).notNull(),
  answer: text("answer").notNull(),
  relatedRuleIds: json("relatedRuleIds").$type<number[]>().notNull(),
  relatedPostIds: json("relatedPostIds").$type<number[]>().notNull(),
  isHypothesis: boolean("isHypothesis").default(false).notNull(), // （仮説）タグ
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FAQ = typeof faq.$inferSelect;
export type InsertFAQ = typeof faq.$inferInsert;

// 返信待ちキュー（Pending Queue）
export const pendingQueue = mysqlTable("pending_queue", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  toWhom: varchar("toWhom", { length: 100 }).notNull(), // 「管理会社」「町内会」「自治会」など
  status: mysqlEnum("status", ["pending", "resolved", "transferred"]).default("pending").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
  transferredToNextYear: boolean("transferredToNextYear").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PendingQueue = typeof pendingQueue.$inferSelect;
export type InsertPendingQueue = typeof pendingQueue.$inferInsert;

// 引き継ぎ袋チェックリスト
export const handoverBagItems = mysqlTable("handover_bag_items", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 255 }).notNull(),
  isChecked: boolean("isChecked").default(false).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HandoverBagItem = typeof handoverBagItems.$inferSelect;
export type InsertHandoverBagItem = typeof handoverBagItems.$inferInsert;

// 変更履歴
export const changelog = mysqlTable("changelog", {
  id: int("id").autoincrement().primaryKey(),
  summary: varchar("summary", { length: 255 }).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  authorId: int("authorId").notNull(),
  authorRole: mysqlEnum("authorRole", ["member", "editor", "admin"]).notNull(),
  relatedEntityType: varchar("relatedEntityType", { length: 100 }).notNull(),
  relatedEntityId: int("relatedEntityId"),
});

export type Changelog = typeof changelog.$inferSelect;
export type InsertChangelog = typeof changelog.$inferInsert;

// 秘匿メモ（Admin限定）
export const secretNotes = mysqlTable("secret_notes", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SecretNote = typeof secretNotes.$inferSelect;
export type InsertSecretNote = typeof secretNotes.$inferInsert;

// Member トップ用の集計テーブル（キャッシュ）
export const memberTopSummary = mysqlTable("member_top_summary", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").notNull(),
  weekStartDate: timestamp("weekStartDate").notNull(),
  thisWeekTasks: json("thisWeekTasks").$type<Array<{ id: number; title: string }>>().notNull(),
  topPriorities: json("topPriorities").$type<Array<{ id: number; title: string }>>().notNull(),
  unresolvedIssues: json("unresolvedIssues").$type<Array<{ id: number; title: string }>>().notNull(),
  pendingReplies: json("pendingReplies").$type<Array<{ id: number; title: string; toWhom: string }>>().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MemberTopSummary = typeof memberTopSummary.$inferSelect;
export type InsertMemberTopSummary = typeof memberTopSummary.$inferInsert;


// データ分類ラベル（public / internal / confidential）
export const dataClassification = mysqlTable("data_classification", {
  id: int("id").autoincrement().primaryKey(),
  entityType: varchar("entityType", { length: 100 }).notNull(), // posts, inventory, templates, rules, faq など
  entityId: int("entityId").notNull(),
  classification: mysqlEnum("classification", ["public", "internal", "confidential"]).default("public").notNull(),
  reason: text("reason"), // 分類理由
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DataClassification = typeof dataClassification.$inferSelect;
export type InsertDataClassification = typeof dataClassification.$inferInsert;

// Private Vault エントリ（Admin限定秘匿情報）
export const vaultEntries = mysqlTable("vault_entries", {
  id: int("id").autoincrement().primaryKey(),
  category: varchar("category", { length: 100 }).notNull(), // 「連絡先」「鍵/保管」「重要書類」「金銭関連」「住戸マスタ」
  key: varchar("key", { length: 255 }).notNull(), // 例：「管理会社電話」「倉庫鍵の保管場所」
  maskedValue: varchar("maskedValue", { length: 500 }).notNull(), // マスキング表示用（例：「****」）
  actualValue: text("actualValue").notNull(), // 実際の値（暗号化推奨）
  classification: mysqlEnum("classification", ["internal", "confidential"]).default("confidential").notNull(),
  createdBy: int("createdBy").notNull(), // Admin の userId
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VaultEntry = typeof vaultEntries.$inferSelect;
export type InsertVaultEntry = typeof vaultEntries.$inferInsert;

// 監査ログ（Vault アクセス・編集・コピーを記録）
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: varchar("action", { length: 50 }).notNull(), // view, copy, edit, delete など
  entityType: varchar("entityType", { length: 100 }).notNull(), // vault_entry など
  entityId: int("entityId").notNull(),
  details: text("details"), // アクション詳細（例：「マスキング解除」）
  ipAddress: varchar("ipAddress", { length: 45 }), // IPv4/IPv6
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
