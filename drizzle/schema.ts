import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

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

// ルール・決定事項
export const rules = mysqlTable("rules", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["decided", "pending"]).default("decided").notNull(),
  summary: text("summary").notNull(),
  details: text("details").notNull(),
  evidenceLinks: json("evidenceLinks").$type<string[]>().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Rule = typeof rules.$inferSelect;
export type InsertRule = typeof rules.$inferInsert;

// FAQ
export const faq = mysqlTable("faq", {
  id: int("id").autoincrement().primaryKey(),
  question: varchar("question", { length: 500 }).notNull(),
  answer: text("answer").notNull(),
  relatedRuleIds: json("relatedRuleIds").$type<number[]>().notNull(),
  relatedPostIds: json("relatedPostIds").$type<number[]>().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FAQ = typeof faq.$inferSelect;
export type InsertFAQ = typeof faq.$inferInsert;

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
