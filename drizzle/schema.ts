import { integer, pgEnum, pgTable, text, timestamp, varchar, jsonb, boolean, serial } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */

// Enum definitions
export const roleEnum = pgEnum("role", ["public", "member", "editor", "admin"]);
export const statusEnum = pgEnum("status", ["draft", "conditional", "confirmed", "pending", "published", "decided", "active", "closed"]);
export const categoryEnum = pgEnum("category", ["inquiry", "answer", "decision", "pending", "trouble", "improvement"]);
export const authorRoleEnum = pgEnum("author_role", ["member", "editor", "admin"]);
export const exemptionStatusEnum = pgEnum("exemption_status", ["pending", "approved", "rejected"]);
export const priorityEnum = pgEnum("priority", ["low", "medium", "high"]);
export const pendingStatusEnum = pgEnum("pending_status", ["pending", "resolved", "transferred"]);
export const classificationEnum = pgEnum("classification", ["public", "internal", "confidential"]);
export const questionTypeEnum = pgEnum("question_type", ["single_choice", "multiple_choice"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(), // OAuth用（nullable）
  passwordHash: text("passwordHash"), // パスワード認証用（nullable）
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(), // ログイン用にunique
  loginMethod: varchar("loginMethod", { length: 64 }), // "password" or "oauth"
  householdId: varchar("householdId", { length: 50 }),
  role: roleEnum("role").default("member").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// 住戸（個人情報なし、住戸IDのみ）
export const households = pgTable("households", {
  id: serial("id").primaryKey(),
  householdId: varchar("householdId", { length: 50 }).notNull().unique(),
  moveInDate: timestamp("moveInDate"),
  leaderHistoryCount: integer("leaderHistoryCount").default(0).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Household = typeof households.$inferSelect;
export type InsertHousehold = typeof households.$inferInsert;

// 先9年ローテ（Primary/Backup）
export const leaderSchedule = pgTable("leader_schedule", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  primaryHouseholdId: varchar("primaryHouseholdId", { length: 50 }).notNull(),
  backupHouseholdId: varchar("backupHouseholdId", { length: 50 }).notNull(),
  status: statusEnum("status").default("draft").notNull(),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type LeaderSchedule = typeof leaderSchedule.$inferSelect;
export type InsertLeaderSchedule = typeof leaderSchedule.$inferInsert;

// ローテ選定ロジック（版管理）
export const leaderRotationLogic = pgTable("leader_rotation_logic", {
  id: serial("id").primaryKey(),
  version: integer("version").default(1).notNull(),
  logic: jsonb("logic").$type<{
    priority: string[];
    excludeConditions: string[];
  }>().notNull(),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type LeaderRotationLogic = typeof leaderRotationLogic.$inferSelect;
export type InsertLeaderRotationLogic = typeof leaderRotationLogic.$inferInsert;

// 免除申請（版管理）
export const exemptionRequests = pgTable("exemption_requests", {
  id: serial("id").primaryKey(),
  householdId: varchar("householdId", { length: 50 }).notNull(),
  year: integer("year").notNull(),
  version: integer("version").default(1).notNull(),
  reason: text("reason"),
  status: exemptionStatusEnum("status").default("pending").notNull(),
  approvedBy: integer("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ExemptionRequest = typeof exemptionRequests.$inferSelect;
export type InsertExemptionRequest = typeof exemptionRequests.$inferInsert;

// 年度ログ（投稿）
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull(),
  year: integer("year").notNull(),
  category: categoryEnum("category").notNull(),
  status: statusEnum("status").default("draft").notNull(),
  authorId: integer("authorId"),
  authorRole: authorRoleEnum("authorRole"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  publishedAt: timestamp("publishedAt"),
  relatedLinks: jsonb("relatedLinks").$type<string[]>().notNull(),
  isHypothesis: boolean("isHypothesis").default(false).notNull(),
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

// 年間カレンダー（行事）
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  date: timestamp("date").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  checklist: jsonb("checklist").$type<Array<{ id: string; text: string; completed: boolean }>>().notNull(),
  notes: text("notes"),
  attachments: jsonb("attachments").$type<Array<{ url: string; name: string }>>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

// 河川清掃実施ログ
export const riverCleaningRuns = pgTable("river_cleaning_runs", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  participantsCount: integer("participantsCount"),
  issues: text("issues"),
  whatWorked: text("whatWorked"),
  whatToImprove: text("whatToImprove"),
  attachments: jsonb("attachments").$type<Array<{ url: string; name: string }>>().notNull(),
  linkedInventoryIds: jsonb("linkedInventoryIds").$type<number[]>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type RiverCleaningRun = typeof riverCleaningRuns.$inferSelect;
export type InsertRiverCleaningRun = typeof riverCleaningRuns.$inferInsert;

// 備品台帳
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  photo: text("photo"),
  qty: integer("qty").default(0).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  condition: varchar("condition", { length: 100 }),
  lastCheckedAt: timestamp("lastCheckedAt"),
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type InventoryItem = typeof inventory.$inferSelect;
export type InsertInventoryItem = typeof inventory.$inferInsert;

// テンプレ
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  tags: jsonb("tags").$type<string[]>().notNull(),
});

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;

// ルール・決定事項（版管理）
export const rules = pgTable("rules", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  status: statusEnum("status").default("decided").notNull(),
  summary: text("summary").notNull(),
  details: text("details").notNull(),
  evidenceLinks: jsonb("evidenceLinks").$type<string[]>().notNull(),
  isHypothesis: boolean("isHypothesis").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Rule = typeof rules.$inferSelect;
export type InsertRule = typeof rules.$inferInsert;

// ルール版管理
export const ruleVersions = pgTable("rule_versions", {
  id: serial("id").primaryKey(),
  ruleId: integer("ruleId").notNull(),
  version: integer("version").default(1).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  summary: text("summary").notNull(),
  details: text("details").notNull(),
  reason: text("reason"),
  changedBy: integer("changedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RuleVersion = typeof ruleVersions.$inferSelect;
export type InsertRuleVersion = typeof ruleVersions.$inferInsert;

// FAQ
export const faq = pgTable("faq", {
  id: serial("id").primaryKey(),
  question: varchar("question", { length: 500 }).notNull(),
  answer: text("answer").notNull(),
  relatedRuleIds: jsonb("relatedRuleIds").$type<number[]>().notNull(),
  relatedPostIds: jsonb("relatedPostIds").$type<number[]>().notNull(),
  isHypothesis: boolean("isHypothesis").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type FAQ = typeof faq.$inferSelect;
export type InsertFAQ = typeof faq.$inferInsert;

// 返信待ちキュー（Pending Queue）
export const pendingQueue = pgTable("pending_queue", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  toWhom: varchar("toWhom", { length: 100 }).notNull(),
  status: pendingStatusEnum("status").default("pending").notNull(),
  priority: priorityEnum("priority").default("medium").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
  transferredToNextYear: boolean("transferredToNextYear").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PendingQueue = typeof pendingQueue.$inferSelect;
export type InsertPendingQueue = typeof pendingQueue.$inferInsert;

// 引き継ぎ袋チェックリスト
export const handoverBagItems = pgTable("handover_bag_items", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 255 }).notNull(),
  isChecked: boolean("isChecked").default(false).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type HandoverBagItem = typeof handoverBagItems.$inferSelect;
export type InsertHandoverBagItem = typeof handoverBagItems.$inferInsert;

// 変更履歴
export const changelog = pgTable("changelog", {
  id: serial("id").primaryKey(),
  summary: varchar("summary", { length: 255 }).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  authorId: integer("authorId"),
  authorRole: authorRoleEnum("authorRole"),
  editorName: varchar("editorName", { length: 100 }),
  relatedEntityType: varchar("relatedEntityType", { length: 100 }).notNull(),
  relatedEntityId: integer("relatedEntityId"),
});

export type Changelog = typeof changelog.$inferSelect;
export type InsertChangelog = typeof changelog.$inferInsert;

// 秘匿メモ（Admin限定）
export const secretNotes = pgTable("secret_notes", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SecretNote = typeof secretNotes.$inferSelect;
export type InsertSecretNote = typeof secretNotes.$inferInsert;

// Member トップ用の集計テーブル（キャッシュ）
export const memberTopSummary = pgTable("member_top_summary", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  weekStartDate: timestamp("weekStartDate").notNull(),
  thisWeekTasks: jsonb("thisWeekTasks").$type<Array<{ id: number; title: string }>>().notNull(),
  topPriorities: jsonb("topPriorities").$type<Array<{ id: number; title: string }>>().notNull(),
  unresolvedIssues: jsonb("unresolvedIssues").$type<Array<{ id: number; title: string }>>().notNull(),
  pendingReplies: jsonb("pendingReplies").$type<Array<{ id: number; title: string; toWhom: string }>>().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type MemberTopSummary = typeof memberTopSummary.$inferSelect;
export type InsertMemberTopSummary = typeof memberTopSummary.$inferInsert;


// データ分類ラベル（public / internal / confidential）
export const dataClassification = pgTable("data_classification", {
  id: serial("id").primaryKey(),
  entityType: varchar("entityType", { length: 100 }).notNull(),
  entityId: integer("entityId").notNull(),
  classification: classificationEnum("classification").default("public").notNull(),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type DataClassification = typeof dataClassification.$inferSelect;
export type InsertDataClassification = typeof dataClassification.$inferInsert;

// Private Vault エントリ（Admin限定秘匿情報）
export const vaultEntries = pgTable("vault_entries", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 100 }).notNull(),
  key: varchar("key", { length: 255 }).notNull(),
  maskedValue: varchar("maskedValue", { length: 500 }).notNull(),
  actualValue: text("actualValue").notNull(),
  classification: classificationEnum("classification").default("confidential").notNull(),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type VaultEntry = typeof vaultEntries.$inferSelect;
export type InsertVaultEntry = typeof vaultEntries.$inferInsert;

// 監査ログ（Vault アクセス・編集・コピーを記録）
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  action: varchar("action", { length: 50 }).notNull(),
  entityType: varchar("entityType", { length: 100 }).notNull(),
  entityId: integer("entityId").notNull(),
  details: text("details"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;


// 住民メールアドレス（組長が登録）
export const residentEmails = pgTable("resident_emails", {
  id: serial("id").primaryKey(),
  householdId: varchar("householdId", { length: 50 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  registeredBy: integer("registeredBy"),
  registeredAt: timestamp("registeredAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ResidentEmail = typeof residentEmails.$inferSelect;
export type InsertResidentEmail = typeof residentEmails.$inferInsert;


// フォーム（汎用フォーム管理）
export const forms = pgTable("forms", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  createdBy: integer("createdBy"),
  dueDate: timestamp("dueDate"),
  status: statusEnum("status").default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Form = typeof forms.$inferSelect;
export type InsertForm = typeof forms.$inferInsert;

// フォーム質問（各質問と選択肢）
export const formQuestions = pgTable("form_questions", {
  id: serial("id").primaryKey(),
  formId: integer("formId").notNull(),
  questionText: varchar("questionText", { length: 500 }).notNull(),
  questionType: questionTypeEnum("questionType").default("single_choice").notNull(),
  required: boolean("required").default(true).notNull(),
  orderIndex: integer("orderIndex").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type FormQuestion = typeof formQuestions.$inferSelect;
export type InsertFormQuestion = typeof formQuestions.$inferInsert;

// フォーム選択肢
export const formChoices = pgTable("form_choices", {
  id: serial("id").primaryKey(),
  questionId: integer("questionId").notNull(),
  choiceText: varchar("choiceText", { length: 255 }).notNull(),
  orderIndex: integer("orderIndex").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FormChoice = typeof formChoices.$inferSelect;
export type InsertFormChoice = typeof formChoices.$inferInsert;

// フォーム回答（各回答者の回答）
export const formResponses = pgTable("form_responses", {
  id: serial("id").primaryKey(),
  formId: integer("formId").notNull(),
  userId: integer("userId"),
  householdId: varchar("householdId", { length: 50 }),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type FormResponse = typeof formResponses.$inferSelect;
export type InsertFormResponse = typeof formResponses.$inferInsert;

// フォーム回答内容（各質問への回答）
export const formResponseItems = pgTable("form_response_items", {
  id: serial("id").primaryKey(),
  responseId: integer("responseId").notNull(),
  questionId: integer("questionId").notNull(),
  choiceId: integer("choiceId"),
  textAnswer: text("textAnswer"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FormResponseItem = typeof formResponseItems.$inferSelect;
export type InsertFormResponseItem = typeof formResponseItems.$inferInsert;

// ページ編集可能コンテンツ（SOP等の静的セクション管理）
export const pageContent = pgTable("page_content", {
  id: serial("id").primaryKey(),
  pageKey: varchar("pageKey", { length: 100 }).notNull(),
  sectionKey: varchar("sectionKey", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  items: jsonb("items").$type<string[]>().notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PageContent = typeof pageContent.$inferSelect;
export type InsertPageContent = typeof pageContent.$inferInsert;
