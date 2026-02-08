// server/vercel-handler.ts
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL || process.env.POSTGRES_URL || "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/_core/notification.ts
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { z as z2 } from "zod";

// server/db.ts
import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// drizzle/schema.ts
import { integer, pgEnum, pgTable, text, timestamp, varchar, jsonb, boolean, serial } from "drizzle-orm/pg-core";
var roleEnum = pgEnum("role", ["public", "member", "editor", "admin"]);
var statusEnum = pgEnum("status", ["draft", "conditional", "confirmed", "pending", "published", "decided", "active", "closed"]);
var categoryEnum = pgEnum("category", ["inquiry", "answer", "decision", "pending", "trouble", "improvement"]);
var authorRoleEnum = pgEnum("author_role", ["member", "editor", "admin"]);
var exemptionStatusEnum = pgEnum("exemption_status", ["pending", "approved", "rejected"]);
var priorityEnum = pgEnum("priority", ["low", "medium", "high"]);
var pendingStatusEnum = pgEnum("pending_status", ["pending", "resolved", "transferred"]);
var classificationEnum = pgEnum("classification", ["public", "internal", "confidential"]);
var questionTypeEnum = pgEnum("question_type", ["single_choice", "multiple_choice"]);
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  // OAuth用（nullable）
  passwordHash: text("passwordHash"),
  // パスワード認証用（nullable）
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  // ログイン用にunique
  loginMethod: varchar("loginMethod", { length: 64 }),
  // "password" or "oauth"
  householdId: varchar("householdId", { length: 50 }),
  role: roleEnum("role").default("member").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var households = pgTable("households", {
  id: serial("id").primaryKey(),
  householdId: varchar("householdId", { length: 50 }).notNull().unique(),
  moveInDate: timestamp("moveInDate"),
  leaderHistoryCount: integer("leaderHistoryCount").default(0).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var leaderSchedule = pgTable("leader_schedule", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  primaryHouseholdId: varchar("primaryHouseholdId", { length: 50 }).notNull(),
  backupHouseholdId: varchar("backupHouseholdId", { length: 50 }).notNull(),
  status: statusEnum("status").default("draft").notNull(),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var leaderRotationLogic = pgTable("leader_rotation_logic", {
  id: serial("id").primaryKey(),
  version: integer("version").default(1).notNull(),
  logic: jsonb("logic").$type().notNull(),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var exemptionRequests = pgTable("exemption_requests", {
  id: serial("id").primaryKey(),
  householdId: varchar("householdId", { length: 50 }).notNull(),
  year: integer("year").notNull(),
  version: integer("version").default(1).notNull(),
  reason: text("reason"),
  status: exemptionStatusEnum("status").default("pending").notNull(),
  approvedBy: integer("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  tags: jsonb("tags").$type().notNull(),
  year: integer("year").notNull(),
  category: categoryEnum("category").notNull(),
  status: statusEnum("status").default("draft").notNull(),
  authorId: integer("authorId"),
  authorRole: authorRoleEnum("authorRole"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  publishedAt: timestamp("publishedAt"),
  relatedLinks: jsonb("relatedLinks").$type().notNull(),
  isHypothesis: boolean("isHypothesis").default(false).notNull()
});
var events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  date: timestamp("date").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  checklist: jsonb("checklist").$type().notNull(),
  notes: text("notes"),
  attachments: jsonb("attachments").$type().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var riverCleaningRuns = pgTable("river_cleaning_runs", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  participantsCount: integer("participantsCount"),
  issues: text("issues"),
  whatWorked: text("whatWorked"),
  whatToImprove: text("whatToImprove"),
  attachments: jsonb("attachments").$type().notNull(),
  linkedInventoryIds: jsonb("linkedInventoryIds").$type().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  photo: varchar("photo", { length: 500 }),
  qty: integer("qty").default(0).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  condition: varchar("condition", { length: 100 }),
  lastCheckedAt: timestamp("lastCheckedAt"),
  notes: text("notes"),
  tags: jsonb("tags").$type().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  tags: jsonb("tags").$type().notNull()
});
var rules = pgTable("rules", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  status: statusEnum("status").default("decided").notNull(),
  summary: text("summary").notNull(),
  details: text("details").notNull(),
  evidenceLinks: jsonb("evidenceLinks").$type().notNull(),
  isHypothesis: boolean("isHypothesis").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var ruleVersions = pgTable("rule_versions", {
  id: serial("id").primaryKey(),
  ruleId: integer("ruleId").notNull(),
  version: integer("version").default(1).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  summary: text("summary").notNull(),
  details: text("details").notNull(),
  reason: text("reason"),
  changedBy: integer("changedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var faq = pgTable("faq", {
  id: serial("id").primaryKey(),
  question: varchar("question", { length: 500 }).notNull(),
  answer: text("answer").notNull(),
  relatedRuleIds: jsonb("relatedRuleIds").$type().notNull(),
  relatedPostIds: jsonb("relatedPostIds").$type().notNull(),
  isHypothesis: boolean("isHypothesis").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var pendingQueue = pgTable("pending_queue", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  toWhom: varchar("toWhom", { length: 100 }).notNull(),
  status: pendingStatusEnum("status").default("pending").notNull(),
  priority: priorityEnum("priority").default("medium").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
  transferredToNextYear: boolean("transferredToNextYear").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var handoverBagItems = pgTable("handover_bag_items", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 255 }).notNull(),
  isChecked: boolean("isChecked").default(false).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var changelog = pgTable("changelog", {
  id: serial("id").primaryKey(),
  summary: varchar("summary", { length: 255 }).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  authorId: integer("authorId"),
  authorRole: authorRoleEnum("authorRole"),
  editorName: varchar("editorName", { length: 100 }),
  relatedEntityType: varchar("relatedEntityType", { length: 100 }).notNull(),
  relatedEntityId: integer("relatedEntityId")
});
var secretNotes = pgTable("secret_notes", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var memberTopSummary = pgTable("member_top_summary", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  weekStartDate: timestamp("weekStartDate").notNull(),
  thisWeekTasks: jsonb("thisWeekTasks").$type().notNull(),
  topPriorities: jsonb("topPriorities").$type().notNull(),
  unresolvedIssues: jsonb("unresolvedIssues").$type().notNull(),
  pendingReplies: jsonb("pendingReplies").$type().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var dataClassification = pgTable("data_classification", {
  id: serial("id").primaryKey(),
  entityType: varchar("entityType", { length: 100 }).notNull(),
  entityId: integer("entityId").notNull(),
  classification: classificationEnum("classification").default("public").notNull(),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var vaultEntries = pgTable("vault_entries", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 100 }).notNull(),
  key: varchar("key", { length: 255 }).notNull(),
  maskedValue: varchar("maskedValue", { length: 500 }).notNull(),
  actualValue: text("actualValue").notNull(),
  classification: classificationEnum("classification").default("confidential").notNull(),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  action: varchar("action", { length: 50 }).notNull(),
  entityType: varchar("entityType", { length: 100 }).notNull(),
  entityId: integer("entityId").notNull(),
  details: text("details"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  timestamp: timestamp("timestamp").defaultNow().notNull()
});
var residentEmails = pgTable("resident_emails", {
  id: serial("id").primaryKey(),
  householdId: varchar("householdId", { length: 50 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  registeredBy: integer("registeredBy"),
  registeredAt: timestamp("registeredAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var forms = pgTable("forms", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  createdBy: integer("createdBy"),
  dueDate: timestamp("dueDate"),
  status: statusEnum("status").default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var formQuestions = pgTable("form_questions", {
  id: serial("id").primaryKey(),
  formId: integer("formId").notNull(),
  questionText: varchar("questionText", { length: 500 }).notNull(),
  questionType: questionTypeEnum("questionType").default("single_choice").notNull(),
  required: boolean("required").default(true).notNull(),
  orderIndex: integer("orderIndex").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var formChoices = pgTable("form_choices", {
  id: serial("id").primaryKey(),
  questionId: integer("questionId").notNull(),
  choiceText: varchar("choiceText", { length: 255 }).notNull(),
  orderIndex: integer("orderIndex").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var formResponses = pgTable("form_responses", {
  id: serial("id").primaryKey(),
  formId: integer("formId").notNull(),
  userId: integer("userId"),
  householdId: varchar("householdId", { length: 50 }),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var formResponseItems = pgTable("form_response_items", {
  id: serial("id").primaryKey(),
  responseId: integer("responseId").notNull(),
  questionId: integer("questionId").notNull(),
  choiceId: integer("choiceId"),
  textAnswer: text("textAnswer"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});

// server/db.ts
var _db = null;
function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}
async function getDb() {
  const dbUrl = getDatabaseUrl();
  if (!_db && dbUrl) {
    try {
      const client = postgres(dbUrl);
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}

// server/routers.ts
import { eq as eq2, like, or, and, desc as desc2, asc, lte, gte } from "drizzle-orm";
async function logChange(summary, entityType, entityId) {
  const db = await getDb();
  if (!db) return;
  await db.insert(changelog).values({
    summary,
    date: /* @__PURE__ */ new Date(),
    relatedEntityType: entityType,
    relatedEntityId: entityId ?? null
  });
}
var appRouter = router({
  system: systemRouter,
  // 認証不要 - meはnullを返す
  auth: router({
    me: publicProcedure.query(() => null),
    logout: publicProcedure.mutation(() => ({ success: true }))
  }),
  // シードデータ投入（初回のみ）
  seed: router({
    run: publicProcedure.input(z2.object({ force: z2.boolean().optional() }).optional()).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const force = input?.force ?? false;
      const existingHouseholds = await db.select().from(households);
      if (existingHouseholds.length > 0 && !force) {
        return { success: true, message: "\u30C7\u30FC\u30BF\u306F\u65E2\u306B\u6295\u5165\u6E08\u307F\u3067\u3059\u3002force: true \u3067\u518D\u6295\u5165\u3067\u304D\u307E\u3059\u3002", skipped: true };
      }
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
      const householdData = [
        { householdId: "101", moveInDate: /* @__PURE__ */ new Date("2025-09-01"), leaderHistoryCount: 0 },
        { householdId: "102", moveInDate: /* @__PURE__ */ new Date("2024-10-01"), leaderHistoryCount: 1 },
        { householdId: "103", moveInDate: /* @__PURE__ */ new Date("2023-03-01"), leaderHistoryCount: 0 },
        { householdId: "201", moveInDate: /* @__PURE__ */ new Date("2025-10-01"), leaderHistoryCount: 0 },
        { householdId: "202", moveInDate: /* @__PURE__ */ new Date("2024-02-01"), leaderHistoryCount: 0 },
        { householdId: "203", moveInDate: /* @__PURE__ */ new Date("2018-03-01"), leaderHistoryCount: 1 },
        { householdId: "301", moveInDate: /* @__PURE__ */ new Date("2022-04-01"), leaderHistoryCount: 1 },
        { householdId: "302", moveInDate: /* @__PURE__ */ new Date("2025-03-01"), leaderHistoryCount: 0 },
        { householdId: "303", moveInDate: /* @__PURE__ */ new Date("2020-08-01"), leaderHistoryCount: 1 }
      ];
      for (const h of householdData) {
        await db.insert(households).values(h).onConflictDoNothing();
      }
      const eventData = [
        { title: "\u6CB3\u5DDD\u6E05\u6383\uFF08\u7B2C1\u56DE\uFF09", date: /* @__PURE__ */ new Date("2025-04-20T08:00:00"), category: "\u6E05\u6383", checklist: [{ id: "1", text: "\u624B\u888B\u6E96\u5099", completed: false }, { id: "2", text: "\u53C2\u52A0\u8005\u78BA\u8A8D", completed: false }], notes: "\u9ED2\u77F3\u5DDD\u5468\u8FBA\u3002\u51FA\u4E0D\u8DB3\u91D1\u5BFE\u8C61\u6D3B\u52D5\u3002", attachments: [] },
        { title: "\u753A\u5185\u4F1A\u5831\u544A\u66F8\u63D0\u51FA", date: /* @__PURE__ */ new Date("2025-05-02T00:00:00"), category: "\u7DE0\u5207", checklist: [{ id: "1", text: "\u5831\u544A\u66F8\u4F5C\u6210", completed: false }], notes: "\u753A\u5185\u4F1A\u3078\u306E\u5E74\u9593\u5831\u544A\u66F8", attachments: [] },
        { title: "\u7DCF\u4F1A\u30FB\u7D44\u9577\u4F1A", date: /* @__PURE__ */ new Date("2025-05-26T19:00:00"), category: "\u4F1A\u8B70", checklist: [{ id: "1", text: "\u8B70\u6848\u66F8\u6E96\u5099", completed: false }, { id: "2", text: "\u51FA\u6B20\u78BA\u8A8D", completed: false }], notes: "\u7DCF\u4F1A\u5F8C\u306B\u7D44\u9577\u4F1A\u3002\u5E74\u5EA6\u521D\u56DE\u3002\u5927\u4F4F\u516C\u4F1A\u5802\u306B\u3066\u3002", attachments: [] },
        { title: "\u7D44\u9577\u4F1A", date: /* @__PURE__ */ new Date("2025-06-26T19:00:00"), category: "\u4F1A\u8B70", checklist: [], notes: "\u5927\u4F4F\u516C\u4F1A\u5802\u306B\u3066", attachments: [] },
        { title: "\u4E16\u5E2F\u5BB6\u65CF\u8ABF\u67FB\u914D\u5E03\u30FB\u56DE\u53CE", date: /* @__PURE__ */ new Date("2025-06-15T00:00:00"), category: "\u884C\u4E8B", checklist: [{ id: "1", text: "\u8ABF\u67FB\u7528\u7D19\u914D\u5E03", completed: false }, { id: "2", text: "\u56DE\u53CE", completed: false }], notes: "\u5404\u4E16\u5E2F\u3078\u306E\u8ABF\u67FB\u7528\u7D19\u306E\u914D\u5E03\u3068\u56DE\u53CE", attachments: [] },
        { title: "\u6CB3\u5DDD\u6E05\u6383\uFF08\u7B2C2\u56DE\uFF09", date: /* @__PURE__ */ new Date("2025-07-06T08:00:00"), category: "\u6E05\u6383", checklist: [{ id: "1", text: "\u624B\u888B\u6E96\u5099", completed: false }], notes: "\u9ED2\u77F3\u5DDD\u5468\u8FBA", attachments: [] },
        { title: "\u7D44\u9577\u4F1A", date: /* @__PURE__ */ new Date("2025-07-26T19:00:00"), category: "\u4F1A\u8B70", checklist: [], notes: "\u5927\u4F4F\u516C\u4F1A\u5802\u306B\u3066", attachments: [] },
        { title: "\u9632\u707D\u8A13\u7DF4 \u7B2C1\u56DE", date: /* @__PURE__ */ new Date("2025-08-24T17:00:00"), category: "\u884C\u4E8B", checklist: [{ id: "1", text: "\u8A13\u7DF4\u5185\u5BB9\u78BA\u8A8D", completed: false }], notes: "\u5915\u65B9\u5B9F\u65BD\u3002\u8FD1\u96A3\u4F4F\u6C11\u3082\u53C2\u52A0\u3002", attachments: [] },
        { title: "\u7D44\u9577\u4F1A", date: /* @__PURE__ */ new Date("2025-08-26T19:00:00"), category: "\u4F1A\u8B70", checklist: [], notes: "\u5927\u4F4F\u516C\u4F1A\u5802\u306B\u3066", attachments: [] },
        { title: "\u9ED2\u77F3\u5DDD\u5824\u9632\u8349\u5208\u308A", date: /* @__PURE__ */ new Date("2025-09-21T00:00:00"), category: "\u884C\u4E8B", checklist: [], notes: "\u30DE\u30F3\u30B7\u30E7\u30F3\u4F4F\u6C11\u306F\u53C2\u52A0\u4E0D\u8981\u3002\u5730\u4E3B\u5BFE\u5FDC\u3002", attachments: [] },
        { title: "\u7D44\u9577\u4F1A", date: /* @__PURE__ */ new Date("2025-09-26T19:00:00"), category: "\u4F1A\u8B70", checklist: [], notes: "\u5927\u4F4F\u516C\u4F1A\u5802\u306B\u3066", attachments: [] },
        { title: "\u9632\u707D\u8A13\u7DF4 \u7B2C2\u56DE", date: /* @__PURE__ */ new Date("2025-10-05T09:00:00"), category: "\u884C\u4E8B", checklist: [{ id: "1", text: "\u8A13\u7DF4\u5185\u5BB9\u78BA\u8A8D", completed: false }], notes: "\u5348\u524D\u4E2D\u5B9F\u65BD\u3002", attachments: [] },
        { title: "\u8D64\u3044\u7FBD\u6839\u52DF\u91D1", date: /* @__PURE__ */ new Date("2025-10-15T00:00:00"), category: "\u884C\u4E8B", checklist: [{ id: "1", text: "\u5404\u4E16\u5E2F\u304B\u3089\u96C6\u91D1", completed: false }], notes: "\u5404\u4E16\u5E2F\u304B\u3089\u52DF\u91D1\u3092\u96C6\u3081\u308B", attachments: [] },
        { title: "\u7D44\u9577\u4F1A", date: /* @__PURE__ */ new Date("2025-10-26T19:00:00"), category: "\u4F1A\u8B70", checklist: [], notes: "\u5927\u4F4F\u516C\u4F1A\u5802\u306B\u3066", attachments: [] },
        { title: "\u6B21\u5E74\u5EA6\u7D44\u9577\u9078\u5B9A\u30D7\u30ED\u30BB\u30B9\u958B\u59CB", date: /* @__PURE__ */ new Date("2025-11-01T00:00:00"), category: "\u884C\u4E8B", checklist: [{ id: "1", text: "\u5019\u88DC\u8005\u30EA\u30B9\u30C8\u4F5C\u6210", completed: false }, { id: "2", text: "\u5019\u88DC\u8005\u3078\u6253\u8A3A", completed: false }], notes: "\u5019\u88DC\u8005\u306E\u9078\u5B9A\u3068\u6253\u8A3A", attachments: [] },
        { title: "\u7D44\u9577\u4F1A", date: /* @__PURE__ */ new Date("2025-11-26T19:00:00"), category: "\u4F1A\u8B70", checklist: [], notes: "\u5927\u4F4F\u516C\u4F1A\u5802\u306B\u3066", attachments: [] },
        { title: "\u7D44\u9577\u78BA\u5B9A\u30FB\u7D44\u9577\u4F1A\u306B\u5831\u544A", date: /* @__PURE__ */ new Date("2025-12-01T00:00:00"), category: "\u884C\u4E8B", checklist: [{ id: "1", text: "\u6B21\u5E74\u5EA6\u7D44\u9577\u78BA\u5B9A", completed: false }], notes: "\u6B21\u5E74\u5EA6\u306E203\u53F7\u5BA4\u306B\u78BA\u5B9A", attachments: [] },
        { title: "\u7D44\u9577\u4F1A", date: /* @__PURE__ */ new Date("2025-12-26T19:00:00"), category: "\u4F1A\u8B70", checklist: [], notes: "\u5927\u4F4F\u516C\u4F1A\u5802\u306B\u3066", attachments: [] },
        { title: "\u5F15\u304D\u7D99\u304E\u6E96\u5099", date: /* @__PURE__ */ new Date("2026-01-15T00:00:00"), category: "\u884C\u4E8B", checklist: [{ id: "1", text: "\u30DD\u30FC\u30BF\u30EB\u30B5\u30A4\u30C8\u66F4\u65B0", completed: false }, { id: "2", text: "\u8CC7\u6599\u6574\u7406", completed: false }], notes: "\u30DD\u30FC\u30BF\u30EB\u30B5\u30A4\u30C8\u66F4\u65B0\u3001\u8CC7\u6599\u6574\u7406", attachments: [] },
        { title: "\u7D44\u9577\u4F1A", date: /* @__PURE__ */ new Date("2026-01-26T19:00:00"), category: "\u4F1A\u8B70", checklist: [], notes: "\u5927\u4F4F\u516C\u4F1A\u5802\u306B\u3066", attachments: [] },
        { title: "\u7D44\u9577\u4F1A", date: /* @__PURE__ */ new Date("2026-02-26T19:00:00"), category: "\u4F1A\u8B70", checklist: [], notes: "\u5927\u4F4F\u516C\u4F1A\u5802\u306B\u3066", attachments: [] },
        { title: "\u9632\u707D\u8A13\u7DF4 \u7B2C3\u56DE", date: /* @__PURE__ */ new Date("2026-03-15T00:00:00"), category: "\u884C\u4E8B", checklist: [], notes: "\u4E88\u5B9A\u3002\u307E\u3060\u672A\u5B9F\u65BD\u3002", attachments: [] },
        { title: "\u7D44\u9577\u4F1A", date: /* @__PURE__ */ new Date("2026-03-26T19:00:00"), category: "\u4F1A\u8B70", checklist: [], notes: "\u5927\u4F4F\u516C\u4F1A\u5802\u306B\u3066", attachments: [] }
      ];
      for (const e of eventData) {
        await db.insert(events).values(e);
      }
      const inventoryData = [
        { name: "\u5E73\u30B9\u30B3\u30C3\u30D7", qty: 2, location: "\u7D44\u9577\u5009\u5EAB\uFF08\u968E\u6BB5\u4E0B\uFF09", condition: "\u4F7F\u7528\u53EF", notes: null, tags: ["\u6E05\u6383", "\u6CB3\u5DDD\u6E05\u6383"] },
        { name: "\u5263\u5148\u30B9\u30B3\u30C3\u30D7", qty: 2, location: "\u7D44\u9577\u5009\u5EAB\uFF08\u968E\u6BB5\u4E0B\uFF09", condition: "\u4F7F\u7528\u53EF", notes: null, tags: ["\u6E05\u6383", "\u6CB3\u5DDD\u6E05\u6383"] },
        { name: "\u571F\u56A2\u888B", qty: 30, location: "\u7D44\u9577\u5009\u5EAB\uFF08\u968E\u6BB5\u4E0B\uFF09", condition: "\u826F\u597D", notes: "\u5E741\u56DE\u914D\u5E03\u3042\u308A", tags: ["\u9632\u707D"] },
        { name: "\u753A\u5185\u4F1A\u65D7", qty: 3, location: "\u7D44\u9577\u5009\u5EAB\uFF08\u968E\u6BB5\u4E0B\uFF09", condition: "\u672A\u4F7F\u7528", notes: "\u4F7F\u7528\u5B9F\u7E3E\u306A\u3057", tags: ["\u884C\u4E8B"] },
        { name: "\u4F7F\u3044\u6368\u3066\u624B\u888B", qty: 1, location: "\u7D44\u9577\u5009\u5EAB\uFF08\u968E\u6BB5\u4E0B\uFF09", condition: "\u826F\u597D", notes: "\u6CB3\u5DDD\u6E05\u6383\u7528\u3002\u6BCE\u5E74100\u5747\u3067\u8CFC\u5165\uFF08500\u5186\u7A0B\u5EA6\uFF09", tags: ["\u6E05\u6383", "\u6D88\u8017\u54C1"] },
        { name: "\u30D8\u30EB\u30E1\u30C3\u30C8", qty: 2, location: "\u7D44\u9577\u5009\u5EAB\uFF08\u968E\u6BB5\u4E0B\uFF09", condition: "\u4F7F\u7528\u53EF", notes: null, tags: ["\u9632\u707D"] },
        { name: "\u938C", qty: 2, location: "\u7D44\u9577\u5009\u5EAB\uFF08\u968E\u6BB5\u4E0B\uFF09", condition: "\u4F7F\u7528\u53EF", notes: null, tags: ["\u6E05\u6383"] },
        { name: "\u4E09\u672C\u722A\uFF08\u30EC\u30FC\u30AD\uFF09", qty: 1, location: "\u7D44\u9577\u5009\u5EAB\uFF08\u968E\u6BB5\u4E0B\uFF09", condition: "\u4F7F\u7528\u53EF", notes: null, tags: ["\u6E05\u6383"] },
        { name: "\u4E09\u89D2\u30DB\u30FC", qty: 2, location: "\u7D44\u9577\u5009\u5EAB\uFF08\u968E\u6BB5\u4E0B\uFF09", condition: "\u4F7F\u7528\u53EF", notes: null, tags: ["\u6E05\u6383"] }
      ];
      for (const i of inventoryData) {
        await db.insert(inventory).values(i);
      }
      const faqData = [
        { question: "\u6CB3\u5DDD\u6E05\u6383\u306B\u53C2\u52A0\u3067\u304D\u306A\u3044\u5834\u5408\u306F\uFF1F", answer: "2025\u5E74\u5EA6\u307E\u3067\u306F\u51FA\u4E0D\u8DB3\u91D1\uFF081\u56DE\u306B\u3064\u304D\u5B9A\u984D\uFF09\u304C\u767A\u751F\u3057\u307E\u3057\u305F\u30022026\u5E74\u5EA6\u304B\u3089\u306F\u51FA\u4E0D\u8DB3\u91D1\u5236\u5EA6\u306F\u5EC3\u6B62\u3055\u308C\u3066\u3044\u307E\u3059\u3002\u5C0F\u3055\u306A\u304A\u5B50\u3055\u3093\u306E\u3044\u308B\u5BB6\u5EAD\u306F\u514D\u9664\u5BFE\u8C61\u3067\u3059\u3002", relatedRuleIds: [], relatedPostIds: [] },
        { question: "\u7D44\u9577\u5009\u5EAB\u306F\u3069\u3053\u3067\u3059\u304B\uFF1F", answer: "\u30A8\u30F3\u30C8\u30E9\u30F3\u30B9\u6A2A\u306E\u968E\u6BB5\u4E0B\u3001\u99D0\u8F2A\u5834\u4ED8\u8FD1\u306B\u3042\u308A\u307E\u3059\u3002\u7D041\u7573\u3001\u8170\u306E\u9AD8\u3055\u306E\u7269\u7F6E\u3067\u3059\u3002\u9375\u306F\u7D44\u9577\u304C\u7BA1\u7406\u3057\u3066\u3044\u307E\u3059\u3002", relatedRuleIds: [], relatedPostIds: [] },
        { question: "\u7D44\u9577\u306E\u9078\u3073\u65B9\u306F\uFF1F", answer: "\u5165\u5C45\u9806\u30FB\u7D4C\u9A13\u56DE\u6570\u3092\u30D9\u30FC\u30B9\u306B\u30ED\u30FC\u30C6\u30FC\u30B7\u30E7\u30F3\u3067\u6C7A\u5B9A\u3057\u307E\u3059\u3002\u514D\u9664\u7533\u8ACB\u304C\u3042\u308B\u5834\u5408\u306F\u7D44\u9577\u4F1A\u3067\u5BE9\u8B70\u3055\u308C\u307E\u3059\u3002", relatedRuleIds: [], relatedPostIds: [] },
        { question: "\u7BA1\u7406\u4F1A\u793E\u306F\u3069\u3053\u3067\u3059\u304B\uFF1F", answer: "\u5E73\u548C\u30CF\u30A6\u30B8\u30F3\u30B0\u682A\u5F0F\u4F1A\u793E\u3067\u3059\u3002\u8A2D\u5099\u30C8\u30E9\u30D6\u30EB\u7B49\u306F\u7BA1\u7406\u4F1A\u793E\u306B\u76F4\u63A5\u9023\u7D61\u3057\u3066\u304F\u3060\u3055\u3044\u3002", relatedRuleIds: [], relatedPostIds: [] },
        { question: "\u5C4B\u4E0A\u306B\u4E0A\u304C\u308C\u307E\u3059\u304B\uFF1F", answer: "\u539F\u5247\u7981\u6B62\u3067\u3059\u3002\u6CD5\u7684\u30EA\u30B9\u30AF\uFF08\u843D\u4E0B\u4E8B\u6545\u7B49\u306E\u8CAC\u4EFB\u554F\u984C\uFF09\u304C\u3042\u308B\u305F\u3081\u3001\u7DCA\u6025\u6642\u306F\u7BA1\u7406\u4F1A\u793E\u307E\u305F\u306F\u6D88\u9632\u7F72\u306B\u9023\u7D61\u3057\u3066\u304F\u3060\u3055\u3044\u3002", relatedRuleIds: [], relatedPostIds: [] },
        { question: "\u53E4\u7D19\u56DE\u53CE\u306E\u53CE\u5165\u306F\u3069\u3046\u306A\u308A\u307E\u3059\u304B\uFF1F", answer: "\u5E74\u9593\u7D041,000\u5186\u7A0B\u5EA6\u306E\u53CE\u5165\u304C\u3042\u308A\u3001\u7D44\u9577\u6D3B\u52D5\u8CBB\u306B\u5145\u5F53\u3055\u308C\u307E\u3059\u3002", relatedRuleIds: [], relatedPostIds: [] },
        { question: "\u51FA\u4E0D\u8DB3\u91D1\uFF08\u3067\u3076\u305D\u304F\u304D\u3093\uFF09\u3068\u306F\uFF1F", answer: "\u300C\u51FA\u300D\u306F\u53C2\u52A0\u306E\u610F\u5473\u3002\u6CB3\u5DDD\u6E05\u6383\u7B49\u306E\u5171\u540C\u6D3B\u52D5\u306B\u53C2\u52A0\u3057\u306A\u304B\u3063\u305F\u5834\u5408\u306E\u30DA\u30CA\u30EB\u30C6\u30A3\u91D1\u3067\u3059\u30022025\u5E74\u5EA6\u306785,000\u5186\u304C\u7A4D\u307F\u7ACB\u3066\u3089\u308C\u3001\u5168\u984D\u3092\u7D44\u9577\u5009\u5EAB\u306E\u8CFC\u5165\u8CBB\u7528\u306B\u5145\u3066\u307E\u3057\u305F\u30022026\u5E74\u5EA6\u304B\u3089\u5EC3\u6B62\u3055\u308C\u3066\u3044\u307E\u3059\u3002", relatedRuleIds: [], relatedPostIds: [] }
      ];
      for (const f of faqData) {
        await db.insert(faq).values(f);
      }
      const rulesData = [
        { title: "\u51FA\u4E0D\u8DB3\u91D1\u5236\u5EA6\u306E\u5EC3\u6B62", summary: "2026\u5E74\u5EA6\u304B\u3089\u51FA\u4E0D\u8DB3\u91D1\u3092\u5EC3\u6B62", details: "\u51FA\u4E0D\u8DB3\u91D1\u306F\u300C\u51FA\u300D=\u53C2\u52A0\u306E\u610F\u5473\u3002\u4E0D\u53C2\u52A0\u8005\u3078\u306E\u30DA\u30CA\u30EB\u30C6\u30A3\u91D1\u3068\u3057\u3066\u904B\u7528\u3057\u3066\u304D\u305F\u304C\u30012025\u5E74\u5EA6\u306E\u7A4D\u7ACB\u91D185,000\u5186\u3092\u5168\u984D\u7D44\u9577\u5009\u5EAB\u8CFC\u5165\u306B\u5145\u5F53\u3057\u3001\u5236\u5EA6\u3092\u5EC3\u6B62\u3002", status: "decided", evidenceLinks: [], isHypothesis: false },
        { title: "\u6CB3\u5DDD\u6E05\u6383\u306E\u7BC4\u56F2\u78BA\u5B9A", summary: "ISY\u96A3\u63A5\u30D3\u30EB\u306E\u6E05\u6383\u7BC4\u56F2\u3092\u660E\u78BA\u5316", details: "\u96A3\u63A5\u3059\u308BISY\u30D3\u30EB\u5468\u8FBA\u306E\u6CB3\u5DDD\u6E05\u6383\u7BC4\u56F2\u306B\u3064\u3044\u3066\u753A\u5185\u4F1A\u9577\u304C\u4EF2\u4ECB\u3002\u696D\u8005\u306B\u3088\u308B\u5BFE\u5FDC\u3067\u89E3\u6C7A\u3002\u30B0\u30EA\u30FC\u30F3\u30D4\u30A2\u306E\u62C5\u5F53\u7BC4\u56F2\u3092\u660E\u78BA\u306B\u3057\u305F\u3002", status: "decided", evidenceLinks: [], isHypothesis: false },
        { title: "\u5C4B\u4E0A\u7ACB\u5165\u7981\u6B62", summary: "\u5C4B\u4E0A\u3078\u306E\u7ACB\u3061\u5165\u308A\u306F\u539F\u5247\u7981\u6B62", details: "\u843D\u4E0B\u4E8B\u6545\u6642\u306E\u6CD5\u7684\u8CAC\u4EFB\u30EA\u30B9\u30AF\u304C\u9AD8\u3044\u305F\u3081\u3001\u539F\u5247\u7ACB\u5165\u7981\u6B62\u3002\u7DCA\u6025\u6642\u306F\u7BA1\u7406\u4F1A\u793E\uFF08\u5E73\u548C\u30CF\u30A6\u30B8\u30F3\u30B0\uFF09\u307E\u305F\u306F\u6D88\u9632\u7F72\u306B\u9023\u7D61\u3002", status: "decided", evidenceLinks: [], isHypothesis: false },
        { title: "\u5C0F\u3055\u306A\u5B50\u4F9B\u304C\u3044\u308B\u5BB6\u5EAD\u306E\u6E05\u6383\u514D\u9664", summary: "\u4E73\u5E7C\u5150\u306E\u3044\u308B\u4E16\u5E2F\u306F\u6CB3\u5DDD\u6E05\u6383\u3092\u514D\u9664", details: "2026\u5E74\u5EA6\u3088\u308A\u3001\u5C0F\u3055\u306A\u304A\u5B50\u3055\u3093\u306E\u3044\u308B\u5BB6\u5EAD\u306F\u6CB3\u5DDD\u6E05\u6383\u3078\u306E\u53C2\u52A0\u3092\u514D\u9664\u3059\u308B\u3002", status: "decided", evidenceLinks: [], isHypothesis: false },
        { title: "\u7D44\u9577\u514D\u9664\u306E\u691C\u8A0E", summary: "\u591C\u52E4\u30FB\u80B2\u5150\u7B49\u306B\u3088\u308B\u7D44\u9577\u514D\u9664\u306E\u53EF\u5426\u3092\u691C\u8A0E\u4E2D", details: "\u591C\u52E4\u5F93\u4E8B\u8005\u3084\u5C0F\u3055\u306A\u5B50\u4F9B\u304C\u3044\u308B\u5BB6\u5EAD\u304B\u3089\u306E\u514D\u9664\u8981\u671B\u3042\u308A\u3002\u7BA1\u7406\u4F1A\u793E\u304B\u3089\u306F\u76F8\u53CD\u3059\u308B\u898B\u89E3\u304C\u51FA\u3066\u304A\u308A\u3001\u4F4F\u6C11\u30A2\u30F3\u30B1\u30FC\u30C8\u3067\u610F\u898B\u3092\u96C6\u7D04\u4E2D\u30022026\u5E743\u6708\u307E\u3067\u306B\u7D50\u8AD6\u3092\u51FA\u3059\u4E88\u5B9A\u3002", status: "draft", evidenceLinks: [], isHypothesis: true },
        { title: "\u7D44\u9577\u9078\u51FA\u306E\u904B\u7528\u7D30\u5247", summary: "\u5165\u5C45\u9806\u30D9\u30FC\u30B9\u306E\u9078\u51FA\u30EB\u30FC\u30EB\u78BA\u5B9A", details: "\u3010\u514D\u9664\u898F\u5B9A\u3011\n\u30FB\u7D44\u9577\u7D4C\u9A13\u8005\uFF1A\u4EFB\u671F\u7D42\u4E86\u7FCC\u6708\u304B\u308924\u30F6\u6708\u514D\u9664\uFF08\u4E0D\u5747\u8861\u306E\u662F\u6B63\uFF09\n\u30FB\u65B0\u898F\u5165\u5C45\u8005\uFF1A\u5165\u5C45\u5F8C12\u30F6\u6708\u514D\u9664\uFF08\u904B\u55B6\u30FB\u884C\u4E8B\u7406\u89E3\u306E\u7336\u4E88\uFF09\n\n\u3010\u9078\u51FA\u512A\u5148\u9806\u4F4D\u3011\n\u2460\u7D44\u9577\u7D4C\u9A13\u56DE\u6570\u306E\u5C11\u306A\u3044\u65B9\uFF080\u56DE\u21921\u56DE\u21922\u56DE\u2026\uFF09\n\u2461\u540C\u56DE\u6570\u5185\u306F\u5165\u5C45\u306E\u53E4\u3044\u65B9\n\u2462\u540C\u6642\u671F\u5165\u5C45\u306F\u90E8\u5C4B\u756A\u53F7\u6607\u9806\n\n\u3010\u5E74\u6B21\u904B\u7528\u3011\n\u30FB11\u6708\uFF1A\u7D44\u9577\u6C7A\u5B9A\u30A2\u30F3\u30B1\u30FC\u30C8\u5B9F\u65BD\u2192\u5019\u88DC\u8005\u30EA\u30B9\u30C8\u4F5C\u6210\u30FB\u56DE\u89A7\n\u30FB12\u6708\uFF1A\u5E73\u548C\u30CF\u30A6\u30B8\u30F3\u30B0\u7167\u4F1A\u2192\u6B63\u5F0F\u6C7A\u5B9A\u2192\u753A\u5185\u4F1A\u3078\u5831\u544A\n\n\u4EE4\u548C7\u5E7411\u67089\u65E5 \u753A\u5185\u4F1A\u9577\u627F\u8A8D\u6E08\u307F\u3002", status: "decided", evidenceLinks: [], isHypothesis: false },
        { title: "\u6CB3\u5DDD\u6E05\u6383\u306E\u53C2\u52A0\u514D\u9664\u57FA\u6E96\uFF08\u63D0\u6848\u4E2D\uFF09", summary: "\u5B89\u5168\u914D\u616E\u306B\u57FA\u3065\u304F\u514D\u9664\u5BFE\u8C61\u306E\u660E\u78BA\u5316", details: "\u3010\u514D\u9664\u5BFE\u8C61\u6848\u3011\n\u30FB\u5C0F\u5B66\u751F\u4EE5\u4E0B\u306E\u5B50\u4F9B\u304C\u3044\u308B\u4E16\u5E2F\n\u30FB\u598A\u5A20\u4E2D\u306E\u65B9\n\u30FB70\u6B73\u4EE5\u4E0A\u306E\u65B9\n\u30FB\u75BE\u75C5\u30FB\u7642\u990A\u30FB\u4ECB\u8B77\u4E2D\u306E\u65B9\n\n\u3010\u624B\u7D9A\u304D\u6848\u3011\n\u30FB11\u6708\u306E\u7D44\u9577\u6C7A\u5B9A\u30A2\u30F3\u30B1\u30FC\u30C8\u3067\u5C4A\u51FA\u53D7\u7406\n\u30FB\u6700\u7D42\u78BA\u8A8D\u306F\u753A\u5185\u4F1A\u9577\u5224\u65AD\n\n\u3010\u4EFB\u610F\u5354\u529B\u91D1\u6848\u3011\n\u30FB100\u301C200\u5186\uFF08\u98F2\u6599\u30FB\u6D88\u8017\u54C1\u76F8\u5F53\uFF09\u3092\u691C\u8A0E\n\n\u4EE4\u548C7\u5E7411\u67089\u65E5 \u753A\u5185\u4F1A\u9577\u3078\u63D0\u6848\u66F8\u63D0\u51FA\u6E08\u307F\u3002\u56DE\u7B54\u5F85\u3061\u3002", status: "draft", evidenceLinks: [], isHypothesis: true },
        { title: "\u753A\u5185\u4F1A\u8CBB\u306E\u5FB4\u53CE\u65B9\u6CD5\u306E\u660E\u78BA\u5316", summary: "\u96C6\u5408\u4F4F\u5B85\u306F\u7BA1\u7406\u4F1A\u793E\u304C\u4E00\u62EC\u5FB4\u53CE", details: "\u4EE4\u548C7\u5E74\u5EA6\u300C\u7D44\u9577\u9854\u5408\u308F\u305B\u4F1A\uFF08\u4FDD\u5B58\u7248\u8CC7\u6599\uFF09\u300D\u306B\u300C\u7D44\u9577\u304C\u753A\u5185\u4F1A\u8CBB\u3092\u5FB4\u53CE\u300D\u3068\u8A18\u8F09\u304C\u3042\u308A\u8AA4\u8A8D\u304C\u767A\u751F\u3002\n\u5B9F\u614B\uFF1A\u96C6\u5408\u4F4F\u5B85\uFF08\u30DE\u30F3\u30B7\u30E7\u30F3\uFF09\u306F\u7BA1\u7406\u4F1A\u793E\uFF08\u5E73\u548C\u30CF\u30A6\u30B8\u30F3\u30B0\uFF09\u304C\u4E00\u62EC\u5FB4\u53CE\u3002\u30DE\u30F3\u30B7\u30E7\u30F3\u7D44\u9577\u306B\u3088\u308B\u5FB4\u53CE\u306F\u4E0D\u8981\u3002\n\u2192\u6B21\u5E74\u5EA6\u8CC7\u6599\u3078\u306E\u8FFD\u8A18\u3092\u63D0\u6848\u6E08\u307F\u3002", status: "decided", evidenceLinks: [], isHypothesis: false }
      ];
      for (const r of rulesData) {
        await db.insert(rules).values(r);
      }
      const templateData = [
        { title: "\u56DE\u89A7\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8", body: "\u30B0\u30EA\u30FC\u30F3\u30D4\u30A2\u713C\u6D25 \u56DE\u89A7\n\n\u65E5\u4ED8: \u4EE4\u548C\u25CB\u5E74\u25CB\u6708\u25CB\u65E5\n\u767A\u4FE1\u8005: \u7D44\u9577\uFF08\u25CB\u53F7\u5BA4\uFF09\n\n\u4EF6\u540D: \u25CB\u25CB\u25CB\u306B\u3064\u3044\u3066\n\n\u672C\u6587:\n\n\u203B\u78BA\u8A8D\u5F8C\u3001\u6B21\u306E\u65B9\u3078\u304A\u56DE\u3057\u304F\u3060\u3055\u3044\u3002\n\u56DE\u89A7\u9806\uFF1A101\u2192102\u2192103\u2192201\u2192202\u2192203\u2192301\u2192302\u2192303", category: "\u9023\u7D61", tags: ["\u56DE\u89A7\u677F"] },
        { title: "\u6CB3\u5DDD\u6E05\u6383\u306E\u304A\u77E5\u3089\u305B", body: "\u6CB3\u5DDD\u6E05\u6383\u306E\u304A\u77E5\u3089\u305B\n\n\u65E5\u6642: \u25CB\u6708\u25CB\u65E5\uFF08\u25CB\uFF09\u5348\u524D8\u6642\u96C6\u5408\n\u5834\u6240: \u30B0\u30EA\u30FC\u30F3\u30D4\u30A2\u7384\u95A2\u524D\n\u6301\u3061\u7269: \u9577\u9774\u3001\u8ECD\u624B\uFF08\u624B\u888B\u306F\u7D44\u9577\u304C\u7528\u610F\u3057\u307E\u3059\uFF09\n\n\u96E8\u5929\u306E\u5834\u5408\u306F\u4E2D\u6B62\u3068\u3057\u3001\u5225\u9014\u9023\u7D61\u3044\u305F\u3057\u307E\u3059\u3002\n\n\u3054\u5354\u529B\u3088\u308D\u3057\u304F\u304A\u9858\u3044\u3044\u305F\u3057\u307E\u3059\u3002\n\n\u7D44\u9577 \u25CB\u53F7\u5BA4", category: "\u9023\u7D61", tags: ["\u6CB3\u5DDD\u6E05\u6383"] },
        { title: "\u7D44\u9577\u5F15\u304D\u7D99\u304E\u30E1\u30E2\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8", body: "\u7D44\u9577\u5F15\u304D\u7D99\u304E\u30E1\u30E2\n\n\u524D\u5E74\u5EA6\u7D44\u9577: \u25CB\u53F7\u5BA4\n\u65B0\u5E74\u5EA6\u7D44\u9577: \u25CB\u53F7\u5BA4\n\u5F15\u304D\u7D99\u304E\u65E5: \u4EE4\u548C\u25CB\u5E74\u25CB\u6708\u25CB\u65E5\n\n\u5F15\u304D\u7D99\u304E\u5185\u5BB9:\n\u25A1 \u7D44\u9577\u5009\u5EAB\u306E\u9375\n\u25A1 \u30AF\u30EA\u30A2\u30D5\u30A1\u30A4\u30EB\uFF08\u8CC7\u6599\u4E00\u5F0F\uFF09\n\u25A1 \u91D1\u92AD\u51FA\u5165\u5E33\n\u25A1 \u56DE\u89A7\u30D5\u30A1\u30A4\u30EB\uFF082\u518A\uFF09\n\n\u7279\u8A18\u4E8B\u9805:\n", category: "\u5F15\u304D\u7D99\u304E", tags: ["\u5F15\u304D\u7D99\u304E"] },
        { title: "\u9632\u707D\u8A13\u7DF4\u306E\u304A\u77E5\u3089\u305B", body: "\u9632\u707D\u8A13\u7DF4\u306E\u304A\u77E5\u3089\u305B\n\n\u65E5\u6642: \u25CB\u6708\u25CB\u65E5\uFF08\u25CB\uFF09\n\u96C6\u5408\u5834\u6240: \u30B0\u30EA\u30FC\u30F3\u30D4\u30A2\u7384\u95A2\u524D\n\u5185\u5BB9: \u907F\u96E3\u7D4C\u8DEF\u78BA\u8A8D\u3001\u6D88\u706B\u5668\u4F7F\u7528\u8A13\u7DF4\n\n\u3054\u53C2\u52A0\u3088\u308D\u3057\u304F\u304A\u9858\u3044\u3044\u305F\u3057\u307E\u3059\u3002\n\n\u7D44\u9577 \u25CB\u53F7\u5BA4", category: "\u9023\u7D61", tags: ["\u9632\u707D\u8A13\u7DF4"] },
        { title: "\u4E16\u5E2F\u8ABF\u67FB\u7968", body: "\u4E16\u5E2F\u5BB6\u65CF\u8ABF\u67FB\u7968\n\n\u90E8\u5C4B\u756A\u53F7: \u25CB\u53F7\u5BA4\n\n\u4E16\u5E2F\u4E3B\u6C0F\u540D:\n\u540C\u5C45\u5BB6\u65CF\u4EBA\u6570:\n\n\u7DCA\u6025\u9023\u7D61\u5148:\n\n\u5099\u8003:\n\n\u203B\u3054\u8A18\u5165\u5F8C\u3001\u7D44\u9577\u306B\u3054\u63D0\u51FA\u304F\u3060\u3055\u3044\u3002", category: "\u5C4A\u51FA", tags: ["\u8ABF\u67FB"] },
        { title: "\u753A\u5185\u4F1A\u9577\u3078\u306E\u63D0\u6848\u66F8\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8", body: "\u4EE4\u548C\u25CB\u5E74\u5EA6\u3000\u25CB\u25CB\u306B\u95A2\u3059\u308B\u63D0\u6848\u66F8\n\n\u5927\u6CC9\u753A\u5185\u4F1A\n\u516B\u753A\u5185\u4F1A \u4F1A\u9577\u3000\u25CB\u25CB \u25CB\u25CB \u69D8\n\n\u4EE4\u548C\u25CB\u5E74\u25CB\u6708\u25CB\u65E5\n\u30B0\u30EA\u30FC\u30F3\u30D4\u30A2\u25CB\u53F7\u5BA4\n8\u7D44 \u7D44\u9577\u3000\u25CB\u25CB \u25CB\u25CB\n\n\u62DD\u5553\u3000\u6642\u4E0B\u307E\u3059\u307E\u3059\u3054\u6E05\u7965\u306E\u3053\u3068\u3068\u304A\u6176\u3073\u7533\u3057\u4E0A\u3052\u307E\u3059\u3002\n\u5E73\u7D20\u3088\u308A\u683C\u5225\u306E\u3054\u9AD8\u914D\u3092\u8CDC\u308A\u3001\u539A\u304F\u5FA1\u793C\u7533\u3057\u4E0A\u3052\u307E\u3059\u3002\n\n\uFF08\u672C\u6587\uFF09\n\n\u4EE5\u4E0A\u3001\u4F55\u5352\u3054\u691C\u8A0E\u306E\u307B\u3069\u3088\u308D\u3057\u304F\u304A\u9858\u3044\u7533\u3057\u4E0A\u3052\u307E\u3059\u3002\n\u656C\u5177\n\n\u9023\u7D61\u5148\n8\u7D44 \u7D44\u9577\u3000\u25CB\u25CB \u25CB\u25CB\uFF08\u30B0\u30EA\u30FC\u30F3\u30D4\u30A2\u25CB\u53F7\u5BA4\uFF09\nTEL\uFF1A\u25CB\u25CB\u25CB-\u25CB\u25CB\u25CB\u25CB-\u25CB\u25CB\u25CB\u25CB\nEmail\uFF1A\u25CB\u25CB\u25CB@\u25CB\u25CB\u25CB.com", category: "\u753A\u5185\u4F1A", tags: ["\u753A\u5185\u4F1A", "\u63D0\u6848\u66F8", "\u6B63\u5F0F\u6587\u66F8"] },
        { title: "\u4F4F\u6C11\u30A2\u30F3\u30B1\u30FC\u30C8\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\uFF08\u7D44\u9577\u904B\u7528\uFF09", body: "8\u7D44 \u30B0\u30EA\u30FC\u30F3\u30D4\u30A2\u5165\u5C45\u8005 \u5404\u4F4D\n\n\u65E5\u9803\u3088\u308A\u3001\u753A\u5185\u4F1A\u6D3B\u52D5\u304A\u3088\u3073\u30DE\u30F3\u30B7\u30E7\u30F3\u5185\u306E\u904B\u55B6\u306B\u3054\u7406\u89E3\u30FB\u3054\u5354\u529B\u3092\u3044\u305F\u3060\u304D\u3001\u3042\u308A\u304C\u3068\u3046\u3054\u3056\u3044\u307E\u3059\u3002\u73FE\u7D44\u9577\u306E\u25CB\u53F7\u5BA4\u30FB\u25CB\u25CB\u3067\u3059\u3002\n\n\uFF08\u80CC\u666F\u8AAC\u660E\uFF09\n\n\u305D\u3053\u3067\u3001\u307E\u305A\u306F\u4F4F\u6C11\u306E\u7686\u3055\u307E\u306E\u5B9F\u60C5\u3084\u304A\u8003\u3048\u3092\u628A\u63E1\u3059\u308B\u305F\u3081\u3001\u30A2\u30F3\u30B1\u30FC\u30C8\u3092\u5B9F\u65BD\u3044\u305F\u3057\u307E\u3059\u3002\u56DE\u7B54\u306F\u4EFB\u610F\u3067\u3001\u7121\u8A18\u540D\u3067\u3082\u69CB\u3044\u307E\u305B\u3093\u3002\u5185\u5BB9\u306F\u96C6\u8A08\u3057\u3001\u500B\u4EBA\u304C\u7279\u5B9A\u3055\u308C\u306A\u3044\u5F62\u3067\u8AD6\u70B9\u3092\u6574\u7406\u3057\u307E\u3059\u3002\n\n\u304A\u624B\u6570\u3067\u3059\u304C\u3001\u30A2\u30F3\u30B1\u30FC\u30C8\u7528\u7D19\u3092\u5C01\u7B52\u306B\u5165\u308C\u3001\u25CB\u53F7\u5BA4\u30DD\u30B9\u30C8\u3078\u6295\u51FD\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n\n\u3010\u63D0\u51FA\u671F\u9650\u3011\u25CB\u5E74\u25CB\u6708\u25CB\u65E5\n\u3010\u63D0\u51FA\u65B9\u6CD5\u3011\u5C01\u7B52\u306B\u5165\u308C\u3066\u25CB\u53F7\u5BA4\u30DD\u30B9\u30C8\u3078\u6295\u51FD\uFF08\u7121\u8A18\u540D\u53EF\uFF09\n\u3010\u554F\u3044\u5408\u308F\u305B\u3011\u73FE\u7D44\u9577\uFF08\u25CB\u53F7\u5BA4\uFF09\u307E\u3067\n\n\u4F4F\u6C11\u540C\u58EB\u304C\u6C17\u307E\u305A\u304F\u306A\u3089\u305A\u3001\u5B89\u5FC3\u3057\u3066\u5C45\u4F4F\u3057\u7D9A\u3051\u3089\u308C\u308B\u74B0\u5883\u3092\u7DAD\u6301\u3059\u308B\u305F\u3081\u306B\u3082\u3001\u7121\u7406\u306E\u306A\u3044\u7BC4\u56F2\u3067\u3054\u5354\u529B\u3044\u305F\u3060\u3051\u307E\u3059\u3068\u5E78\u3044\u3067\u3059\u3002\n\u3069\u3046\u305E\u3088\u308D\u3057\u304F\u304A\u9858\u3044\u3044\u305F\u3057\u307E\u3059\u3002\n\n\u25CB\u5E74\u25CB\u6708\u25CB\u65E5\n8\u7D44 \u30B0\u30EA\u30FC\u30F3\u30D4\u30A2\u3000\u7D44\u9577\u3000\u25CB\u25CB \u25CB\u25CB\n\n\u203B\u672C\u4EF6\u306F\u5951\u7D04\u30FB\u898F\u7D04\u7B49\u306E\u89E3\u91C8\u306B\u95A2\u308F\u308B\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059\u3002\u5FC5\u8981\u306B\u5FDC\u3058\u3001\u8CC3\u8CB8\u501F\u5951\u7D04\u30FB\u91CD\u8981\u4E8B\u9805\u8AAC\u660E\u66F8\u30FB\u7BA1\u7406\u898F\u7D04\u30FB\u81EA\u6CBB\u4F1A\u898F\u7D04\u7B49\u306E\u78BA\u8A8D\u3084\u3001\u5C02\u9580\u5BB6\u3078\u306E\u76F8\u8AC7\u3092\u884C\u3063\u3066\u304F\u3060\u3055\u3044\u3002", category: "\u30A2\u30F3\u30B1\u30FC\u30C8", tags: ["\u30A2\u30F3\u30B1\u30FC\u30C8", "\u4F4F\u6C11\u8ABF\u67FB", "\u7D44\u9577\u904B\u7528"] }
      ];
      for (const t2 of templateData) {
        await db.insert(templates).values(t2);
      }
      const handoverData = [
        { name: "\u7D44\u9577\u5009\u5EAB\u306E\u9375", location: "\u5F15\u304D\u7D99\u304E\u888B", isChecked: false, description: "\u968E\u6BB5\u4E0B\u306E\u7269\u7F6E\u306E\u9375", notes: "\u6B21\u5E74\u5EA6\u7D44\u9577\u3078\u5F15\u304D\u6E21\u3057" },
        { name: "\u30AF\u30EA\u30A2\u30D5\u30A1\u30A4\u30EB", location: "\u5F15\u304D\u7D99\u304E\u888B", isChecked: false, description: "\u5404\u7A2E\u8CC7\u6599\u4E00\u5F0F", notes: "\u901A\u77E5\u6587\u66F8\u3001\u8B70\u4E8B\u9332\u7B49" },
        { name: "\u91D1\u92AD\u51FA\u5165\u5E33", location: "\u5F15\u304D\u7D99\u304E\u888B", isChecked: false, description: "\u51FA\u4E0D\u8DB3\u91D1\u7B49\u306E\u53CE\u652F\u8A18\u9332", notes: "2025\u5E74\u5EA6\u3067\u51FA\u4E0D\u8DB3\u91D1\u306F\u5EC3\u6B62" },
        { name: "\u56DE\u89A7\u30D5\u30A1\u30A4\u30EB\uFF081\u518A\u76EE\uFF09", location: "\u5F15\u304D\u7D99\u304E\u888B", isChecked: false, description: "\u56DE\u89A7\u677F\u7528\u30D5\u30A1\u30A4\u30EB", notes: null },
        { name: "\u56DE\u89A7\u30D5\u30A1\u30A4\u30EB\uFF082\u518A\u76EE\uFF09", location: "\u5F15\u304D\u7D99\u304E\u888B", isChecked: false, description: "\u56DE\u89A7\u677F\u7528\u30D5\u30A1\u30A4\u30EB", notes: null }
      ];
      for (const h of handoverData) {
        await db.insert(handoverBagItems).values(h);
      }
      const scheduleData = [
        { year: 2025, primaryHouseholdId: "102", backupHouseholdId: "103", status: "confirmed", reason: "2025\u5E74\u5EA6\u78BA\u5B9A\uFF08\u73FE\u4EFB\uFF09" },
        { year: 2026, primaryHouseholdId: "203", backupHouseholdId: "301", status: "confirmed", reason: "102:\u514D\u9664B\uFF08\u76F4\u8FD1\u7D44\u9577\uFF09\u3001103/202:\u514D\u9664C\uFF08\u5C31\u4EFB\u56F0\u96E3\uFF09\u3001101/201/302:\u514D\u9664A\uFF08\u5165\u5C4512\u30F6\u6708\u672A\u6E80\uFF09\u2192\u7E70\u4E0A\u3052\u3067203" },
        { year: 2027, primaryHouseholdId: "302", backupHouseholdId: "101", status: "draft", reason: "\u81EA\u52D5\u8A08\u7B97: 0\u56DE\u7D44\u3067\u5165\u5C45\u304C\u53E4\u3044\u9806\u3002102:\u514D\u9664B\u3001203:\u514D\u9664B\u3001103/202:\u514D\u9664C\u60F3\u5B9A" },
        { year: 2028, primaryHouseholdId: "101", backupHouseholdId: "201", status: "draft", reason: "\u81EA\u52D5\u8A08\u7B97: 0\u56DE\u7D44\u3067\u5165\u5C45\u304C\u53E4\u3044\u9806\u3002102:\u514D\u9664B\u671F\u9650\u5207\u308C\u3067\u5FA9\u5E30\u5019\u88DC" }
      ];
      for (const s of scheduleData) {
        await db.insert(leaderSchedule).values(s);
      }
      await db.insert(leaderRotationLogic).values({
        version: 1,
        logic: {
          priority: [
            "\u5165\u5C45\u5E74\u6708\u304C\u53E4\u3044\u9806\uFF08\u57FA\u672C\u65B9\u91DD\uFF09",
            "\u514D\u9664\u5BFE\u8C61\u304C\u767A\u751F\u3057\u305F\u5834\u5408\u306F\u6B21\u306B\u53E4\u3044\u4E16\u5E2F\u3078\u7E70\u4E0A\u3052",
            "\u7D4C\u9A13\u56DE\u6570\u306F\u53C2\u8003\u60C5\u5831\uFF08\u540C\u6761\u4EF6\u3067\u8FF7\u3046\u5834\u5408\u306E\u8AAC\u660E\u6750\u6599\uFF09"
          ],
          excludeConditions: [
            "A: \u5165\u5C4512\u30F6\u6708\u672A\u6E80\uFF08\u81EA\u52D5\u514D\u9664\u3001\u5165\u5C4512\u30F6\u6708\u7D4C\u904E\u306E\u7FCC\u6708\u306B\u81EA\u52D5\u5FA9\u5E30\uFF09",
            "B: \u76F4\u8FD1\u7D44\u9577\uFF08\u4EFB\u671F\u7D42\u4E86\u7FCC\u6708\u304B\u308924\u30F6\u6708\u514D\u9664\uFF09",
            "C: \u5C31\u4EFB\u56F0\u96E3\u7533\u544A\uFF08\u80B2\u5150\u30FB\u5065\u5EB7\u30FB\u4ECB\u8B77\u7B49\u3001\u5E741\u56DE11\u301C12\u6708\u306B\u7D99\u7D9A\u78BA\u8A8D\uFF09"
          ]
        },
        reason: "\u4EE4\u548C7\u5E7411\u67089\u65E5 \u753A\u5185\u4F1A\u9577\u627F\u8A8D\u6E08\u307F\u306E\u904B\u7528\u7D30\u5247\u3002\u30DD\u30FC\u30BF\u30EB\u306B\u306F\u514D\u9664\u7406\u7531\uFF0B\u898B\u76F4\u3057\u6642\u671F\u3092\u5FC5\u305A\u8A18\u8F09\u3002"
      });
      const pendingData = [
        { title: "\u7D44\u9577\u514D\u9664\u30A2\u30F3\u30B1\u30FC\u30C8\u306E\u56DE\u7B54\u96C6\u7D04", description: "\u591C\u52E4\u8005\u30FB\u80B2\u5150\u5BB6\u5EAD\u306E\u7D44\u9577\u514D\u9664\u306B\u95A2\u3059\u308B\u30A2\u30F3\u30B1\u30FC\u30C8\u3092\u5B9F\u65BD\u4E2D\u3002\u56DE\u7B54\u3092\u96C6\u7D04\u3057\u3001\u30AA\u30FC\u30CA\u30FC\u3068\u306E\u4EA4\u6E09\u6750\u6599\u306B\u3059\u308B\u3002", toWhom: "\u5404\u4E16\u5E2F", priority: "high", status: "pending" },
        { title: "\u30AA\u30FC\u30CA\u30FC\u3068\u306E\u7D44\u9577\u5236\u5EA6\u5354\u8B70", description: "\u30A2\u30F3\u30B1\u30FC\u30C8\u7D50\u679C\u3092\u3082\u3068\u306B\u3001\u7D44\u9577\u5236\u5EA6\u306E\u6539\u5584\u6848\u3092\u30AA\u30FC\u30CA\u30FC\uFF08\u7BA1\u7406\u4F1A\u793E\u7D4C\u7531\uFF09\u306B\u63D0\u6848\u4E88\u5B9A\u3002", toWhom: "\u5E73\u548C\u30CF\u30A6\u30B8\u30F3\u30B0\u682A\u5F0F\u4F1A\u793E", priority: "medium", status: "pending" },
        { title: "\u753A\u5185\u4F1A\u9577\u304B\u3089\u306E\u63D0\u6848\u66F8\u56DE\u7B54\u5F85\u3061", description: "\u4EE4\u548C7\u5E7411\u67089\u65E5\u63D0\u51FA\u306E\u7D71\u5408\u63D0\u6848\u66F8\u3078\u306E\u56DE\u7B54\u3002\u6CB3\u5DDD\u6E05\u6383\u514D\u9664\u57FA\u6E96\u30FB\u8349\u5208\u308A\u8CAC\u4EFB\u6240\u5728\u30FB\u5468\u77E5\u6539\u5584\u306B\u3064\u3044\u306612\u6708\u4E2D\u306E\u65B9\u5411\u6027\u63D0\u793A\u3092\u4F9D\u983C\u6E08\u307F\u3002", toWhom: "\u4E2D\u5C71\u88D5\u4E8C \u4F1A\u9577\uFF08\u5927\u6CC9\u753A\u5185\u4F1A\uFF09", priority: "high", status: "pending" },
        { title: "\u4F4F\u6C11\u30A2\u30F3\u30B1\u30FC\u30C8\u56DE\u7B54\u306E\u96C6\u7D04\uFF082/28\u671F\u9650\uFF09", description: "2026\u5E742\u67084\u65E5\u914D\u5E03\u306E\u7D44\u9577\u904B\u7528\u30A2\u30F3\u30B1\u30FC\u30C8\u3002\u63D0\u51FA\u671F\u96502/28\u3002\u56DE\u7B54\u3092\u96C6\u7D04\u3057\u3001\u30AA\u30FC\u30CA\u30FC\u3078\u306E\u7533\u3057\u5165\u308C\u6750\u6599\u3068\u3057\u3066\u6574\u7406\u3059\u308B\u3002Q6\u306E\u904B\u7528\u65B9\u5411\u6027\uFF08A/B/C/D\uFF09\u306E\u96C6\u8A08\u304C\u7279\u306B\u91CD\u8981\u3002", toWhom: "\u5404\u4E16\u5E2F\uFF089\u4E16\u5E2F\uFF09", priority: "high", status: "pending" },
        { title: "\u7BA1\u7406\u4F1A\u793E\u304B\u3089\u306E\u5BFE\u5FDC\u56DE\u7B54\u5F85\u3061", description: "\u7279\u5B9A\u5165\u5C45\u8005\u306E\u72EC\u81EA\u898B\u89E3\uFF08\u514D\u9664\u5168\u5426\u5B9A\u30FB\u9000\u53BB\u767A\u8A00\u7B49\uFF09\u306B\u3064\u3044\u3066\u7BA1\u7406\u4F1A\u793E\u3078\u76F8\u8AC7\u6E08\u307F\u3002\u516C\u5F0F\u306A\u8AAC\u660E\u30FB\u6307\u5C0E\u306E\u5B9F\u65BD\u3092\u4F9D\u983C\u4E2D\u3002", toWhom: "\u5E73\u548C\u30CF\u30A6\u30B8\u30F3\u30B0\u682A\u5F0F\u4F1A\u793E", priority: "high", status: "pending" }
      ];
      for (const p of pendingData) {
        await db.insert(pendingQueue).values(p);
      }
      const postsData = [
        { title: "\u7D44\u9577\u5009\u5EAB\u306E\u8A2D\u7F6E", body: "\u7D44\u9577\u306E\u5099\u54C1\u4FDD\u7BA1\u5834\u6240\u304C\u306A\u304F\u3001\u500B\u4EBA\u5B85\u3067\u306E\u4FDD\u7BA1\u304C\u8CA0\u62C5\u306B\u306A\u3063\u3066\u3044\u305F\u554F\u984C\u3092\u89E3\u6C7A\u3002\u51FA\u4E0D\u8DB3\u91D1\u306E\u7A4D\u7ACB\u91D185,000\u5186\u3092\u5168\u984D\u4F7F\u7528\u3057\u3001\u30A8\u30F3\u30C8\u30E9\u30F3\u30B9\u6A2A\u306E\u968E\u6BB5\u4E0B\u306B\u5C02\u7528\u7269\u7F6E\u3092\u8CFC\u5165\u30FB\u8A2D\u7F6E\u3002\u7D041\u7573\u3001\u8170\u9AD8\u30B5\u30A4\u30BA\u3002", tags: ["\u8A2D\u5099", "\u89E3\u6C7A\u6E08\u307F"], year: 2025, category: "improvement", status: "published", isHypothesis: false, relatedLinks: [], publishedAt: /* @__PURE__ */ new Date("2025-06-01") },
        { title: "\u6CB3\u5DDD\u6E05\u6383\u7BC4\u56F2\u306E\u7D1B\u4E89\u89E3\u6C7A", body: "\u96A3\u63A5\u3059\u308BISY\u30D3\u30EB\u5468\u8FBA\u306E\u6CB3\u5DDD\u6E05\u6383\u7BC4\u56F2\u306B\u3064\u3044\u3066\u7D1B\u4E89\u304C\u767A\u751F\u3002\u753A\u5185\u4F1A\u9577\u304C\u4EF2\u4ECB\u306B\u5165\u308A\u3001\u696D\u8005\u306B\u3088\u308B\u6E05\u6383\u3067\u89E3\u6C7A\u3002\u30B0\u30EA\u30FC\u30F3\u30D4\u30A2\u306E\u62C5\u5F53\u7BC4\u56F2\u3092\u660E\u78BA\u306B\u3057\u305F\u3002", tags: ["\u6CB3\u5DDD\u6E05\u6383", "\u89E3\u6C7A\u6E08\u307F"], year: 2025, category: "trouble", status: "published", isHypothesis: false, relatedLinks: [], publishedAt: /* @__PURE__ */ new Date("2025-07-15") },
        { title: "\u5C4B\u4E0A\u30A2\u30AF\u30BB\u30B9\u8981\u8ACB\u3078\u306E\u5BFE\u5FDC", body: "\u4F4F\u6C11\u304B\u3089\u5C4B\u4E0A\u3078\u306E\u7ACB\u3061\u5165\u308A\u8981\u8ACB\u3042\u308A\u3002\u6CD5\u7684\u30EA\u30B9\u30AF\uFF08\u843D\u4E0B\u4E8B\u6545\u6642\u306E\u8CAC\u4EFB\uFF09\u3092\u8AAC\u660E\u3057\u3001\u539F\u5247\u7981\u6B62\u3068\u3057\u305F\u3002\u7DCA\u6025\u6642\u306F\u7BA1\u7406\u4F1A\u793E\u307E\u305F\u306F\u6D88\u9632\u7F72\u306B\u9023\u7D61\u3059\u308B\u904B\u7528\u306B\u3002", tags: ["\u5B89\u5168", "\u89E3\u6C7A\u6E08\u307F"], year: 2025, category: "decision", status: "published", isHypothesis: false, relatedLinks: [], publishedAt: /* @__PURE__ */ new Date("2025-08-20") },
        { title: "\u6CB3\u5DDD\u5824\u9632\u8349\u5208\u308A\u306E\u5BFE\u5FDC", body: "\u9ED2\u77F3\u5DDD\u5824\u9632\u306E\u8349\u5208\u308A\u306B\u3064\u3044\u3066\u3001\u5730\u4E3B\u304C\u3044\u308B\u571F\u5730\u306E\u305F\u3081\u76F4\u63A5\u306E\u4F5C\u696D\u306F\u4E0D\u53EF\u3002\u5730\u4E3B\u304C\u696D\u8005\u3092\u624B\u914D\u3057\u3066\u5BFE\u5FDC\u5B8C\u4E86\u3002\u30DE\u30F3\u30B7\u30E7\u30F3\u4F4F\u6C11\u306E\u4F5C\u696D\u306F\u4E0D\u8981\u3068\u78BA\u8A8D\u3002", tags: ["\u6CB3\u5DDD\u6E05\u6383", "\u89E3\u6C7A\u6E08\u307F"], year: 2025, category: "decision", status: "published", isHypothesis: false, relatedLinks: [], publishedAt: /* @__PURE__ */ new Date("2025-09-25") },
        { title: "\u7D44\u9577\u514D\u9664\u5236\u5EA6\u306E\u691C\u8A0E\uFF08\u9032\u884C\u4E2D\uFF09", body: "\u591C\u52E4\u5F93\u4E8B\u8005\u3084\u5C0F\u3055\u306A\u5B50\u4F9B\u304C\u3044\u308B\u5BB6\u5EAD\u304B\u3089\u7D44\u9577\u514D\u9664\u306E\u8981\u671B\u3042\u308A\u3002\u7BA1\u7406\u4F1A\u793E\uFF08\u5E73\u548C\u30CF\u30A6\u30B8\u30F3\u30B0\uFF09\u304B\u3089\u306F\u76F8\u53CD\u3059\u308B\u898B\u89E3\u304C\u51FA\u3066\u304A\u308A\u3001\u4F4F\u6C11\u30A2\u30F3\u30B1\u30FC\u30C8\u3092\u5B9F\u65BD\u3057\u3066\u610F\u898B\u3092\u96C6\u7D04\u4E2D\u30022026\u5E743\u6708\u307E\u3067\u306B\u7D50\u8AD6\u3092\u51FA\u3059\u4E88\u5B9A\u3002", tags: ["\u7D44\u9577\u5236\u5EA6", "\u9032\u884C\u4E2D"], year: 2025, category: "pending", status: "published", isHypothesis: true, relatedLinks: [], publishedAt: /* @__PURE__ */ new Date("2025-11-01") },
        { title: "\u753A\u5185\u4F1A\u9577\u3078\u306E\u7D71\u5408\u63D0\u6848\u66F8\u3092\u63D0\u51FA", body: "\u4EE4\u548C7\u5E7411\u67089\u65E5\u3001\u5927\u6CC9\u753A\u5185\u4F1A\u516B\u753A\u5185\u4F1A\u4F1A\u9577\uFF08\u4E2D\u5C71\u88D5\u4E8C\u69D8\uFF09\u5B9B\u3066\u306B\u300C\u7D44\u9577\u696D\u52D9\u6539\u5584\u306B\u95A2\u3059\u308B\u7D71\u5408\u63D0\u6848\u66F8\u300D\u3092\u63D0\u51FA\u3002\n\n\u63D0\u6848\u5185\u5BB9\uFF1A\n1. \u7D44\u9577\u9078\u51FA\u30EB\u30FC\u30EB\u306E\u78BA\u5B9A\uFF08\u904B\u7528\u7D30\u5247\u306E\u7B56\u5B9A\u5831\u544A\uFF09\n2. \u6CB3\u5DDD\u6E05\u6383\u306E\u5B89\u5168\u914D\u616E\u3068\u53C2\u52A0\u514D\u9664\u57FA\u6E96\n3. \u6CB3\u5DDD\u8349\u5208\u308A\u4F5C\u696D\u306E\u8CAC\u4EFB\u6240\u5728\u78BA\u8A8D\n4. \u5468\u77E5\u4E8B\u9805\u306E\u6539\u5584\uFF08\u753A\u5185\u4F1A\u8CBB\u5FB4\u53CE\u306E\u660E\u78BA\u5316\u3001\u6E05\u6383\u7BC4\u56F2\u306E\u53EF\u8996\u5316\uFF09\n\n12\u6708\u4E2D\u306B\u65B9\u5411\u6027\u306E\u56DE\u7B54\u3092\u4F9D\u983C\u3002\u6700\u7D42\u78BA\u5B9A\u306F\u4EE4\u548C8\u5E743\u6708\u672B\u3002", tags: ["\u753A\u5185\u4F1A", "\u63D0\u6848\u66F8", "\u7D44\u9577\u5236\u5EA6"], year: 2025, category: "decision", status: "published", isHypothesis: false, relatedLinks: [], publishedAt: /* @__PURE__ */ new Date("2025-11-09") },
        { title: "\u7BA1\u7406\u4F1A\u793E\u3078\u7279\u5B9A\u5165\u5C45\u8005\u5BFE\u5FDC\u3092\u76F8\u8AC7", body: "\u7279\u5B9A\u306E\u5165\u5C45\u8005\u304B\u3089\u7D44\u9577\u514D\u9664\u306E\u5168\u5426\u5B9A\u3084\u300C\u7D44\u9577\u3092\u3057\u306A\u3044\u306A\u3089\u9000\u53BB\u3059\u3079\u304D\u300D\u3068\u3044\u3046\u8DA3\u65E8\u306E\u5F37\u3044\u610F\u898B\u304C\u8907\u6570\u56DE\u6587\u66F8\u3067\u793A\u3055\u308C\u305F\u305F\u3081\u3001\u7BA1\u7406\u4F1A\u793E\uFF08\u5E73\u548C\u30CF\u30A6\u30B8\u30F3\u30B0\uFF09\u3078\u516C\u5F0F\u306A\u8AAC\u660E\u30FB\u6307\u5C0E\u3092\u4F9D\u983C\u3002\n\u7D44\u9577\u696D\u52D9\u306E\u30ED\u30FC\u30C6\u30FC\u30B7\u30E7\u30F3\u4F4D\u7F6E\u3065\u3051\u3001\u514D\u9664\u306E\u8003\u3048\u65B9\u3001\u9000\u53BB\u4E91\u3005\u306F\u6B63\u5F0F\u30EB\u30FC\u30EB\u3067\u306F\u306A\u3044\u3053\u3068\u306E3\u70B9\u306B\u3064\u3044\u3066\u8AAC\u660E\u3092\u8981\u8ACB\u3002\u56DE\u7B54\u5F85\u3061\u3002\n\u203B\u8A72\u5F53\u53F7\u5BA4\u306F\u79D8\u533F\uFF08\u79D8\u533F\u30E1\u30E2\u53C2\u7167\uFF09", tags: ["\u7BA1\u7406\u4F1A\u793E", "\u4F4F\u6C11\u5BFE\u5FDC", "\u9032\u884C\u4E2D"], year: 2025, category: "trouble", status: "published", isHypothesis: false, relatedLinks: [], publishedAt: /* @__PURE__ */ new Date("2026-01-15") },
        { title: "\u4F4F\u6C11\u30A2\u30F3\u30B1\u30FC\u30C8\u3092\u914D\u5E03", body: "2026\u5E742\u67084\u65E5\u3001\u51689\u4E16\u5E2F\u306B\u7D44\u9577\u904B\u7528\u306B\u95A2\u3059\u308B\u30A2\u30F3\u30B1\u30FC\u30C8\u3092\u914D\u5E03\u3002\n\n\u4E3B\u306A\u8CEA\u554F\u5185\u5BB9:\n\u30FB\u7D44\u9577\u696D\u52D9\u306E\u8CA0\u62C5\u611F\n\u30FB\u7D44\u9577\u4F1A\u3084\u6CB3\u5DDD\u6E05\u6383\u3078\u306E\u53C2\u52A0\u53EF\u5426\n\u30FB\u4ECA\u5F8C\u306E\u904B\u7528\u65B9\u5411\u6027\uFF08\u4F4F\u6C11\u6301\u3061\u56DE\u308A/\u30AA\u30FC\u30CA\u30FC\u62C5\u5F53/\u6298\u8877\u6848\uFF09\n\u30FB\u5F15\u304D\u7D99\u304E\u65B9\u6CD5\u306E\u6539\u5584\n\n\u80CC\u666F\u3068\u3057\u3066\u3001\u753A\u5185\u4F1A\u9577\u304B\u3089\u306E\u30AA\u30FC\u30CA\u30FC\u5074\u904B\u7528\u3078\u306E\u793A\u5506\u3001\u4ED6\u30DE\u30F3\u30B7\u30E7\u30F3\u5B9F\u4F8B\uFF0821\u7D44\u7B49\uFF09\u3001\u7BA1\u7406\u4F1A\u793E\u306E\u4E0D\u95A2\u4E0E\u30B9\u30BF\u30F3\u30B9\u3092\u5171\u6709\u3002\n\u63D0\u51FA\u671F\u9650: 2026\u5E742\u670828\u65E5\u3002\u56DE\u7B54\u3092\u96C6\u7D04\u3057\u3001\u30AA\u30FC\u30CA\u30FC\u3078\u306E\u7533\u3057\u5165\u308C\u6750\u6599\u3068\u3059\u308B\u4E88\u5B9A\u3002", tags: ["\u30A2\u30F3\u30B1\u30FC\u30C8", "\u7D44\u9577\u5236\u5EA6", "\u4F4F\u6C11\u8ABF\u67FB"], year: 2025, category: "decision", status: "published", isHypothesis: false, relatedLinks: [], publishedAt: /* @__PURE__ */ new Date("2026-02-04") }
      ];
      for (const p of postsData) {
        await db.insert(posts).values(p);
      }
      const riverCleaningData = [
        { date: /* @__PURE__ */ new Date("2025-04-20"), participantsCount: 15, issues: null, whatWorked: "\u9ED2\u77F3\u5DDD\u5468\u8FBA\u306E\u6E05\u6383\u3092\u73ED\u5206\u3051\u3057\u3066\u52B9\u7387\u7684\u306B\u5B9F\u65BD", whatToImprove: null, attachments: [], linkedInventoryIds: [] },
        { date: /* @__PURE__ */ new Date("2025-07-06"), participantsCount: 12, issues: null, whatWorked: "\u524D\u56DE\u306E\u7D4C\u9A13\u3092\u6D3B\u304B\u3057\u30B9\u30E0\u30FC\u30BA\u306B\u9032\u884C", whatToImprove: null, attachments: [], linkedInventoryIds: [] }
      ];
      for (const r of riverCleaningData) {
        await db.insert(riverCleaningRuns).values(r);
      }
      const vaultData = [
        { category: "\u7BA1\u7406", key: "\u7D44\u9577\u5009\u5EAB \u9375\u306E\u5834\u6240", maskedValue: "\u7D44\u9577\u304C\u7BA1\u7406", actualValue: "\u7D44\u9577\u304C\u4FDD\u7BA1\u3002\u5F15\u304D\u7D99\u304E\u6642\u306B\u6B21\u5E74\u5EA6\u7D44\u9577\u3078\u6E21\u3059", classification: "internal" },
        { category: "\u7BA1\u7406", key: "\u7BA1\u7406\u4F1A\u793E\u9023\u7D61\u5148", maskedValue: "\u5E73\u548C\u30CF\u30A6\u30B8\u30F3\u30B0", actualValue: "\u5E73\u548C\u30CF\u30A6\u30B8\u30F3\u30B0\u682A\u5F0F\u4F1A\u793E\uFF08\u8A73\u7D30\u306F\u5F15\u304D\u7D99\u304E\u8CC7\u6599\u53C2\u7167\uFF09", classification: "internal" },
        { category: "\u30DD\u30FC\u30BF\u30EB", key: "\u30DD\u30FC\u30BF\u30EB\u30B5\u30A4\u30C8\u7BA1\u7406", maskedValue: "****", actualValue: "kumicho-portal.vercel.app\uFF08\u7BA1\u7406\u60C5\u5831\u306F\u5225\u9014\uFF09", classification: "confidential" },
        { category: "\u753A\u5185\u4F1A", key: "\u753A\u5185\u4F1A\u9577 \u9023\u7D61\u5148", maskedValue: "\u4E2D\u5C71\u69D8", actualValue: "\u5927\u6CC9\u753A\u5185\u4F1A \u516B\u753A\u5185\u4F1A \u4F1A\u9577 \u4E2D\u5C71\u88D5\u4E8C\u69D8\uFF08\u8A73\u7D30\u306F\u5F15\u304D\u7D99\u304E\u8CC7\u6599\u53C2\u7167\uFF09", classification: "internal" }
      ];
      for (const v of vaultData) {
        await db.insert(vaultEntries).values(v);
      }
      const secretNotesData = [
        { title: "\u7D44\u9577\u514D\u9664\u554F\u984C\u306E\u7D4C\u7DEF\u30E1\u30E2", body: "\u591C\u52E4\u8005\u3068\u5C0F\u3055\u306A\u5B50\u4F9B\u304C\u3044\u308B\u5BB6\u5EAD\u304B\u3089\u514D\u9664\u8981\u671B\u3042\u308A\u3002\u7BA1\u7406\u4F1A\u793E\u304B\u3089\u306F\u300C\u514D\u9664\u306F\u8A8D\u3081\u3089\u308C\u306A\u3044\u300D\u3068\u300C\u76F8\u8AC7\u3057\u3066\u304F\u3060\u3055\u3044\u300D\u306E\u4E21\u65B9\u306E\u898B\u89E3\u304C\u51FA\u3066\u304A\u308A\u7D71\u4E00\u3055\u308C\u3066\u3044\u306A\u3044\u3002\u4F4F\u6C11\u30A2\u30F3\u30B1\u30FC\u30C8\u3092\u5B9F\u65BD\u3057\u30013\u6708\u307E\u3067\u306B\u65B9\u91DD\u3092\u6C7A\u3081\u308B\u5FC5\u8981\u304C\u3042\u308B\u3002\u30AA\u30FC\u30CA\u30FC\u3068\u306E\u6700\u7D42\u4EA4\u6E09\u306F\u7BA1\u7406\u4F1A\u793E\u7D4C\u7531\u3067\u884C\u3046\u4E88\u5B9A\u3002" },
        { title: "ISY\u6CB3\u5DDD\u6E05\u6383\u7D1B\u4E89\u306E\u8A18\u9332", body: "\u96A3\u63A5\u3059\u308BISY\u30D3\u30EB\u5468\u8FBA\u306E\u6E05\u6383\u7BC4\u56F2\u3067\u7D1B\u4E89\u767A\u751F\u3002\u753A\u5185\u4F1A\u9577\u306B\u76F8\u8AC7\u3057\u4EF2\u4ECB\u3057\u3066\u3082\u3089\u3063\u305F\u3002\u6700\u7D42\u7684\u306B\u696D\u8005\u5BFE\u5FDC\u3067\u89E3\u6C7A\u3002\u4ECA\u5F8C\u540C\u69D8\u306E\u554F\u984C\u304C\u8D77\u304D\u305F\u5834\u5408\u306F\u753A\u5185\u4F1A\u9577\u3092\u901A\u3059\u306E\u304C\u6709\u52B9\u3002" },
        { title: "\u7D71\u5408\u63D0\u6848\u66F8\u306E\u5168\u6587\u8A18\u9332\uFF08\u4EE4\u548C7\u5E7411\u67089\u65E5\uFF09", body: "\u4EE4\u548C7\u5E74\u5EA6 \u7D44\u9577\u696D\u52D9\u6539\u5584\u306B\u95A2\u3059\u308B\u7D71\u5408\u63D0\u6848\u66F8\n\u5B9B\u5148: \u5927\u6CC9\u753A\u5185\u4F1A \u516B\u753A\u5185\u4F1A \u4F1A\u9577 \u4E2D\u5C71\u88D5\u4E8C\u69D8\n\u63D0\u51FA\u65E5: \u4EE4\u548C7\u5E7411\u67089\u65E5\n\u63D0\u51FA\u8005: \u30B0\u30EA\u30FC\u30F3\u30D4\u30A2102\u53F7\u5BA4 8\u7D44\u7D44\u9577 \u91CE\u7530\u8AA0\u7D00\n\n\u3010\u63D0\u6848\u5185\u5BB9\u3011\n1. \u7D44\u9577\u9078\u51FA\u30EB\u30FC\u30EB\u306E\u78BA\u5B9A\uFF08\u904B\u7528\u7D30\u5247\u306E\u7B56\u5B9A\u5831\u544A\uFF09\n - \u514D\u9664\u898F\u5B9A: \u7D4C\u9A13\u800524\u30F6\u6708\u514D\u9664\u3001\u65B0\u5165\u5C45\u800512\u30F6\u6708\u514D\u9664\n - \u512A\u5148\u9806\u4F4D: \u7D4C\u9A13\u56DE\u6570\u5C11\u2192\u5165\u5C45\u53E4\u2192\u90E8\u5C4B\u756A\u53F7\u6607\u9806\n - \u5E74\u6B21\u904B\u7528: 11\u6708\u30A2\u30F3\u30B1\u30FC\u30C8\u219212\u6708\u78BA\u5B9A\u2192\u5831\u544A\n\n2. \u6CB3\u5DDD\u6E05\u6383\u306E\u5B89\u5168\u914D\u616E\u3068\u53C2\u52A0\u514D\u9664\u57FA\u6E96\n - \u514D\u9664\u5BFE\u8C61\u6848: \u5C0F\u5B66\u751F\u4EE5\u4E0B\u540C\u4F34/\u598A\u5A20\u4E2D/70\u6B73\u4EE5\u4E0A/\u75BE\u75C5\u30FB\u4ECB\u8B77\n - \u4EFB\u610F\u5354\u529B\u91D1100-200\u5186\u3092\u691C\u8A0E\n - \u51FA\u4E0D\u8DB3\u91D1\u306F\u5EC3\u6B62\u6E08\u307F\uFF0885,000\u5186\u2192\u5009\u5EAB\u8CFC\u5165\u306B\u5145\u5F53\uFF09\n\n3. \u6CB3\u5DDD\u8349\u5208\u308A\u4F5C\u696D\u306E\u8CAC\u4EFB\u6240\u5728\u78BA\u8A8D\n - \u7BA1\u7406\u4F1A\u793E\u306F\u95A2\u4E0E\u306A\u3057\u3001\u696D\u8005\u4F5C\u696D\u30921\u56DE\u78BA\u8A8D\n - \u753A\u5185\u4F1A\u306E\u65B9\u91DD\u3092\u78BA\u8A8D\u4E2D\n\n4. \u5468\u77E5\u4E8B\u9805\u306E\u6539\u5584\n - \u753A\u5185\u4F1A\u8CBB: \u30DE\u30F3\u30B7\u30E7\u30F3\u306F\u7BA1\u7406\u4F1A\u793E\u4E00\u62EC\u5FB4\u53CE\uFF08\u7D44\u9577\u4E0D\u8981\uFF09\n - \u6E05\u6383\u7BC4\u56F2: \u30DE\u30F3\u30B7\u30E7\u30F3\u524D\u533A\u9593\u3092\u57FA\u672C\u62C5\u5F53\u306B\u5909\u66F4\u63D0\u6848\n\n\u56DE\u7B54\u671F\u9650: 12\u6708\u4E2D\uFF08\u6700\u7D42\u78BA\u5B9A3\u6708\u672B\uFF09" },
        { title: "\u7BA1\u7406\u4F1A\u793E\u3078\u306E\u76F8\u8AC7\u30E1\u30FC\u30EB\u8A18\u9332\uFF08\u7279\u5B9A\u5165\u5C45\u8005\u5BFE\u5FDC\uFF09", body: "\u3010\u5B9B\u5148\u3011\u5E73\u548C\u30CF\u30A6\u30B8\u30F3\u30B0\u682A\u5F0F\u4F1A\u793E \u9759\u5CA1\u5E97 \u5CA1\u672C\u69D8\n\u3010\u767A\u4FE1\u8005\u3011102\u53F7\u5BA4 \u91CE\u7530\n\u3010\u4EF6\u540D\u3011\u7279\u5B9A\u5165\u5C45\u8005\u3078\u306E\u5BFE\u5FDC\u3054\u76F8\u8AC7\n\n\u3010\u6982\u8981\u3011\n\u7279\u5B9A\u306E\u5165\u5C45\u8005\u304B\u3089\u3001\u7D44\u9577\u696D\u52D9\u3084\u514D\u9664\u306E\u904B\u7528\u306B\u95A2\u3057\u3066\u5F37\u3044\u72EC\u81EA\u898B\u89E3\u304C\u8907\u6570\u56DE\u306B\u308F\u305F\u308A\u6587\u66F8\u3067\u793A\u3055\u308C\u3066\u3044\u308B\u3002\n\n\u4E3B\u306A\u5185\u5BB9:\n\u30FB\u3044\u304B\u306A\u308B\u4E8B\u60C5\uFF08\u80B2\u5150\u30FB\u4ECB\u8B77\u30FB\u5065\u5EB7\uFF09\u3067\u3042\u3063\u3066\u3082\u7D44\u9577\u514D\u9664\u306F\u8A8D\u3081\u308B\u3079\u304D\u3067\u306F\u306A\u3044\u3068\u3044\u3046\u4E3B\u5F35\n\u30FB\u753A\u5185\u4F1A\u3067\u691C\u8A0E\u3057\u305F\u514D\u9664\u6848\u30FB\u30ED\u30FC\u30C6\u30FC\u30B7\u30E7\u30F3\u6848\u306E\u5168\u5426\u5B9A\n\u30FB\u300C\u7D44\u9577\u3092\u3084\u3089\u306A\u3044\u306A\u3089\u9000\u53BB\u3059\u3079\u304D\u300D\u3068\u3044\u3046\u8DA3\u65E8\u306E\u8868\u73FE\n\n\u3053\u308C\u3089\u306F\u4E00\u5165\u5C45\u8005\u306E\u7ACB\u5834\u304B\u3089\u306E\u767A\u8A00\u3067\u3042\u308A\u3001\u9000\u53BB\u306E\u53EF\u5426\u3092\u5224\u65AD\u3067\u304D\u308B\u7ACB\u5834\u306B\u306A\u3044\u65B9\u304B\u3089\u306E\u767A\u8A00\u3068\u3057\u3066\u306F\u884C\u304D\u904E\u304E\u3002\n\u5F53\u8A72\u5165\u5C45\u8005\u306F\u7BA1\u7406\u4F1A\u793E\u30FB\u30AA\u30FC\u30CA\u30FC\u304B\u3089\u306E\u8AAC\u660E\u306B\u306F\u5F93\u3046\u65B9\u3068\u8A8D\u8B58\u3057\u3066\u304A\u308A\u3001\u6A29\u9650\u3092\u6301\u3064\u7BA1\u7406\u4F1A\u793E\u304B\u3089\u516C\u5F0F\u306B\u8AAC\u660E\u30FB\u6307\u5C0E\u3044\u305F\u3060\u304F\u3088\u3046\u4F9D\u983C\u3002\n\n\u3010\u8981\u8ACB\u4E8B\u9805\u3011\n1. \u7D44\u9577\u696D\u52D9\u3084\u30ED\u30FC\u30C6\u30FC\u30B7\u30E7\u30F3\u306E\u4F4D\u7F6E\u3065\u3051\u306E\u8AAC\u660E\n2. \u514D\u9664\u306E\u8003\u3048\u65B9\uFF08\u80B2\u5150\u30FB\u4ECB\u8B77\u30FB\u5065\u5EB7\u30FB\u65B0\u5165\u5C45\u30FB\u76F4\u8FD1\u7D44\u9577\u7B49\uFF09\u306E\u8AAC\u660E\n3. \u300C\u7D44\u9577\u3092\u3057\u306A\u3044\uFF1D\u9000\u53BB\u300D\u306F\u672C\u7269\u4EF6\u306E\u6B63\u5F0F\u30EB\u30FC\u30EB\u3067\u306F\u306A\u3044\u3053\u3068\u306E\u8AAC\u660E\n\n\u203B\u53F7\u5BA4\u756A\u53F7\u306F\u79D8\u533F\u3002\u8A73\u7D30\u306F\u6DFB\u4ED8\u30B9\u30AD\u30E3\u30F3\u753B\u50CF\u53C2\u7167\u3002" },
        { title: "\u4F4F\u6C11\u30A2\u30F3\u30B1\u30FC\u30C8\u5168\u6587\uFF082026\u5E742\u67084\u65E5\u914D\u5E03\uFF09", body: "\u3010\u914D\u5E03\u65E5\u30112026\u5E742\u67084\u65E5\n\u3010\u63D0\u51FA\u671F\u9650\u30112026\u5E742\u670828\u65E5\n\u3010\u63D0\u51FA\u65B9\u6CD5\u3011\u5C01\u7B52\u306B\u5165\u308C\u3066102\u53F7\u5BA4\u30DD\u30B9\u30C8\u3078\u6295\u51FD\uFF08\u7121\u8A18\u540D\u53EF\uFF09\n\n\u3010\u30AB\u30D0\u30FC\u30EC\u30BF\u30FC\u8981\u65E8\u3011\n\u30FB\u6CB3\u5DDD\u6E05\u6383\u306E\u7BC4\u56F2\u304C\u30DE\u30F3\u30B7\u30E7\u30F3\u524D\u306B\u7E2E\u5C0F\u3055\u308C\u308B\u898B\u8FBC\u307F\uFF08\u753A\u5185\u4F1A\u9577\u304B\u3089\u306E\u5171\u6709\uFF09\n\u30FB2025\u5E74\u5EA6\u306B\u904B\u7528\u4E0A\u306E\u8AD6\u70B9\uFF08\u7D44\u9577\u9078\u51FA\u30FB\u514D\u9664\u30FB\u51FA\u4E0D\u8DB3\u91D1\uFF09\u3067\u4F4F\u6C11\u9593\u306E\u8A8D\u8B58\u306E\u5206\u304B\u308C\u304C\u8907\u6570\u767A\u751F\n\u30FB\u753A\u5185\u4F1A\u9577\u304B\u3089\u306E\u793A\u5506: \u30AA\u30FC\u30CA\u30FC\u5074\u304C\u7D44\u9577\u696D\u52D9\u3092\u62C5\u3046\u65B9\u5411\u306E\u691C\u8A0E\n\u30FB\u7BA1\u7406\u4F1A\u793E\uFF08\u5E73\u548C\u30CF\u30A6\u30B8\u30F3\u30B0\uFF09\u306F\u753A\u5185\u4F1A\u6D3B\u52D5\u3078\u306E\u95A2\u4E0E\u3092\u884C\u308F\u306A\u3044\u30B9\u30BF\u30F3\u30B9\n\n\u3010\u5225\u7D19B: \u80CC\u666F\u5171\u6709 6\u9805\u76EE\u3011\n1. 2025\u5E74\u5EA6\u306E\u4E3B\u306A\u8AD6\u70B9\uFF08\u7D44\u9577\u9078\u51FA\u30FB\u6CB3\u5DDD\u6E05\u6383\u7BC4\u56F2\u30FB\u51FA\u4E0D\u8DB3\u91D1\uFF09\n2. \u753A\u5185\u4F1A\u5074\u306E\u8A8D\u8B58\uFF08\u78BA\u8A8D\u5BFE\u5FDC\u306E\u96C6\u4E2D\u304C\u554F\u984C\uFF09\n3. \u6CB3\u5DDD\u6E05\u6383\u306EISY\u524D\u7BC4\u56F2\u306E\u9032\u6357\uFF08\u95A2\u4FC2\u5148\u304C\u696D\u8005\u624B\u914D\u30FB\u8CBB\u7528\u8CA0\u62C5\uFF09\n4. \u4ED6\u30DE\u30F3\u30B7\u30E7\u30F3\u5B9F\u4F8B\uFF0821\u7D44\u7B49: \u30AA\u30FC\u30CA\u30FC\u5074\u304C\u5F79\u5272\u3092\u62C5\u3046\uFF09\n5. \u7BA1\u7406\u4F1A\u793E\u30B9\u30BF\u30F3\u30B9\uFF08\u95A2\u4E0E\u3057\u306A\u3044\uFF09\n6. \u7D44\u9577\u696D\u52D9\u306E\u5B9F\u614B\uFF08\u8CA0\u62C5\u611F\uFF09\n\n\u3010\u5225\u7D19C: \u30A2\u30F3\u30B1\u30FC\u30C8\u8CEA\u554F 8\u554F\u3011\nQ1. \u7D44\u9577\u7D4C\u9A13\u306E\u6709\u7121\nQ2. \u7D44\u9577\u696D\u52D9\u306E\u8CA0\u62C5\u611F\uFF085\u6BB5\u968E\uFF09\nQ3. \u7D44\u9577\u4F1A\uFF08\u6BCE\u670826\u65E519:00\uFF09\u3078\u306E\u53C2\u52A0\u53EF\u5426\nQ4. \u6CB3\u5DDD\u6E05\u6383\uFF08\u571F\u65E5\u671D8:00-9:00\uFF09\u3078\u306E\u53C2\u52A0\u53EF\u5426\nQ5. \u8CA0\u62C5\u304C\u5927\u304D\u3044\u3068\u611F\u3058\u308B\u696D\u52D9\uFF08\u8907\u6570\u9078\u629E\uFF09\nQ6. \u4ECA\u5F8C\u306E\u904B\u7528\u65B9\u5411\u6027\uFF08A:\u4F4F\u6C11\u6301\u3061\u56DE\u308A / B:\u30AA\u30FC\u30CA\u30FC\u62C5\u5F53 / C:\u6298\u8877\u6848 / D:\u308F\u304B\u3089\u306A\u3044\uFF09\nQ7. \u5F15\u304D\u7D99\u304E\u306E\u6539\u5584\uFF08\u7D19+Web / Web\u4E2D\u5FC3 / \u7D19\u4E2D\u5FC3\uFF09\nQ8. \u81EA\u7531\u8A18\u8F09" }
      ];
      for (const s of secretNotesData) {
        await db.insert(secretNotes).values(s);
      }
      const [surveyForm] = await db.insert(forms).values({
        title: "\u7D44\u9577\u904B\u7528\u306B\u95A2\u3059\u308B\u30A2\u30F3\u30B1\u30FC\u30C8",
        description: "\u7D44\u9577\u9078\u51FA\u65B9\u6CD5\u30FB\u753A\u5185\u4F1A\u5BFE\u5FDC\u306E\u904B\u7528\u30EB\u30FC\u30EB\u30FB\u5F79\u5272\u5206\u62C5\u306E\u65B9\u5411\u6027\u306B\u3064\u3044\u3066\u306E\u30A2\u30F3\u30B1\u30FC\u30C8\u3067\u3059\u30022026\u5E742\u67084\u65E5\u914D\u5E03\u3002",
        dueDate: /* @__PURE__ */ new Date("2026-02-28"),
        status: "active"
      }).returning();
      const [q1] = await db.insert(formQuestions).values({
        formId: surveyForm.id,
        questionText: "\u7D44\u9577\u7D4C\u9A13\u306B\u3064\u3044\u3066",
        questionType: "single_choice",
        required: true,
        orderIndex: 1
      }).returning();
      await db.insert(formChoices).values([
        { questionId: q1.id, choiceText: "\u306A\u3044\uFF08\u672A\u7D4C\u9A13\uFF09", orderIndex: 1 },
        { questionId: q1.id, choiceText: "\u3042\u308B\uFF08\u7D4C\u9A13\u3042\u308A\uFF09", orderIndex: 2 },
        { questionId: q1.id, choiceText: "\u308F\u304B\u3089\u306A\u3044", orderIndex: 3 }
      ]);
      const [q2] = await db.insert(formQuestions).values({
        formId: surveyForm.id,
        questionText: "\u7D44\u9577\u696D\u52D9\u306E\u8CA0\u62C5\u611F\uFF08\u30A4\u30E1\u30FC\u30B8\u3067\u3082\u53EF\uFF09",
        questionType: "single_choice",
        required: true,
        orderIndex: 2
      }).returning();
      await db.insert(formChoices).values([
        { questionId: q2.id, choiceText: "\u304B\u306A\u308A\u91CD\u3044", orderIndex: 1 },
        { questionId: q2.id, choiceText: "\u91CD\u3044", orderIndex: 2 },
        { questionId: q2.id, choiceText: "\u3075\u3064\u3046", orderIndex: 3 },
        { questionId: q2.id, choiceText: "\u8EFD\u3044", orderIndex: 4 },
        { questionId: q2.id, choiceText: "\u308F\u304B\u3089\u306A\u3044", orderIndex: 5 }
      ]);
      const [q3] = await db.insert(formQuestions).values({
        formId: surveyForm.id,
        questionText: "\u7D44\u9577\u4F1A\uFF08\u6BCE\u670826\u65E519:00\u301C\uFF09\u3078\u306E\u53C2\u52A0\u306E\u96E3\u3057\u3055",
        questionType: "single_choice",
        required: true,
        orderIndex: 3
      }).returning();
      await db.insert(formChoices).values([
        { questionId: q3.id, choiceText: "\u53C2\u52A0\u3067\u304D\u308B", orderIndex: 1 },
        { questionId: q3.id, choiceText: "\u6761\u4EF6\u306B\u3088\u308A\u53C2\u52A0\u3067\u304D\u308B", orderIndex: 2 },
        { questionId: q3.id, choiceText: "\u53C2\u52A0\u304C\u96E3\u3057\u3044", orderIndex: 3 },
        { questionId: q3.id, choiceText: "\u308F\u304B\u3089\u306A\u3044", orderIndex: 4 }
      ]);
      const [q4] = await db.insert(formQuestions).values({
        formId: surveyForm.id,
        questionText: "\u6CB3\u5DDD\u6E05\u6383\uFF08\u571F\u66DC/\u65E5\u66DC \u671D8:00\u301C9:00\uFF09\u3078\u306E\u53C2\u52A0\u306E\u96E3\u3057\u3055",
        questionType: "single_choice",
        required: true,
        orderIndex: 4
      }).returning();
      await db.insert(formChoices).values([
        { questionId: q4.id, choiceText: "\u53C2\u52A0\u3067\u304D\u308B", orderIndex: 1 },
        { questionId: q4.id, choiceText: "\u6761\u4EF6\u306B\u3088\u308A\u53C2\u52A0\u3067\u304D\u308B", orderIndex: 2 },
        { questionId: q4.id, choiceText: "\u53C2\u52A0\u304C\u96E3\u3057\u3044", orderIndex: 3 },
        { questionId: q4.id, choiceText: "\u308F\u304B\u3089\u306A\u3044", orderIndex: 4 }
      ]);
      const [q5] = await db.insert(formQuestions).values({
        formId: surveyForm.id,
        questionText: "\u7D44\u9577\u696D\u52D9\u306E\u3046\u3061\u300C\u8CA0\u62C5\u304C\u5927\u304D\u3044\u300D\u3068\u611F\u3058\u308B\u3082\u306E\uFF08\u8907\u6570\u9078\u629E\u53EF\uFF09",
        questionType: "multiple_choice",
        required: false,
        orderIndex: 5
      }).returning();
      await db.insert(formChoices).values([
        { questionId: q5.id, choiceText: "\u753A\u5185\u4F1A\u30FB\u7BA1\u7406\u4F1A\u793E\u3068\u306E\u9023\u7D61\u8ABF\u6574", orderIndex: 1 },
        { questionId: q5.id, choiceText: "\u4F4F\u6C11\u3078\u306E\u5468\u77E5\uFF08\u914D\u5E03\u7269\u4F5C\u6210\u3001\u5404\u6238\u6295\u51FD\u7B49\uFF09", orderIndex: 2 },
        { questionId: q5.id, choiceText: "\u4F4F\u6C11\u610F\u898B\u306E\u6574\u7406\uFF08\u554F\u3044\u5408\u308F\u305B\u5BFE\u5FDC\u3001\u8ABF\u6574\u7B49\uFF09", orderIndex: 3 },
        { questionId: q5.id, choiceText: "\u6B21\u5E74\u5EA6\u7D44\u9577\u306E\u9078\u51FA\u30FB\u5F15\u304D\u7D99\u304E\u5BFE\u5FDC", orderIndex: 4 },
        { questionId: q5.id, choiceText: "\u7D44\u9577\u4F1A\u3078\u306E\u53C2\u52A0\uFF08\u591C\u9593\u306E\u56FA\u5B9A\u65E5\u6642\uFF09", orderIndex: 5 },
        { questionId: q5.id, choiceText: "\u6CB3\u5DDD\u6E05\u6383\u7B49\u306E\u753A\u5185\u884C\u4E8B\u5BFE\u5FDC\uFF08\u65E9\u671D\u5E2F\uFF09", orderIndex: 6 },
        { questionId: q5.id, choiceText: "\u4E0A\u8A18\u3059\u3079\u3066", orderIndex: 7 }
      ]);
      const [q6] = await db.insert(formQuestions).values({
        formId: surveyForm.id,
        questionText: "\u4ECA\u5F8C\u306E\u904B\u7528\u306E\u65B9\u5411\u6027\u306B\u3064\u3044\u3066\u3001\u6700\u3082\u8FD1\u3044\u3082\u306E\u30921\u3064\u9078\u3093\u3067\u304F\u3060\u3055\u3044",
        questionType: "single_choice",
        required: true,
        orderIndex: 6
      }).returning();
      await db.insert(formChoices).values([
        { questionId: q6.id, choiceText: "A\uFF1A\u4F4F\u6C11\u306E\u6301\u3061\u56DE\u308A\u3092\u57FA\u672C\u306B\u3001\u5916\u90E8\u30FB\u5185\u90E8\u5BFE\u5FDC\u3068\u3082\u4F4F\u6C11\u5074\u3067\u5BFE\u5FDC", orderIndex: 1 },
        { questionId: q6.id, choiceText: "B\uFF1A\u30AA\u30FC\u30CA\u30FC\u5074\u304C\u5916\u90E8\u30FB\u5185\u90E8\u5BFE\u5FDC\u3068\u3082\u62C5\u3046\uFF08\u5916\u90E8\u59D4\u8A17\u542B\u3080\uFF09", orderIndex: 2 },
        { questionId: q6.id, choiceText: "C\uFF1A\u6298\u8877\u6848\uFF08\u5916\u90E8\u5BFE\u5FDC\u3068\u5185\u90E8\u5BFE\u5FDC\u3092\u4F4F\u6C11\u30FB\u30AA\u30FC\u30CA\u30FC\u3067\u5206\u62C5\uFF09", orderIndex: 3 },
        { questionId: q6.id, choiceText: "D\uFF1A\u308F\u304B\u3089\u306A\u3044\uFF0F\u5224\u65AD\u6750\u6599\u304C\u8DB3\u308A\u306A\u3044", orderIndex: 4 }
      ]);
      const [q7] = await db.insert(formQuestions).values({
        formId: surveyForm.id,
        questionText: "\u5F15\u304D\u7D99\u304E\u306E\u6539\u5584\uFF08\u624B\u9806\u306E\u898B\u3048\u308B\u5316\uFF09\u306B\u3064\u3044\u3066",
        questionType: "single_choice",
        required: true,
        orderIndex: 7
      }).returning();
      await db.insert(formChoices).values([
        { questionId: q7.id, choiceText: "\u7D19\uFF0BWeb\u306E\u4F75\u7528\u304C\u3088\u3044", orderIndex: 1 },
        { questionId: q7.id, choiceText: "Web\u4E2D\u5FC3\u304C\u3088\u3044", orderIndex: 2 },
        { questionId: q7.id, choiceText: "\u7D19\u4E2D\u5FC3\u304C\u3088\u3044", orderIndex: 3 },
        { questionId: q7.id, choiceText: "\u308F\u304B\u3089\u306A\u3044", orderIndex: 4 }
      ]);
      const [cleaningForm] = await db.insert(forms).values({
        title: "\u6CB3\u5DDD\u6E05\u6383 \u51FA\u6B20\u78BA\u8A8D",
        description: "\u6B21\u56DE\u306E\u6CB3\u5DDD\u6E05\u6383\u3078\u306E\u53C2\u52A0\u53EF\u5426\u3092\u78BA\u8A8D\u3057\u307E\u3059\u3002",
        status: "draft"
      }).returning();
      const [cq1] = await db.insert(formQuestions).values({
        formId: cleaningForm.id,
        questionText: "\u6B21\u56DE\u306E\u6CB3\u5DDD\u6E05\u6383\u306B\u53C2\u52A0\u3067\u304D\u307E\u3059\u304B\uFF1F",
        questionType: "single_choice",
        required: true,
        orderIndex: 1
      }).returning();
      await db.insert(formChoices).values([
        { questionId: cq1.id, choiceText: "\u53C2\u52A0\u3059\u308B", orderIndex: 1 },
        { questionId: cq1.id, choiceText: "\u53C2\u52A0\u3067\u304D\u306A\u3044", orderIndex: 2 },
        { questionId: cq1.id, choiceText: "\u672A\u5B9A", orderIndex: 3 }
      ]);
      const [cq2] = await db.insert(formQuestions).values({
        formId: cleaningForm.id,
        questionText: "\u53C2\u52A0\u3067\u304D\u306A\u3044\u5834\u5408\u3001\u7406\u7531\u3092\u6559\u3048\u3066\u304F\u3060\u3055\u3044",
        questionType: "single_choice",
        required: false,
        orderIndex: 2
      }).returning();
      await db.insert(formChoices).values([
        { questionId: cq2.id, choiceText: "\u4ED5\u4E8B", orderIndex: 1 },
        { questionId: cq2.id, choiceText: "\u4F53\u8ABF\u4E0D\u826F", orderIndex: 2 },
        { questionId: cq2.id, choiceText: "\u5BB6\u5EAD\u306E\u4E8B\u60C5", orderIndex: 3 },
        { questionId: cq2.id, choiceText: "\u305D\u306E\u4ED6", orderIndex: 4 }
      ]);
      await db.insert(changelog).values({
        summary: "\u30B0\u30EA\u30FC\u30F3\u30D4\u30A2\u713C\u6D25\u30DD\u30FC\u30BF\u30EB\u521D\u671F\u30C7\u30FC\u30BF\u6295\u5165\u5B8C\u4E86",
        date: /* @__PURE__ */ new Date(),
        relatedEntityType: "system",
        relatedEntityId: null
      });
      return { success: true, message: "\u30B7\u30FC\u30C9\u30C7\u30FC\u30BF\u3092\u6295\u5165\u3057\u307E\u3057\u305F", skipped: false };
    })
  }),
  // Member トップ用 API
  memberTop: router({
    getSummary: publicProcedure.input(z2.object({ year: z2.number() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const summary = await db.select().from(memberTopSummary).where(eq2(memberTopSummary.year, input.year)).limit(1);
      return summary[0] || null;
    }),
    getLeaderSchedule: publicProcedure.input(z2.object({ year: z2.number().optional() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const currentYear = input.year || (/* @__PURE__ */ new Date()).getFullYear();
      const schedules = await db.select().from(leaderSchedule).where(and(gte(leaderSchedule.year, currentYear), lte(leaderSchedule.year, currentYear + 8))).orderBy(asc(leaderSchedule.year));
      return schedules;
    }),
    getPendingQueue: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const pending = await db.select().from(pendingQueue).where(eq2(pendingQueue.status, "pending")).orderBy(desc2(pendingQueue.priority), asc(pendingQueue.createdAt));
      return pending;
    })
  }),
  // ローテ管理 API
  leaderRotation: router({
    calculateNextYear: publicProcedure.input(z2.object({ year: z2.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const logicRecords = await db.select().from(leaderRotationLogic).orderBy(desc2(leaderRotationLogic.version)).limit(1);
      const logic = logicRecords[0]?.logic;
      if (!logic) throw new Error("No rotation logic defined");
      const allHouseholds = await db.select().from(households);
      const prevYear = input.year - 1;
      const prevScheduleArray = await db.select().from(leaderSchedule).where(eq2(leaderSchedule.year, prevYear)).limit(1);
      const prevSchedule = prevScheduleArray[0];
      const exemptions = await db.select().from(exemptionRequests).where(
        and(
          eq2(exemptionRequests.year, input.year),
          eq2(exemptionRequests.status, "approved")
        )
      );
      const exemptedHouseholds = new Set(exemptions.map((e) => e.householdId));
      const candidates = allHouseholds.filter((h) => !exemptedHouseholds.has(h.householdId)).sort((a, b) => {
        const aYearsSinceLast = prevSchedule ? prevSchedule.primaryHouseholdId === a.householdId ? 1 : 999 : 999;
        const bYearsSinceLast = prevSchedule ? prevSchedule.primaryHouseholdId === b.householdId ? 1 : 999 : 999;
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
        reason: `\u81EA\u52D5\u8A08\u7B97: \u524D\u56DE\u62C5\u5F53\u304B\u3089\u306E\u7D4C\u904E\u5E74\u6570\u3001\u5165\u5C45\u958B\u59CB\u65E5\u3001\u4F4F\u6238ID\u6607\u9806\u3067\u9078\u5B9A`
      });
      await logChange(`${input.year}\u5E74\u5EA6\u30ED\u30FC\u30C6\u3092\u81EA\u52D5\u8A08\u7B97`, "leaderSchedule");
      return {
        success: true,
        primary: primary.householdId,
        backup: backup.householdId
      };
    }),
    confirm: publicProcedure.input(z2.object({ scheduleId: z2.number(), status: z2.enum(["conditional", "confirmed"]) })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(leaderSchedule).set({ status: input.status }).where(eq2(leaderSchedule.id, input.scheduleId));
      await logChange(`\u30ED\u30FC\u30C6\u30B9\u30C6\u30FC\u30BF\u30B9\u3092\u300C${input.status}\u300D\u306B\u5909\u66F4`, "leaderSchedule", input.scheduleId);
      return { success: true };
    }),
    updateLogic: publicProcedure.input(
      z2.object({
        priority: z2.array(z2.string()),
        excludeConditions: z2.array(z2.string()),
        reason: z2.string()
      })
    ).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const latestLogic = await db.select().from(leaderRotationLogic).orderBy(desc2(leaderRotationLogic.version)).limit(1);
      const nextVersion = (latestLogic[0]?.version || 0) + 1;
      await db.insert(leaderRotationLogic).values({
        version: nextVersion,
        logic: {
          priority: input.priority,
          excludeConditions: input.excludeConditions
        },
        reason: input.reason
      });
      await logChange(`\u30ED\u30FC\u30C6\u30ED\u30B8\u30C3\u30AF v${nextVersion} \u3092\u66F4\u65B0`, "leaderRotationLogic");
      return { success: true, version: nextVersion };
    })
  }),
  // 検索機能
  search: router({
    global: publicProcedure.input(z2.object({ query: z2.string().min(1) })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const searchTerm = `%${input.query}%`;
      try {
        const results = await Promise.all([
          db.select().from(posts).where(or(like(posts.title, searchTerm), like(posts.body, searchTerm))).limit(5),
          db.select().from(inventory).where(or(like(inventory.name, searchTerm), like(inventory.notes, searchTerm))).limit(5),
          db.select().from(rules).where(or(like(rules.title, searchTerm), like(rules.details, searchTerm))).limit(5),
          db.select().from(faq).where(or(like(faq.question, searchTerm), like(faq.answer, searchTerm))).limit(5),
          db.select().from(templates).where(or(like(templates.title, searchTerm), like(templates.body, searchTerm))).limit(5)
        ]);
        return {
          posts: results[0],
          inventory: results[1],
          rules: results[2],
          faq: results[3],
          templates: results[4]
        };
      } catch (error) {
        console.error("Search error:", error);
        return [];
      }
    })
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
    updateFAQ: publicProcedure.input(
      z2.object({
        id: z2.number(),
        question: z2.string().min(1).optional(),
        answer: z2.string().min(1).optional()
      })
    ).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      const updateData = { updatedAt: /* @__PURE__ */ new Date() };
      if (input.question !== void 0) updateData.question = input.question;
      if (input.answer !== void 0) updateData.answer = input.answer;
      await db.update(faq).set(updateData).where(eq2(faq.id, input.id));
      await logChange(`FAQ (ID: ${input.id}) \u3092\u66F4\u65B0`, "faq", input.id);
      return { success: true };
    }),
    deleteFAQ: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      await db.delete(faq).where(eq2(faq.id, input.id));
      await logChange(`FAQ (ID: ${input.id}) \u3092\u524A\u9664`, "faq", input.id);
      return { success: true };
    }),
    getPosts: publicProcedure.input(z2.object({ year: z2.number().optional() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const currentYear = input.year || (/* @__PURE__ */ new Date()).getFullYear();
      return await db.select().from(posts).where(eq2(posts.year, currentYear)).orderBy(desc2(posts.updatedAt));
    }),
    getChangelog: publicProcedure.input(z2.object({ limit: z2.number().default(50) })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(changelog).orderBy(desc2(changelog.date)).limit(input.limit);
    }),
    getSecretNotes: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(secretNotes).orderBy(desc2(secretNotes.updatedAt));
    }),
    getHandoverBagItems: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(handoverBagItems).orderBy(asc(handoverBagItems.name));
    }),
    createHandoverBagItem: publicProcedure.input(z2.object({
      name: z2.string().min(1),
      description: z2.string().optional(),
      location: z2.string().min(1),
      notes: z2.string().optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [item] = await db.insert(handoverBagItems).values({
        name: input.name,
        description: input.description || null,
        location: input.location,
        notes: input.notes || null,
        isChecked: false
      }).returning();
      await logChange(`\u5F15\u304D\u7D99\u304E\u888B\u300C${input.name}\u300D\u3092\u8FFD\u52A0`, "handoverBagItems", item.id);
      return item;
    }),
    updateHandoverBagItem: publicProcedure.input(z2.object({
      id: z2.number(),
      name: z2.string().min(1).optional(),
      description: z2.string().optional(),
      location: z2.string().min(1).optional(),
      notes: z2.string().optional(),
      isChecked: z2.boolean().optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const updateData = { updatedAt: /* @__PURE__ */ new Date() };
      if (input.name !== void 0) updateData.name = input.name;
      if (input.description !== void 0) updateData.description = input.description;
      if (input.location !== void 0) updateData.location = input.location;
      if (input.notes !== void 0) updateData.notes = input.notes;
      if (input.isChecked !== void 0) updateData.isChecked = input.isChecked;
      await db.update(handoverBagItems).set(updateData).where(eq2(handoverBagItems.id, input.id));
      await logChange(`\u5F15\u304D\u7D99\u304E\u888B\u30A2\u30A4\u30C6\u30E0 (ID: ${input.id}) \u3092\u66F4\u65B0`, "handoverBagItems", input.id);
      return { success: true };
    }),
    deleteHandoverBagItem: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(handoverBagItems).where(eq2(handoverBagItems.id, input.id));
      await logChange(`\u5F15\u304D\u7D99\u304E\u888B\u30A2\u30A4\u30C6\u30E0 (ID: ${input.id}) \u3092\u524A\u9664`, "handoverBagItems", input.id);
      return { success: true };
    }),
    // PendingQueue CRUD
    getPendingQueueAll: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(pendingQueue).orderBy(desc2(pendingQueue.createdAt));
    }),
    createPendingQueueItem: publicProcedure.input(z2.object({
      title: z2.string().min(1),
      description: z2.string().min(1),
      toWhom: z2.string().min(1),
      priority: z2.enum(["low", "medium", "high"]).default("medium")
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [item] = await db.insert(pendingQueue).values({
        title: input.title,
        description: input.description,
        toWhom: input.toWhom,
        priority: input.priority,
        status: "pending"
      }).returning();
      await logChange(`\u8FD4\u4FE1\u5F85\u3061\u300C${input.title}\u300D\u3092\u8FFD\u52A0`, "pendingQueue", item.id);
      return item;
    }),
    updatePendingQueueItem: publicProcedure.input(z2.object({
      id: z2.number(),
      title: z2.string().min(1).optional(),
      description: z2.string().optional(),
      toWhom: z2.string().optional(),
      priority: z2.enum(["low", "medium", "high"]).optional(),
      status: z2.enum(["pending", "resolved", "transferred"]).optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const updateData = { updatedAt: /* @__PURE__ */ new Date() };
      if (input.title !== void 0) updateData.title = input.title;
      if (input.description !== void 0) updateData.description = input.description;
      if (input.toWhom !== void 0) updateData.toWhom = input.toWhom;
      if (input.priority !== void 0) updateData.priority = input.priority;
      if (input.status !== void 0) {
        updateData.status = input.status;
        if (input.status === "resolved") updateData.resolvedAt = /* @__PURE__ */ new Date();
      }
      await db.update(pendingQueue).set(updateData).where(eq2(pendingQueue.id, input.id));
      await logChange(`\u8FD4\u4FE1\u5F85\u3061 (ID: ${input.id}) \u3092\u66F4\u65B0`, "pendingQueue", input.id);
      return { success: true };
    }),
    deletePendingQueueItem: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(pendingQueue).where(eq2(pendingQueue.id, input.id));
      await logChange(`\u8FD4\u4FE1\u5F85\u3061 (ID: ${input.id}) \u3092\u524A\u9664`, "pendingQueue", input.id);
      return { success: true };
    }),
    // Vault Entries CRUD
    getVaultEntries: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(vaultEntries).orderBy(asc(vaultEntries.category));
    }),
    createVaultEntry: publicProcedure.input(z2.object({
      category: z2.string().min(1),
      key: z2.string().min(1),
      maskedValue: z2.string().min(1),
      actualValue: z2.string().min(1)
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [entry] = await db.insert(vaultEntries).values({
        category: input.category,
        key: input.key,
        maskedValue: input.maskedValue,
        actualValue: input.actualValue
      }).returning();
      await logChange(`Vault\u300C${input.key}\u300D\u3092\u8FFD\u52A0`, "vaultEntries", entry.id);
      return entry;
    }),
    updateVaultEntry: publicProcedure.input(z2.object({
      id: z2.number(),
      category: z2.string().optional(),
      key: z2.string().optional(),
      maskedValue: z2.string().optional(),
      actualValue: z2.string().optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const updateData = { updatedAt: /* @__PURE__ */ new Date() };
      if (input.category !== void 0) updateData.category = input.category;
      if (input.key !== void 0) updateData.key = input.key;
      if (input.maskedValue !== void 0) updateData.maskedValue = input.maskedValue;
      if (input.actualValue !== void 0) updateData.actualValue = input.actualValue;
      await db.update(vaultEntries).set(updateData).where(eq2(vaultEntries.id, input.id));
      await logChange(`Vault (ID: ${input.id}) \u3092\u66F4\u65B0`, "vaultEntries", input.id);
      return { success: true };
    }),
    deleteVaultEntry: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(vaultEntries).where(eq2(vaultEntries.id, input.id));
      await logChange(`Vault (ID: ${input.id}) \u3092\u524A\u9664`, "vaultEntries", input.id);
      return { success: true };
    }),
    // Audit Logs
    getAuditLogs: publicProcedure.input(z2.object({ limit: z2.number().default(100) })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(auditLogs).orderBy(desc2(auditLogs.timestamp)).limit(input.limit);
    }),
    // Secret Notes CRUD
    createSecretNote: publicProcedure.input(z2.object({ title: z2.string().min(1), body: z2.string().min(1) })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [note] = await db.insert(secretNotes).values({
        title: input.title,
        body: input.body
      }).returning();
      await logChange(`\u79D8\u533F\u30E1\u30E2\u300C${input.title}\u300D\u3092\u8FFD\u52A0`, "secretNotes", note.id);
      return note;
    }),
    updateSecretNote: publicProcedure.input(z2.object({ id: z2.number(), title: z2.string().optional(), body: z2.string().optional() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const updateData = { updatedAt: /* @__PURE__ */ new Date() };
      if (input.title !== void 0) updateData.title = input.title;
      if (input.body !== void 0) updateData.body = input.body;
      await db.update(secretNotes).set(updateData).where(eq2(secretNotes.id, input.id));
      await logChange(`\u79D8\u533F\u30E1\u30E2 (ID: ${input.id}) \u3092\u66F4\u65B0`, "secretNotes", input.id);
      return { success: true };
    }),
    deleteSecretNote: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(secretNotes).where(eq2(secretNotes.id, input.id));
      await logChange(`\u79D8\u533F\u30E1\u30E2 (ID: ${input.id}) \u3092\u524A\u9664`, "secretNotes", input.id);
      return { success: true };
    }),
    // Events CRUD
    createEvent: publicProcedure.input(z2.object({
      title: z2.string().min(1),
      date: z2.string(),
      category: z2.string().min(1),
      notes: z2.string().optional(),
      checklist: z2.array(z2.object({ id: z2.string(), text: z2.string(), completed: z2.boolean() })).optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [event] = await db.insert(events).values({
        title: input.title,
        date: new Date(input.date),
        category: input.category,
        checklist: input.checklist || [],
        notes: input.notes || null,
        attachments: []
      }).returning();
      await logChange(`\u30A4\u30D9\u30F3\u30C8\u300C${input.title}\u300D\u3092\u8FFD\u52A0`, "events", event.id);
      return event;
    }),
    updateEvent: publicProcedure.input(z2.object({
      id: z2.number(),
      title: z2.string().optional(),
      date: z2.string().optional(),
      category: z2.string().optional(),
      notes: z2.string().optional(),
      checklist: z2.array(z2.object({ id: z2.string(), text: z2.string(), completed: z2.boolean() })).optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const updateData = { updatedAt: /* @__PURE__ */ new Date() };
      if (input.title !== void 0) updateData.title = input.title;
      if (input.date !== void 0) updateData.date = new Date(input.date);
      if (input.category !== void 0) updateData.category = input.category;
      if (input.notes !== void 0) updateData.notes = input.notes;
      if (input.checklist !== void 0) updateData.checklist = input.checklist;
      await db.update(events).set(updateData).where(eq2(events.id, input.id));
      await logChange(`\u30A4\u30D9\u30F3\u30C8 (ID: ${input.id}) \u3092\u66F4\u65B0`, "events", input.id);
      return { success: true };
    }),
    deleteEvent: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(events).where(eq2(events.id, input.id));
      await logChange(`\u30A4\u30D9\u30F3\u30C8 (ID: ${input.id}) \u3092\u524A\u9664`, "events", input.id);
      return { success: true };
    }),
    // Inventory CRUD
    createInventoryItem: publicProcedure.input(z2.object({
      name: z2.string().min(1),
      qty: z2.number().default(0),
      location: z2.string().min(1),
      condition: z2.string().optional(),
      photo: z2.string().optional(),
      notes: z2.string().optional(),
      tags: z2.array(z2.string()).default([])
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [item] = await db.insert(inventory).values({
        name: input.name,
        qty: input.qty,
        location: input.location,
        condition: input.condition || null,
        photo: input.photo || null,
        notes: input.notes || null,
        tags: input.tags
      }).returning();
      await logChange(`\u5099\u54C1\u300C${input.name}\u300D\u3092\u8FFD\u52A0`, "inventory", item.id);
      return item;
    }),
    updateInventoryItem: publicProcedure.input(z2.object({
      id: z2.number(),
      name: z2.string().optional(),
      qty: z2.number().optional(),
      location: z2.string().optional(),
      condition: z2.string().optional(),
      photo: z2.string().optional(),
      notes: z2.string().optional(),
      tags: z2.array(z2.string()).optional(),
      lastCheckedAt: z2.string().optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const updateData = { updatedAt: /* @__PURE__ */ new Date() };
      if (input.name !== void 0) updateData.name = input.name;
      if (input.qty !== void 0) updateData.qty = input.qty;
      if (input.location !== void 0) updateData.location = input.location;
      if (input.condition !== void 0) updateData.condition = input.condition;
      if (input.photo !== void 0) updateData.photo = input.photo;
      if (input.notes !== void 0) updateData.notes = input.notes;
      if (input.tags !== void 0) updateData.tags = input.tags;
      if (input.lastCheckedAt !== void 0) updateData.lastCheckedAt = new Date(input.lastCheckedAt);
      await db.update(inventory).set(updateData).where(eq2(inventory.id, input.id));
      await logChange(`\u5099\u54C1 (ID: ${input.id}) \u3092\u66F4\u65B0`, "inventory", input.id);
      return { success: true };
    }),
    deleteInventoryItem: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(inventory).where(eq2(inventory.id, input.id));
      await logChange(`\u5099\u54C1 (ID: ${input.id}) \u3092\u524A\u9664`, "inventory", input.id);
      return { success: true };
    }),
    // FAQ Create
    createFAQ: publicProcedure.input(z2.object({
      question: z2.string().min(1),
      answer: z2.string().min(1),
      relatedRuleIds: z2.array(z2.number()).default([]),
      relatedPostIds: z2.array(z2.number()).default([])
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [item] = await db.insert(faq).values({
        question: input.question,
        answer: input.answer,
        relatedRuleIds: input.relatedRuleIds,
        relatedPostIds: input.relatedPostIds
      }).returning();
      await logChange(`FAQ\u300C${input.question}\u300D\u3092\u8FFD\u52A0`, "faq", item.id);
      return item;
    }),
    // Templates CRUD
    createTemplate: publicProcedure.input(z2.object({
      title: z2.string().min(1),
      body: z2.string().min(1),
      category: z2.string().min(1),
      tags: z2.array(z2.string()).default([])
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [item] = await db.insert(templates).values({
        title: input.title,
        body: input.body,
        category: input.category,
        tags: input.tags
      }).returning();
      await logChange(`\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\u300C${input.title}\u300D\u3092\u8FFD\u52A0`, "templates", item.id);
      return item;
    }),
    updateTemplate: publicProcedure.input(z2.object({
      id: z2.number(),
      title: z2.string().optional(),
      body: z2.string().optional(),
      category: z2.string().optional(),
      tags: z2.array(z2.string()).optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const updateData = { updatedAt: /* @__PURE__ */ new Date() };
      if (input.title !== void 0) updateData.title = input.title;
      if (input.body !== void 0) updateData.body = input.body;
      if (input.category !== void 0) updateData.category = input.category;
      if (input.tags !== void 0) updateData.tags = input.tags;
      await db.update(templates).set(updateData).where(eq2(templates.id, input.id));
      await logChange(`\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8 (ID: ${input.id}) \u3092\u66F4\u65B0`, "templates", input.id);
      return { success: true };
    }),
    deleteTemplate: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(templates).where(eq2(templates.id, input.id));
      await logChange(`\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8 (ID: ${input.id}) \u3092\u524A\u9664`, "templates", input.id);
      return { success: true };
    }),
    // Rules CRUD
    createRule: publicProcedure.input(z2.object({
      title: z2.string().min(1),
      summary: z2.string().min(1),
      details: z2.string().min(1),
      status: z2.enum(["draft", "decided", "published"]).default("decided"),
      evidenceLinks: z2.array(z2.string()).default([]),
      isHypothesis: z2.boolean().default(false)
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [rule] = await db.insert(rules).values({
        title: input.title,
        summary: input.summary,
        details: input.details,
        status: input.status,
        evidenceLinks: input.evidenceLinks,
        isHypothesis: input.isHypothesis
      }).returning();
      await logChange(`\u30EB\u30FC\u30EB\u300C${input.title}\u300D\u3092\u8FFD\u52A0`, "rules", rule.id);
      return rule;
    }),
    updateRule: publicProcedure.input(z2.object({
      id: z2.number(),
      title: z2.string().optional(),
      summary: z2.string().optional(),
      details: z2.string().optional(),
      status: z2.enum(["draft", "decided", "published"]).optional(),
      evidenceLinks: z2.array(z2.string()).optional(),
      isHypothesis: z2.boolean().optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const updateData = { updatedAt: /* @__PURE__ */ new Date() };
      if (input.title !== void 0) updateData.title = input.title;
      if (input.summary !== void 0) updateData.summary = input.summary;
      if (input.details !== void 0) updateData.details = input.details;
      if (input.status !== void 0) updateData.status = input.status;
      if (input.evidenceLinks !== void 0) updateData.evidenceLinks = input.evidenceLinks;
      if (input.isHypothesis !== void 0) updateData.isHypothesis = input.isHypothesis;
      await db.update(rules).set(updateData).where(eq2(rules.id, input.id));
      await logChange(`\u30EB\u30FC\u30EB (ID: ${input.id}) \u3092\u66F4\u65B0`, "rules", input.id);
      return { success: true };
    }),
    deleteRule: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(rules).where(eq2(rules.id, input.id));
      await logChange(`\u30EB\u30FC\u30EB (ID: ${input.id}) \u3092\u524A\u9664`, "rules", input.id);
      return { success: true };
    }),
    getHouseholds: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(households).orderBy(asc(households.householdId));
    }),
    updateHousehold: publicProcedure.input(
      z2.object({
        householdId: z2.string(),
        moveInDate: z2.date().optional(),
        leaderHistoryCount: z2.number().optional()
      })
    ).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(households).set({
        moveInDate: input.moveInDate,
        leaderHistoryCount: input.leaderHistoryCount
      }).where(eq2(households.householdId, input.householdId));
      const household = await db.select().from(households).where(eq2(households.householdId, input.householdId)).limit(1);
      await logChange(`\u4F4F\u6238 ${input.householdId} \u306E\u60C5\u5831\u3092\u66F4\u65B0`, "households", household[0]?.id);
      return { success: true };
    }),
    recalculateSchedules: publicProcedure.input(z2.object({ year: z2.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const allHouseholds = await db.select().from(households);
      const prevYear = input.year - 1;
      const prevScheduleArray = await db.select().from(leaderSchedule).where(eq2(leaderSchedule.year, prevYear)).limit(1);
      const prevSchedule = prevScheduleArray[0];
      const exemptions = await db.select().from(exemptionRequests).where(
        and(
          eq2(exemptionRequests.year, input.year),
          eq2(exemptionRequests.status, "approved")
        )
      );
      const exemptedHouseholds = new Set(exemptions.map((e) => e.householdId));
      const now = /* @__PURE__ */ new Date();
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
      const lessThanYearHouseholds = new Set(
        allHouseholds.filter((h) => h.moveInDate && h.moveInDate > twelveMonthsAgo).map((h) => h.householdId)
      );
      const recentLeaderHouseholds = new Set(
        allHouseholds.filter((h) => (h.leaderHistoryCount || 0) > 0).map((h) => h.householdId)
      );
      const candidates = allHouseholds.filter((h) => {
        return !exemptedHouseholds.has(h.householdId) && !lessThanYearHouseholds.has(h.householdId) && !recentLeaderHouseholds.has(h.householdId);
      }).sort((a, b) => {
        const aYearsSinceLast = prevSchedule ? prevSchedule.primaryHouseholdId === a.householdId ? 1 : 999 : 999;
        const bYearsSinceLast = prevSchedule ? prevSchedule.primaryHouseholdId === b.householdId ? 1 : 999 : 999;
        if (aYearsSinceLast !== bYearsSinceLast) {
          return bYearsSinceLast - aYearsSinceLast;
        }
        if (a.moveInDate && b.moveInDate) {
          return a.moveInDate.getTime() - b.moveInDate.getTime();
        }
        return a.householdId.localeCompare(b.householdId);
      });
      await db.delete(leaderSchedule).where(eq2(leaderSchedule.year, input.year));
      if (candidates.length >= 2) {
        const primary = candidates[0];
        const backup = candidates[1];
        await db.insert(leaderSchedule).values({
          year: input.year,
          primaryHouseholdId: primary.householdId,
          backupHouseholdId: backup.householdId,
          status: "draft",
          reason: "\u81EA\u52D5\u518D\u8A08\u7B97"
        });
      }
      await logChange(`${input.year}\u5E74\u5EA6\u30ED\u30FC\u30C6\u3092\u518D\u8A08\u7B97`, "leaderSchedule");
      return { success: true, candidateCount: candidates.length };
    }),
    getRotationWithReasons: publicProcedure.input(z2.object({ year: z2.number() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const allHouseholds = await db.select().from(households);
      const prevYear = input.year - 1;
      const prevScheduleArray = await db.select().from(leaderSchedule).where(eq2(leaderSchedule.year, prevYear)).limit(1);
      const prevSchedule = prevScheduleArray[0];
      const exemptions = await db.select().from(exemptionRequests).where(
        and(
          eq2(exemptionRequests.year, input.year),
          eq2(exemptionRequests.status, "approved")
        )
      );
      const exemptedHouseholds = new Set(exemptions.map((e) => e.householdId));
      const now = /* @__PURE__ */ new Date();
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
      const lessThanYearHouseholds = new Set(
        allHouseholds.filter((h) => h.moveInDate && h.moveInDate > twelveMonthsAgo).map((h) => h.householdId)
      );
      const recentLeaderHouseholds = new Set(
        allHouseholds.filter((h) => (h.leaderHistoryCount || 0) > 0).map((h) => h.householdId)
      );
      const householdsWithReasons = allHouseholds.map((h) => {
        const reasons = [];
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
          reasons,
          isCandidate: reasons.length === 0
        };
      });
      const schedule = await db.select().from(leaderSchedule).where(eq2(leaderSchedule.year, input.year)).limit(1);
      return {
        year: input.year,
        households: householdsWithReasons,
        schedule: schedule[0] || null
      };
    }),
    getResidentEmails: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(residentEmails);
    }),
    upsertResidentEmail: publicProcedure.input(z2.object({
      householdId: z2.string().min(1),
      email: z2.string().email()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db.select().from(residentEmails).where(eq2(residentEmails.householdId, input.householdId)).limit(1);
      if (existing.length > 0) {
        await db.update(residentEmails).set({ email: input.email, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(residentEmails.id, existing[0].id));
        await logChange(`\u4F4F\u6238${input.householdId}\u306E\u30E1\u30FC\u30EB\u3092\u66F4\u65B0`, "residentEmails", existing[0].id);
      } else {
        const [entry] = await db.insert(residentEmails).values({
          householdId: input.householdId,
          email: input.email
        }).returning();
        await logChange(`\u4F4F\u6238${input.householdId}\u306E\u30E1\u30FC\u30EB\u3092\u767B\u9332`, "residentEmails", entry.id);
      }
      return { success: true };
    }),
    deleteResidentEmail: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(residentEmails).where(eq2(residentEmails.id, input.id));
      await logChange(`\u4F4F\u6C11\u30E1\u30FC\u30EB (ID: ${input.id}) \u3092\u524A\u9664`, "residentEmails", input.id);
      return { success: true };
    }),
    // River Cleaning Runs CRUD
    getRiverCleaningRuns: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(riverCleaningRuns).orderBy(desc2(riverCleaningRuns.date));
    }),
    createRiverCleaningRun: publicProcedure.input(z2.object({
      date: z2.string(),
      participantsCount: z2.number().optional(),
      issues: z2.string().optional(),
      whatWorked: z2.string().optional(),
      whatToImprove: z2.string().optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [run] = await db.insert(riverCleaningRuns).values({
        date: new Date(input.date),
        participantsCount: input.participantsCount ?? null,
        issues: input.issues || null,
        whatWorked: input.whatWorked || null,
        whatToImprove: input.whatToImprove || null,
        attachments: [],
        linkedInventoryIds: []
      }).returning();
      await logChange(`\u6CB3\u5DDD\u6E05\u6383\u8A18\u9332\u3092\u8FFD\u52A0 (${input.date})`, "riverCleaningRuns", run.id);
      return run;
    }),
    updateRiverCleaningRun: publicProcedure.input(z2.object({
      id: z2.number(),
      date: z2.string().optional(),
      participantsCount: z2.number().optional(),
      issues: z2.string().optional(),
      whatWorked: z2.string().optional(),
      whatToImprove: z2.string().optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const updateData = { updatedAt: /* @__PURE__ */ new Date() };
      if (input.date !== void 0) updateData.date = new Date(input.date);
      if (input.participantsCount !== void 0) updateData.participantsCount = input.participantsCount;
      if (input.issues !== void 0) updateData.issues = input.issues;
      if (input.whatWorked !== void 0) updateData.whatWorked = input.whatWorked;
      if (input.whatToImprove !== void 0) updateData.whatToImprove = input.whatToImprove;
      await db.update(riverCleaningRuns).set(updateData).where(eq2(riverCleaningRuns.id, input.id));
      await logChange(`\u6CB3\u5DDD\u6E05\u6383\u8A18\u9332 (ID: ${input.id}) \u3092\u66F4\u65B0`, "riverCleaningRuns", input.id);
      return { success: true };
    }),
    deleteRiverCleaningRun: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(riverCleaningRuns).where(eq2(riverCleaningRuns.id, input.id));
      await logChange(`\u6CB3\u5DDD\u6E05\u6383\u8A18\u9332 (ID: ${input.id}) \u3092\u524A\u9664`, "riverCleaningRuns", input.id);
      return { success: true };
    }),
    getForms: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(forms).orderBy(desc2(forms.createdAt));
    }),
    // 認証不要：アクティブなフォーム一覧を返す
    getActiveForms: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const activeForms = await db.select().from(forms).where(eq2(forms.status, "active")).orderBy(desc2(forms.createdAt));
      const formsWithDetails = await Promise.all(
        activeForms.map(async (form) => {
          const questions = await db.select().from(formQuestions).where(eq2(formQuestions.formId, form.id)).orderBy(asc(formQuestions.orderIndex));
          const questionsWithChoices = await Promise.all(
            questions.map(async (question) => {
              const choices = await db.select().from(formChoices).where(eq2(formChoices.questionId, question.id)).orderBy(asc(formChoices.orderIndex));
              return { ...question, choices };
            })
          );
          return { ...form, questions: questionsWithChoices };
        })
      );
      return formsWithDetails;
    }),
    submitFormResponse: publicProcedure.input(
      z2.object({
        formId: z2.number(),
        householdId: z2.string().optional(),
        answers: z2.array(
          z2.object({
            questionId: z2.number(),
            choiceId: z2.number().optional(),
            textAnswer: z2.string().optional()
          })
        )
      })
    ).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      try {
        const [createdResponse] = await db.insert(formResponses).values({
          formId: input.formId,
          householdId: input.householdId || null,
          submittedAt: /* @__PURE__ */ new Date()
        }).returning();
        const responseId = createdResponse.id;
        for (const answer of input.answers) {
          await db.insert(formResponseItems).values({
            responseId,
            questionId: answer.questionId,
            choiceId: answer.choiceId || null,
            textAnswer: answer.textAnswer || null
          });
        }
        const formData = await db.select().from(forms).where(eq2(forms.id, input.formId)).limit(1);
        if (formData.length > 0) {
          try {
            await notifyOwner({
              title: `\u30D5\u30A9\u30FC\u30E0\u56DE\u7B54: ${formData[0].title}`,
              content: `${input.householdId || "\u533F\u540D"} \u304B\u3089\u300C${formData[0].title}\u300D\u3078\u306E\u56DE\u7B54\u304C\u3042\u308A\u307E\u3057\u305F\u3002`
            });
          } catch (notifyError) {
            console.warn("Failed to send notification:", notifyError);
          }
        }
        await logChange(`\u30D5\u30A9\u30FC\u30E0\u300C${formData[0]?.title}\u300D\u306B\u56DE\u7B54`, "formResponses", responseId);
        return { success: true, responseId };
      } catch (error) {
        console.error("Form submission error:", error);
        throw new Error("Failed to submit form response");
      }
    }),
    createForm: publicProcedure.input(
      z2.object({
        title: z2.string().min(1),
        description: z2.string().optional(),
        dueDate: z2.string().optional(),
        questions: z2.array(
          z2.object({
            text: z2.string().min(1),
            type: z2.enum(["single_choice", "multiple_choice"]),
            choices: z2.array(z2.string().min(1))
          })
        )
      })
    ).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      try {
        const [createdForm] = await db.insert(forms).values({
          title: input.title,
          description: input.description || null,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          status: "draft"
        }).returning();
        const formId = createdForm.id;
        for (let qIndex = 0; qIndex < input.questions.length; qIndex++) {
          const question = input.questions[qIndex];
          const [createdQuestion] = await db.insert(formQuestions).values({
            formId,
            questionText: question.text,
            questionType: question.type,
            required: true,
            orderIndex: qIndex
          }).returning();
          const questionId = createdQuestion.id;
          for (let cIndex = 0; cIndex < question.choices.length; cIndex++) {
            const choice = question.choices[cIndex];
            if (choice.trim()) {
              await db.insert(formChoices).values({
                questionId,
                choiceText: choice,
                orderIndex: cIndex
              });
            }
          }
        }
        await logChange(`\u30D5\u30A9\u30FC\u30E0\u300C${input.title}\u300D\u3092\u4F5C\u6210`, "forms", formId);
        return { success: true, formId };
      } catch (error) {
        console.error("Form creation error:", error);
        throw new Error("Failed to create form");
      }
    }),
    getFormStats: publicProcedure.input(z2.object({ formId: z2.number() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      try {
        const form = await db.select().from(forms).where(eq2(forms.id, input.formId)).limit(1);
        if (!form.length) throw new Error("Form not found");
        const questions = await db.select().from(formQuestions).where(eq2(formQuestions.formId, input.formId)).orderBy(asc(formQuestions.orderIndex));
        const questionStats = await Promise.all(
          questions.map(async (question) => {
            const choices = await db.select().from(formChoices).where(eq2(formChoices.questionId, question.id)).orderBy(asc(formChoices.orderIndex));
            const choiceStats = await Promise.all(
              choices.map(async (choice) => {
                const count = await db.select().from(formResponseItems).where(and(eq2(formResponseItems.questionId, question.id), eq2(formResponseItems.choiceId, choice.id)));
                return {
                  id: choice.id,
                  text: choice.choiceText,
                  count: count.length
                };
              })
            );
            return {
              id: question.id,
              text: question.questionText,
              type: question.questionType,
              choices: choiceStats
            };
          })
        );
        const responses = await db.select().from(formResponses).where(eq2(formResponses.formId, input.formId));
        const respondents = await Promise.all(
          responses.map(async (response) => {
            const items = await db.select().from(formResponseItems).where(eq2(formResponseItems.responseId, response.id));
            return {
              id: response.id,
              householdId: response.householdId,
              submittedAt: response.submittedAt,
              answerCount: items.length
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
          unansweredHouseholds
        };
      } catch (error) {
        console.error("Form stats error:", error);
        throw new Error("Failed to get form stats");
      }
    }),
    updateForm: publicProcedure.input(
      z2.object({
        formId: z2.number(),
        title: z2.string().min(1).optional(),
        description: z2.string().optional(),
        dueDate: z2.string().optional(),
        status: z2.enum(["draft", "active", "closed"]).optional()
      })
    ).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      try {
        const updateData = {};
        if (input.title) updateData.title = input.title;
        if (input.description !== void 0) updateData.description = input.description || null;
        if (input.dueDate !== void 0) updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
        if (input.status) updateData.status = input.status;
        await db.update(forms).set(updateData).where(eq2(forms.id, input.formId));
        await logChange(`\u30D5\u30A9\u30FC\u30E0 (ID: ${input.formId}) \u3092\u66F4\u65B0`, "forms", input.formId);
        return { success: true };
      } catch (error) {
        console.error("Form update error:", error);
        throw new Error("Failed to update form");
      }
    }),
    deleteForm: publicProcedure.input(z2.object({ formId: z2.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      try {
        const responses = await db.select().from(formResponses).where(eq2(formResponses.formId, input.formId));
        for (const response of responses) {
          await db.delete(formResponseItems).where(eq2(formResponseItems.responseId, response.id));
        }
        await db.delete(formResponses).where(eq2(formResponses.formId, input.formId));
        const questions = await db.select().from(formQuestions).where(eq2(formQuestions.formId, input.formId));
        for (const question of questions) {
          await db.delete(formChoices).where(eq2(formChoices.questionId, question.id));
        }
        await db.delete(formQuestions).where(eq2(formQuestions.formId, input.formId));
        await db.delete(forms).where(eq2(forms.id, input.formId));
        await logChange(`\u30D5\u30A9\u30FC\u30E0 (ID: ${input.formId}) \u3092\u524A\u9664`, "forms", input.formId);
        return { success: true };
      } catch (error) {
        console.error("Form deletion error:", error);
        throw new Error("Failed to delete form");
      }
    })
  }),
  // 投稿管理 API
  posts: router({
    create: publicProcedure.input(
      z2.object({
        title: z2.string(),
        body: z2.string(),
        tags: z2.array(z2.string()),
        category: z2.enum(["inquiry", "answer", "decision", "pending", "trouble", "improvement"]),
        year: z2.number(),
        isHypothesis: z2.boolean().default(false),
        relatedLinks: z2.array(z2.string()).default([])
      })
    ).mutation(async ({ input }) => {
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
        publishedAt: /* @__PURE__ */ new Date()
      });
      await logChange(`\u6295\u7A3F\u300C${input.title}\u300D\u3092\u4F5C\u6210`, "posts");
      return { success: true };
    }),
    update: publicProcedure.input(z2.object({
      id: z2.number(),
      title: z2.string().optional(),
      body: z2.string().optional(),
      tags: z2.array(z2.string()).optional(),
      category: z2.enum(["inquiry", "answer", "decision", "pending", "trouble", "improvement"]).optional(),
      isHypothesis: z2.boolean().optional(),
      relatedLinks: z2.array(z2.string()).optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const updateData = { updatedAt: /* @__PURE__ */ new Date() };
      if (input.title !== void 0) updateData.title = input.title;
      if (input.body !== void 0) updateData.body = input.body;
      if (input.tags !== void 0) updateData.tags = input.tags;
      if (input.category !== void 0) updateData.category = input.category;
      if (input.isHypothesis !== void 0) updateData.isHypothesis = input.isHypothesis;
      if (input.relatedLinks !== void 0) updateData.relatedLinks = input.relatedLinks;
      await db.update(posts).set(updateData).where(eq2(posts.id, input.id));
      await logChange(`\u6295\u7A3F (ID: ${input.id}) \u3092\u66F4\u65B0`, "posts", input.id);
      return { success: true };
    }),
    delete: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(posts).where(eq2(posts.id, input.id));
      await logChange(`\u6295\u7A3F (ID: ${input.id}) \u3092\u524A\u9664`, "posts", input.id);
      return { success: true };
    })
  }),
  // リマインダーメール送信
  reminder: router({
    sendFormReminderEmails: publicProcedure.mutation(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const now = /* @__PURE__ */ new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1e3);
      const upcomingForms = await db.select().from(forms).where(
        and(
          eq2(forms.status, "active"),
          gte(forms.dueDate, now),
          lte(forms.dueDate, in24Hours)
        )
      );
      for (const form of upcomingForms) {
        const unansweredHouseholds = await db.select({ householdId: households.householdId }).from(households).leftJoin(
          formResponses,
          and(
            eq2(formResponses.householdId, households.householdId),
            eq2(formResponses.formId, form.id)
          )
        ).where(eq2(formResponses.id, null));
        for (const household of unansweredHouseholds) {
          await notifyOwner({
            title: `\u30D5\u30A9\u30FC\u30E0\u56DE\u7B54\u30EA\u30DE\u30A4\u30F3\u30C0\u30FC: ${form.title}`,
            content: `\u4F4F\u6238 ${household.householdId} \u3078

\u4E0B\u8A18\u306E\u30D5\u30A9\u30FC\u30E0\u306E\u56DE\u7B54\u671F\u9650\u304C\u8FD1\u3065\u3044\u3066\u3044\u307E\u3059\u3002

\u30D5\u30A9\u30FC\u30E0: ${form.title}
\u671F\u9650: ${form.dueDate?.toLocaleString("ja-JP")}

\u304A\u65E9\u3081\u306B\u56DE\u7B54\u3044\u305F\u3060\u3051\u308B\u3088\u3046\u304A\u9858\u3044\u3057\u307E\u3059\u3002`
          });
        }
      }
      await logChange(`\u30EA\u30DE\u30A4\u30F3\u30C0\u30FC\u30E1\u30FC\u30EB\u9001\u4FE1: ${upcomingForms.length}\u4EF6`, "reminder");
      return { success: true, formsProcessed: upcomingForms.length };
    })
  })
});

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString2 = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl || "http://localhost:3000",
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString2(openId) || !isNonEmptyString2(appId) || !isNonEmptyString2(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/context.ts
import { eq as eq3 } from "drizzle-orm";
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
    if (user) {
      const db = await getDb();
      if (db) {
        const now = /* @__PURE__ */ new Date();
        const month = now.getMonth() + 1;
        const currentYear = month >= 4 ? now.getFullYear() : now.getFullYear() - 1;
        const schedule = await db.select().from(leaderSchedule).where(eq3(leaderSchedule.year, currentYear)).limit(1);
        if (schedule[0] && (schedule[0].primaryHouseholdId === user.householdId || schedule[0].backupHouseholdId === user.householdId)) {
          if (user.role !== "admin") {
            await db.update(users).set({ role: "admin" }).where(eq3(users.id, user.id));
            user.role = "admin";
          }
        }
      }
    }
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/vercel-handler.ts
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  try {
    const urlPath = (req.url || "/").split("?")[0];
    req.path = urlPath.replace(/^\/api\/trpc\/?/, "/");
    const trpcHandler = createExpressMiddleware({
      router: appRouter,
      createContext
    });
    await new Promise((resolve, reject) => {
      trpcHandler(req, res, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
      res.on("finish", resolve);
    });
  } catch (error) {
    console.error("[API] tRPC handler error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal server error",
        message: String(error)
      });
    }
  }
}
export {
  handler as default
};
