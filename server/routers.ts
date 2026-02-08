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
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [event] = await db.insert(events).values({
          title: input.title,
          date: new Date(input.date),
          category: input.category,
          checklist: [],
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
