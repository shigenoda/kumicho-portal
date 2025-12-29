import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { eq, like, or, and, desc, asc, lte, gte, sql } from "drizzle-orm";
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
  vaultEntries,
  auditLogs,
  leaderHistory,
  exemptionTypes,
  exemptionStatus,
  riverCleaningEvents,
  attendanceResponses,
  householdEmails,
  reminderLogs,
  editHistory,
  users,
  inquiries,
  inquiryReplies,
} from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import { handoverRouter } from "./handover-router";
import { inquiryRouter } from "./inquiry-router";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Member トップ用 API
  memberTop: router({
    getSummary: protectedProcedure
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

    getLeaderSchedule: protectedProcedure
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

    getPendingQueue: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      const pending = await db
        .select()
        .from(pendingQueue)
        .where(eq(pendingQueue.status, "pending"))
        .orderBy(desc(pendingQueue.priority), asc(pendingQueue.createdAt));

      return pending;
    }),

    getChangelog: protectedProcedure
      .input(z.object({ limit: z.number().default(5) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const logs = await db
          .select()
          .from(changelog)
          .orderBy(desc(changelog.date))
          .limit(input.limit);

        return logs;
      }),
  }),

  // ローテ管理 API
  leaderRotation: router({
    // 住戸一覧取得
    getHouseholds: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      const allHouseholds = await db.select().from(households).orderBy(asc(households.householdId));
      return allHouseholds;
    }),

    // 住戸の担当履歴取得
    getHistory: protectedProcedure
      .input(z.object({ householdId: z.string().optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        if (input.householdId) {
          return await db
            .select()
            .from(leaderHistory)
            .where(eq(leaderHistory.householdId, input.householdId))
            .orderBy(desc(leaderHistory.year));
        }

        return await db.select().from(leaderHistory).orderBy(desc(leaderHistory.year));
      }),

    // 免除タイプ一覧取得
    getExemptionTypes: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      return await db.select().from(exemptionTypes);
    }),

    // 免除ステータス取得
    getExemptionStatus: protectedProcedure
      .input(z.object({ householdId: z.string().optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        if (input.householdId) {
          return await db
            .select()
            .from(exemptionStatus)
            .where(eq(exemptionStatus.householdId, input.householdId));
        }

        return await db.select().from(exemptionStatus).where(eq(exemptionStatus.status, "active"));
      }),

    // ローテ選定ロジックの自動計算（免除ルール対応版）
    calculateNextYear: adminProcedure
      .input(z.object({ year: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const targetYear = input.year;
        const targetDate = new Date(targetYear, 3, 1); // 4月1日を基準

        // 1. 全住戸を取得
        const allHouseholds = await db.select().from(households);

        // 2. 担当履歴を取得
        const history = await db.select().from(leaderHistory);
        const historyMap = new Map<string, number[]>();
        history.forEach((h) => {
          if (!historyMap.has(h.householdId)) {
            historyMap.set(h.householdId, []);
          }
          historyMap.get(h.householdId)!.push(h.year);
        });

        // 3. 免除ステータスを取得
        const activeExemptions = await db
          .select()
          .from(exemptionStatus)
          .where(eq(exemptionStatus.status, "active"));

        const exemptionMap = new Map<string, { code: string; endDate: Date | null; reviewDate: Date | null }>();
        activeExemptions.forEach((e) => {
          exemptionMap.set(e.householdId, {
            code: e.exemptionTypeCode,
            endDate: e.endDate,
            reviewDate: e.reviewDate,
          });
        });

        // 4. 免除タイプを取得
        const exemptionTypeList = await db.select().from(exemptionTypes);
        const exemptionTypeMap = new Map<string, typeof exemptionTypeList[0]>();
        exemptionTypeList.forEach((t) => exemptionTypeMap.set(t.code, t));

        // 5. 免除判定と候補リスト作成
        const candidates: Array<{
          householdId: string;
          moveInDate: Date | null;
          experienceCount: number;
          lastYear: number | null;
          isExempt: boolean;
          exemptionReason: string | null;
        }> = [];

        for (const h of allHouseholds) {
          const years = historyMap.get(h.householdId) || [];
          const experienceCount = years.length;
          const lastYear = years.length > 0 ? Math.max(...years) : null;

          let isExempt = false;
          let exemptionReason: string | null = null;

          // A: 入居12ヶ月未満
          if (h.moveInDate) {
            const monthsSinceMoveIn = (targetDate.getTime() - h.moveInDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
            if (monthsSinceMoveIn < 12) {
              isExempt = true;
              exemptionReason = `入居12ヶ月未満 → 免除候補（A）`;
            }
          }

          // B: 直近組長（2年間免除）
          if (!isExempt && lastYear && targetYear - lastYear <= 2) {
            isExempt = true;
            exemptionReason = `直近組長 → 2年間免除候補（B）`;
          }

          // C: 就任困難申告（exemptionStatus から取得）
          if (!isExempt && exemptionMap.has(h.householdId)) {
            const exemption = exemptionMap.get(h.householdId)!;
            if (exemption.code === "C") {
              // 見直し日が過ぎていなければ免除
              if (!exemption.reviewDate || exemption.reviewDate > targetDate) {
                isExempt = true;
                exemptionReason = `就任困難申告 → 免除候補（C）`;
              }
            }
          }

          candidates.push({
            householdId: h.householdId,
            moveInDate: h.moveInDate,
            experienceCount,
            lastYear,
            isExempt,
            exemptionReason,
          });
        }

        // 6. 免除対象外を入居年月順でソート
        const eligibleCandidates = candidates
          .filter((c) => !c.isExempt)
          .sort((a, b) => {
            // 優先度1: 入居年月が古い順
            if (a.moveInDate && b.moveInDate) {
              return a.moveInDate.getTime() - b.moveInDate.getTime();
            }
            if (a.moveInDate && !b.moveInDate) return -1;
            if (!a.moveInDate && b.moveInDate) return 1;

            // 優先度2: 住戸ID昇順
            return a.householdId.localeCompare(b.householdId);
          });

        if (eligibleCandidates.length < 1) {
          throw new Error("免除対象外の住戸がありません");
        }

        // 7. Primary と Backup を決定
        const primary = eligibleCandidates[0];
        const backup = eligibleCandidates.length > 1 ? eligibleCandidates[1] : null;

        // 8. 根拠を作成
        const exemptedList = candidates.filter((c) => c.isExempt);
        const reasonParts = exemptedList.map((c) => `${c.householdId}は${c.exemptionReason}`);
        const reason = reasonParts.length > 0
          ? `${reasonParts.join("、")} → 繰上げで${primary.householdId}`
          : `入居年月順で${primary.householdId}`;

        // 9. DB に保存
        await db.insert(leaderSchedule).values({
          year: targetYear,
          primaryHouseholdId: primary.householdId,
          backupHouseholdId: backup?.householdId || primary.householdId,
          status: "draft",
          reason,
        });

        return {
          success: true,
          primary: primary.householdId,
          backup: backup?.householdId || null,
          reason,
          exemptedCount: exemptedList.length,
        };
      }),

    // ローテを確定
    confirm: adminProcedure
      .input(z.object({ scheduleId: z.number(), status: z.enum(["conditional", "confirmed"]) }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db
          .update(leaderSchedule)
          .set({ status: input.status })
          .where(eq(leaderSchedule.id, input.scheduleId));

        return { success: true };
      }),

    // ローテロジックを更新
    updateLogic: adminProcedure
      .input(
        z.object({
          logic: z.object({
            priority: z.array(z.string()),
            excludeConditions: z.array(z.string()),
          }),
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

        const newVersion = (latestLogic[0]?.version || 0) + 1;

        await db.insert(leaderRotationLogic).values({
          version: newVersion,
          logic: input.logic,
          reason: input.reason,
        });

        return { success: true, version: newVersion };
      }),
  }),

  // 投稿管理 API
  posts: router({
    list: protectedProcedure
      .input(z.object({ category: z.string().optional(), year: z.number().optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        let query = db.select().from(posts);

        if (input.category) {
          query = query.where(eq(posts.category, input.category as any)) as any;
        }

        if (input.year) {
          query = query.where(eq(posts.year, input.year)) as any;
        }

        return await query.orderBy(desc(posts.createdAt));
      }),

    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const result = await db.select().from(posts).where(eq(posts.id, input.id)).limit(1);
      return result[0] || null;
    }),
  }),

  // イベント管理 API
  events: router({
    list: protectedProcedure.input(z.object({ year: z.number().optional() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const currentYear = input.year || new Date().getFullYear();
      const startDate = new Date(currentYear, 0, 1);
      const endDate = new Date(currentYear, 11, 31);

      return await db
        .select()
        .from(events)
        .where(and(gte(events.date, startDate), lte(events.date, endDate)))
        .orderBy(asc(events.date));
    }),
  }),

  // 備品管理 API
  inventory: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      return await db.select().from(inventory).orderBy(asc(inventory.name));
    }),
  }),

  // テンプレ管理 API
  templates: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      return await db.select().from(templates).orderBy(asc(templates.category), asc(templates.title));
    }),
  }),

  // ルール管理 API
  rules: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      return await db.select().from(rules).orderBy(desc(rules.status), asc(rules.title));
    }),
  }),

  // FAQ 管理 API
  faq: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      return await db.select().from(faq).orderBy(asc(faq.id));
    }),
  }),

  // 引き継ぎ袋 API
  handoverBag: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      return await db.select().from(handoverBagItems).orderBy(asc(handoverBagItems.id));
    }),
  }),

  // 全文検索 API
  search: router({
    query: protectedProcedure.input(z.object({ q: z.string() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { posts: [], events: [], inventory: [], templates: [], rules: [], faq: [] };

      const searchTerm = `%${input.q}%`;

      const [postsResults, eventsResults, inventoryResults, templatesResults, rulesResults, faqResults] =
        await Promise.all([
          db.select().from(posts).where(or(like(posts.title, searchTerm), like(posts.body, searchTerm))),
          db.select().from(events).where(or(like(events.title, searchTerm), like(events.notes, searchTerm))),
          db.select().from(inventory).where(or(like(inventory.name, searchTerm), like(inventory.notes, searchTerm))),
          db.select().from(templates).where(or(like(templates.title, searchTerm), like(templates.body, searchTerm))),
          db.select().from(rules).where(or(like(rules.title, searchTerm), like(rules.summary, searchTerm))),
          db.select().from(faq).where(or(like(faq.question, searchTerm), like(faq.answer, searchTerm))),
        ]);

      return {
        posts: postsResults,
        events: eventsResults,
        inventory: inventoryResults,
        templates: templatesResults,
        rules: rulesResults,
        faq: faqResults,
      };
    }),
  }),

  // Vault API（Admin限定）
  vault: router({
    list: adminProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      // 監査ログに記録
      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "list",
        entityType: "vault",
        entityId: 0,
        details: "Vault一覧を閲覧",
      });

      return await db.select().from(vaultEntries).orderBy(asc(vaultEntries.category), asc(vaultEntries.key));
    }),

    reveal: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const entry = await db.select().from(vaultEntries).where(eq(vaultEntries.id, input.id)).limit(1);
      if (!entry[0]) throw new Error("Entry not found");

      // 監査ログに記録
      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "reveal",
        entityType: "vault_entry",
        entityId: input.id,
        details: `マスキング解除: ${entry[0].key}`,
      });

      return { actualValue: entry[0].actualValue };
    }),

    copy: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const entry = await db.select().from(vaultEntries).where(eq(vaultEntries.id, input.id)).limit(1);
      if (!entry[0]) throw new Error("Entry not found");

      // 監査ログに記録
      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "copy",
        entityType: "vault_entry",
        entityId: input.id,
        details: `コピー: ${entry[0].key}`,
      });

      return { actualValue: entry[0].actualValue };
    }),

    // Vault エントリ新規作成
    create: adminProcedure
      .input(z.object({
        category: z.string(),
        key: z.string(),
        maskedValue: z.string(),
        actualValue: z.string(),
        classification: z.enum(["internal", "confidential"]).default("confidential"),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db.insert(vaultEntries).values({
          category: input.category,
          key: input.key,
          maskedValue: input.maskedValue,
          actualValue: input.actualValue,
          classification: input.classification,
          createdBy: ctx.user.id,
        });

        // 監査ログを記録
        await db.insert(auditLogs).values({
          userId: ctx.user.id,
          action: "create",
          entityType: "vault_entry",
          entityId: result[0].insertId,
          details: `作成: ${input.key}`,
        });

        return { success: true, id: result[0].insertId };
      }),

    // Vault エントリ更新
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        category: z.string().optional(),
        key: z.string().optional(),
        maskedValue: z.string().optional(),
        actualValue: z.string().optional(),
        classification: z.enum(["internal", "confidential"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const before = await db.select().from(vaultEntries).where(eq(vaultEntries.id, input.id)).limit(1);
        if (!before[0]) throw new Error("Vault entry not found");

        const updates: Record<string, unknown> = {};
        if (input.category) updates.category = input.category;
        if (input.key) updates.key = input.key;
        if (input.maskedValue) updates.maskedValue = input.maskedValue;
        if (input.actualValue) updates.actualValue = input.actualValue;
        if (input.classification) updates.classification = input.classification;

        await db.update(vaultEntries).set(updates).where(eq(vaultEntries.id, input.id));

        // 監査ログを記録
        await db.insert(auditLogs).values({
          userId: ctx.user.id,
          action: "update",
          entityType: "vault_entry",
          entityId: input.id,
          details: `更新: ${input.key || before[0].key}`,
        });

        return { success: true };
      }),

    // Vault エントリ削除
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const before = await db.select().from(vaultEntries).where(eq(vaultEntries.id, input.id)).limit(1);
        if (!before[0]) throw new Error("Vault entry not found");

        await db.delete(vaultEntries).where(eq(vaultEntries.id, input.id));

        // 監査ログを記録
        await db.insert(auditLogs).values({
          userId: ctx.user.id,
          action: "delete",
          entityType: "vault_entry",
          entityId: input.id,
          details: `削除: ${before[0].key}`,
        });

        return { success: true };
      }),
  }),

  // 監査ログ API（Admin限定）
  auditLogs: router({
    list: adminProcedure
      .input(z.object({ limit: z.number().default(100), action: z.string().optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        let query = db.select().from(auditLogs);

        if (input.action) {
          query = query.where(eq(auditLogs.action, input.action)) as any;
        }

        return await query.orderBy(desc(auditLogs.timestamp)).limit(input.limit);
      }),
  }),

  // 河川清掃出欠表 API
  attendance: router({
    // 出欠イベント一覧取得
    listEvents: publicProcedure
      .input(z.object({ year: z.number().optional(), status: z.string().optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        let query = db.select().from(riverCleaningEvents);
        
        if (input.year) {
          query = query.where(eq(riverCleaningEvents.year, input.year)) as any;
        }
        if (input.status) {
          query = query.where(eq(riverCleaningEvents.status, input.status as any)) as any;
        }

        return await query.orderBy(desc(riverCleaningEvents.scheduledDate));
      }),

    // 出欠イベント詳細取得
    getEvent: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;

        const event = await db.select().from(riverCleaningEvents).where(eq(riverCleaningEvents.id, input.id)).limit(1);
        return event[0] || null;
      }),

    // 出欠イベント作成（誰でも可能）
    createEvent: protectedProcedure
      .input(z.object({
        title: z.string(),
        year: z.number(),
        scheduledDate: z.string(), // ISO date string
        deadline: z.string(), // ISO date string
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db.insert(riverCleaningEvents).values({
          title: input.title,
          year: input.year,
          scheduledDate: new Date(input.scheduledDate),
          deadline: new Date(input.deadline),
          description: input.description || null,
          status: "open",
          createdBy: ctx.user.id,
        });

        return { success: true, id: result[0].insertId };
      }),

    // 出欠イベントステータス更新（Admin）
    updateEventStatus: adminProcedure
      .input(z.object({ id: z.number(), status: z.enum(["draft", "open", "closed", "completed"]) }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.update(riverCleaningEvents).set({ status: input.status }).where(eq(riverCleaningEvents.id, input.id));
        return { success: true };
      }),

    // 出欠回答一覧取得
    getResponses: publicProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        return await db.select().from(attendanceResponses).where(eq(attendanceResponses.eventId, input.eventId));
      }),

    // 出欠回答状況取得（何人入力済みか）
    getResponseStats: publicProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { total: 0, responded: 0, attend: 0, absent: 0, undecided: 0 };

        const allHouseholds = await db.select().from(households);
        const responses = await db.select().from(attendanceResponses).where(eq(attendanceResponses.eventId, input.eventId));

        const respondedHouseholds = new Set(responses.map(r => r.householdId));
        const attend = responses.filter(r => r.response === "attend").length;
        const absent = responses.filter(r => r.response === "absent").length;
        const undecided = responses.filter(r => r.response === "undecided").length;

        return {
          total: allHouseholds.length,
          responded: respondedHouseholds.size,
          attend,
          absent,
          undecided,
          notResponded: allHouseholds.length - respondedHouseholds.size,
        };
      }),

    // 出欠回答入力（誰でも）
    submitResponse: publicProcedure
      .input(z.object({
        eventId: z.number(),
        householdId: z.string(),
        response: z.enum(["attend", "absent", "undecided"]),
        respondentName: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // 既存の回答を確認
        const existing = await db.select().from(attendanceResponses)
          .where(and(
            eq(attendanceResponses.eventId, input.eventId),
            eq(attendanceResponses.householdId, input.householdId)
          ))
          .limit(1);

        if (existing[0]) {
          // 更新
          await db.update(attendanceResponses)
            .set({
              response: input.response,
              respondentName: input.respondentName || null,
              notes: input.notes || null,
            })
            .where(eq(attendanceResponses.id, existing[0].id));
        } else {
          // 新規作成
          await db.insert(attendanceResponses).values({
            eventId: input.eventId,
            householdId: input.householdId,
            response: input.response,
            respondentName: input.respondentName || null,
            notes: input.notes || null,
          });
        }

        // 組長（Admin）に通知
        const event = await db.select().from(riverCleaningEvents).where(eq(riverCleaningEvents.id, input.eventId)).limit(1);
        if (event[0]) {
          const responseText = input.response === "attend" ? "参加" : input.response === "absent" ? "欠席" : "未定";
          await notifyOwner({
            title: `出欠回答: ${input.householdId}号室`,
            content: `${event[0].title}に${input.householdId}号室が「${responseText}」と回答しました。${input.notes ? `\n備考: ${input.notes}` : ""}`,
          });
        }

        return { success: true };
      }),

    // 未回答者一覧取得
    getNotResponded: publicProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const allHouseholds = await db.select().from(households);
        const responses = await db.select().from(attendanceResponses).where(eq(attendanceResponses.eventId, input.eventId));
        const respondedHouseholds = new Set(responses.map(r => r.householdId));

        return allHouseholds.filter(h => !respondedHouseholds.has(h.householdId));
      }),

    // リマインダー送信（Admin）
    sendReminders: adminProcedure
      .input(z.object({ eventId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // 未回答者を取得
        const allHouseholds = await db.select().from(households);
        const responses = await db.select().from(attendanceResponses).where(eq(attendanceResponses.eventId, input.eventId));
        const respondedHouseholds = new Set(responses.map(r => r.householdId));
        const notResponded = allHouseholds.filter(h => !respondedHouseholds.has(h.householdId));

        // メールアドレスを取得
        const emails = await db.select().from(householdEmails);
        const emailMap = new Map(emails.map(e => [e.householdId, e.email]));

        const event = await db.select().from(riverCleaningEvents).where(eq(riverCleaningEvents.id, input.eventId)).limit(1);
        if (!event[0]) throw new Error("Event not found");

        let sentCount = 0;
        let failedCount = 0;

        for (const household of notResponded) {
          const email = emailMap.get(household.householdId);
          if (email) {
            // リマインダーログに記録
            await db.insert(reminderLogs).values({
              eventId: input.eventId,
              householdId: household.householdId,
              email,
              status: "sent",
            });
            sentCount++;
          } else {
            failedCount++;
          }
        }

        // 組長に通知
        await notifyOwner({
          title: `リマインダー送信完了`,
          content: `${event[0].title}のリマインダーを送信しました。\n送信成功: ${sentCount}件\nメール未登録: ${failedCount}件`,
        });

        return { success: true, sentCount, failedCount };
      }),
  }),

  // 住民メールアドレス API
  householdEmail: router({
    // メールアドレス取得（自分の住戸のみ）
    get: publicProcedure
      .input(z.object({ householdId: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;

        const email = await db.select().from(householdEmails).where(eq(householdEmails.householdId, input.householdId)).limit(1);
        return email[0] || null;
      }),

    // メールアドレス登録・更新
    upsert: publicProcedure
      .input(z.object({
        householdId: z.string(),
        email: z.string().email(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const existing = await db.select().from(householdEmails).where(eq(householdEmails.householdId, input.householdId)).limit(1);

        if (existing[0]) {
          await db.update(householdEmails).set({ email: input.email }).where(eq(householdEmails.id, existing[0].id));
        } else {
          await db.insert(householdEmails).values({
            householdId: input.householdId,
            email: input.email,
          });
        }

        return { success: true };
      }),

    // メールアドレス一覧（Admin）
    list: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      return await db.select().from(householdEmails);
    }),
    // メールアドレス一覧（全員が見れる、伏せ字表示用）
    getAll: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(householdEmails);
    }),
  }),

  // 編集機能 API（誰でも編集可能）
  edit: router({
    // ローテーション編集
    updateLeaderSchedule: publicProcedure
      .input(z.object({
        id: z.number(),
        primaryHouseholdId: z.string().optional(),
        backupHouseholdId: z.string().optional(),
        status: z.enum(["draft", "conditional", "confirmed"]).optional(),
        reason: z.string().optional(),
        editorName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // 変更前の値を取得
        const before = await db.select().from(leaderSchedule).where(eq(leaderSchedule.id, input.id)).limit(1);
        if (!before[0]) throw new Error("Schedule not found");

        const updates: Record<string, unknown> = {};
        if (input.primaryHouseholdId) updates.primaryHouseholdId = input.primaryHouseholdId;
        if (input.backupHouseholdId) updates.backupHouseholdId = input.backupHouseholdId;
        if (input.status) updates.status = input.status;
        if (input.reason !== undefined) updates.reason = input.reason;

        await db.update(leaderSchedule).set(updates).where(eq(leaderSchedule.id, input.id));

        // 編集履歴を記録
        await db.insert(editHistory).values({
          entityType: "leader_schedule",
          entityId: input.id,
          action: "update",
          previousValue: before[0] as any,
          newValue: { ...before[0], ...updates } as any,
          changedBy: ctx.user?.id || null,
          changedByName: input.editorName || ctx.user?.name || "匿名",
        });

        return { success: true };
      }),

    // 年度ログ編集
    updatePost: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        body: z.string().optional(),
        tags: z.array(z.string()).optional(),
        category: z.enum(["inquiry", "answer", "decision", "pending", "trouble", "improvement"]).optional(),
        editorName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const before = await db.select().from(posts).where(eq(posts.id, input.id)).limit(1);
        if (!before[0]) throw new Error("Post not found");

        const updates: Record<string, unknown> = {};
        if (input.title) updates.title = input.title;
        if (input.body) updates.body = input.body;
        if (input.tags) updates.tags = input.tags;
        if (input.category) updates.category = input.category;

        await db.update(posts).set(updates).where(eq(posts.id, input.id));

        await db.insert(editHistory).values({
          entityType: "posts",
          entityId: input.id,
          action: "update",
          previousValue: before[0] as any,
          newValue: { ...before[0], ...updates } as any,
          changedBy: ctx.user?.id || null,
          changedByName: input.editorName || ctx.user?.name || "匿名",
        });

        return { success: true };
      }),

    // 年度ログ新規作成
    createPost: publicProcedure
      .input(z.object({
        title: z.string(),
        body: z.string(),
        tags: z.array(z.string()),
        year: z.number(),
        category: z.enum(["inquiry", "answer", "decision", "pending", "trouble", "improvement"]),
        editorName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db.insert(posts).values({
          title: input.title,
          body: input.body,
          tags: input.tags,
          year: input.year,
          category: input.category,
          status: "published",
          authorId: ctx.user?.id || 0,
          authorRole: ctx.user?.role === "admin" ? "admin" : "editor",
          relatedLinks: [],
        });

        await db.insert(editHistory).values({
          entityType: "posts",
          entityId: result[0].insertId,
          action: "create",
          newValue: input as any,
          changedBy: ctx.user?.id || null,
          changedByName: input.editorName || ctx.user?.name || "匿名",
        });

        return { success: true, id: result[0].insertId };
      }),

    // ルール新規作成
    createRule: publicProcedure
      .input(z.object({
        title: z.string(),
        summary: z.string(),
        details: z.string(),
        status: z.enum(["decided", "pending"]),
        evidenceLinks: z.array(z.string()).optional(),
        editorName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db.insert(rules).values({
          title: input.title,
          summary: input.summary,
          details: input.details,
          status: input.status,
          evidenceLinks: input.evidenceLinks || [],
        });

        await db.insert(editHistory).values({
          entityType: "rules",
          entityId: result[0].insertId,
          action: "create",
          newValue: input as any,
          changedBy: ctx.user?.id || null,
          changedByName: input.editorName || ctx.user?.name || "匿名",
        });

        return { success: true, id: result[0].insertId };
      }),

    // ルール編集
    updateRule: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        summary: z.string().optional(),
        details: z.string().optional(),
        status: z.enum(["decided", "pending"]).optional(),
        evidenceLinks: z.array(z.string()).optional(),
        editorName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const before = await db.select().from(rules).where(eq(rules.id, input.id)).limit(1);
        if (!before[0]) throw new Error("Rule not found");

        const updates: Record<string, unknown> = {};
        if (input.title) updates.title = input.title;
        if (input.summary) updates.summary = input.summary;
        if (input.details) updates.details = input.details;
        if (input.status) updates.status = input.status;
        if (input.evidenceLinks) updates.evidenceLinks = input.evidenceLinks;

        await db.update(rules).set(updates).where(eq(rules.id, input.id));

        await db.insert(editHistory).values({
          entityType: "rules",
          entityId: input.id,
          action: "update",
          previousValue: before[0] as any,
          newValue: { ...before[0], ...updates } as any,
          changedBy: ctx.user?.id || null,
          changedByName: input.editorName || ctx.user?.name || "匿名",
        });

        return { success: true };
      }),

    // FAQ編集
    updateFaq: publicProcedure
      .input(z.object({
        id: z.number(),
        question: z.string().optional(),
        answer: z.string().optional(),
        editorName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const before = await db.select().from(faq).where(eq(faq.id, input.id)).limit(1);
        if (!before[0]) throw new Error("FAQ not found");

        const updates: Record<string, unknown> = {};
        if (input.question) updates.question = input.question;
        if (input.answer) updates.answer = input.answer;

        await db.update(faq).set(updates).where(eq(faq.id, input.id));

        await db.insert(editHistory).values({
          entityType: "faq",
          entityId: input.id,
          action: "update",
          previousValue: before[0] as any,
          newValue: { ...before[0], ...updates } as any,
          changedBy: ctx.user?.id || null,
          changedByName: input.editorName || ctx.user?.name || "匿名",
        });

        return { success: true };
      }),

    // イベント新規作成
    createEvent: publicProcedure
      .input(z.object({
        title: z.string(),
        date: z.string(), // ISO date string
        category: z.string(),
        checklist: z.array(z.object({
          id: z.string(),
          text: z.string(),
          completed: z.boolean(),
        })).optional(),
        notes: z.string().optional(),
        editorName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db.insert(events).values({
          title: input.title,
          date: new Date(input.date),
          category: input.category,
          checklist: input.checklist || [],
          notes: input.notes || null,
          attachments: [],
        });

        await db.insert(editHistory).values({
          entityType: "events",
          entityId: result[0].insertId,
          action: "create",
          newValue: input as any,
          changedBy: ctx.user?.id || null,
          changedByName: input.editorName || ctx.user?.name || "匿名",
        });

        return { success: true, id: result[0].insertId };
      }),

    // イベント編集
    updateEvent: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        date: z.string().optional(), // ISO date string
        category: z.string().optional(),
        checklist: z.array(z.object({
          id: z.string(),
          text: z.string(),
          completed: z.boolean(),
        })).optional(),
        notes: z.string().optional(),
        editorName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const before = await db.select().from(events).where(eq(events.id, input.id)).limit(1);
        if (!before[0]) throw new Error("Event not found");

        const updates: Record<string, unknown> = {};
        if (input.title) updates.title = input.title;
        if (input.date) updates.date = new Date(input.date);
        if (input.category) updates.category = input.category;
        if (input.checklist) updates.checklist = input.checklist;
        if (input.notes !== undefined) updates.notes = input.notes;

        await db.update(events).set(updates).where(eq(events.id, input.id));

        await db.insert(editHistory).values({
          entityType: "events",
          entityId: input.id,
          action: "update",
          previousValue: before[0] as any,
          newValue: { ...before[0], ...updates } as any,
          changedBy: ctx.user?.id || null,
          changedByName: input.editorName || ctx.user?.name || "匿名",
        });

        return { success: true };
      }),

    // イベント削除
    deleteEvent: publicProcedure
      .input(z.object({
        id: z.number(),
        editorName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const before = await db.select().from(events).where(eq(events.id, input.id)).limit(1);
        if (!before[0]) throw new Error("Event not found");

        await db.delete(events).where(eq(events.id, input.id));

        await db.insert(editHistory).values({
          entityType: "events",
          entityId: input.id,
          action: "delete",
          previousValue: before[0] as any,
          changedBy: ctx.user?.id || null,
          changedByName: input.editorName || ctx.user?.name || "匿名",
        });

        return { success: true };
      }),

    // FAQ新規作成
    createFaq: publicProcedure
      .input(z.object({
        question: z.string(),
        answer: z.string(),
        relatedRuleIds: z.array(z.number()).optional(),
        relatedPostIds: z.array(z.number()).optional(),
        editorName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db.insert(faq).values({
          question: input.question,
          answer: input.answer,
          relatedRuleIds: input.relatedRuleIds || [],
          relatedPostIds: input.relatedPostIds || [],
        });

        await db.insert(editHistory).values({
          entityType: "faq",
          entityId: result[0].insertId,
          action: "create",
          newValue: input as any,
          changedBy: ctx.user?.id || null,
          changedByName: input.editorName || ctx.user?.name || "匿名",
        });

        return { success: true, id: result[0].insertId };
      }),

    // FAQ削除
    deleteFaq: publicProcedure
      .input(z.object({
        id: z.number(),
        editorName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const before = await db.select().from(faq).where(eq(faq.id, input.id)).limit(1);
        if (!before[0]) throw new Error("FAQ not found");

        await db.delete(faq).where(eq(faq.id, input.id));

        await db.insert(editHistory).values({
          entityType: "faq",
          entityId: input.id,
          action: "delete",
          previousValue: before[0] as any,
          changedBy: ctx.user?.id || null,
          changedByName: input.editorName || ctx.user?.name || "匿名",
        });

        return { success: true };
      }),

    // テンプレート新規作成
    createTemplate: publicProcedure
      .input(z.object({
        title: z.string(),
        category: z.string(),
        body: z.string(),
        editorName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db.insert(templates).values({
          title: input.title,
          category: input.category,
          body: input.body,
          tags: [],
        });

        await db.insert(editHistory).values({
          entityType: "templates",
          entityId: result[0].insertId,
          action: "create",
          newValue: input as any,
          changedBy: ctx.user?.id || null,
          changedByName: input.editorName || ctx.user?.name || "匿名",
        });

        return { success: true, id: result[0].insertId };
      }),

    // テンプレート編集
    updateTemplate: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        category: z.string().optional(),
        body: z.string().optional(),
        editorName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const before = await db.select().from(templates).where(eq(templates.id, input.id)).limit(1);
        if (!before[0]) throw new Error("Template not found");

        const updates: Record<string, unknown> = {};
        if (input.title) updates.title = input.title;
        if (input.category) updates.category = input.category;
        if (input.body) updates.body = input.body;

        await db.update(templates).set(updates).where(eq(templates.id, input.id));

        await db.insert(editHistory).values({
          entityType: "templates",
          entityId: input.id,
          action: "update",
          previousValue: before[0] as any,
          newValue: { ...before[0], ...updates } as any,
          changedBy: ctx.user?.id || null,
          changedByName: input.editorName || ctx.user?.name || "匿名",
        });

        return { success: true };
      }),

    // テンプレート削除
    deleteTemplate: publicProcedure
      .input(z.object({
        id: z.number(),
        editorName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const before = await db.select().from(templates).where(eq(templates.id, input.id)).limit(1);
        if (!before[0]) throw new Error("Template not found");

        await db.delete(templates).where(eq(templates.id, input.id));

        await db.insert(editHistory).values({
          entityType: "templates",
          entityId: input.id,
          action: "delete",
          previousValue: before[0] as any,
          changedBy: ctx.user?.id || null,
          changedByName: input.editorName || ctx.user?.name || "匿名",
        });

        return { success: true };
      }),

    // 備品編集
    updateInventory: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        qty: z.number().optional(),
        location: z.string().optional(),
        condition: z.string().optional(),
        notes: z.string().optional(),
        photo: z.string().optional(),
        editorName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const before = await db.select().from(inventory).where(eq(inventory.id, input.id)).limit(1);
        if (!before[0]) throw new Error("Inventory item not found");

        const updates: Record<string, unknown> = {};
        if (input.name) updates.name = input.name;
        if (input.qty !== undefined) updates.qty = input.qty;
        if (input.location) updates.location = input.location;
        if (input.condition) updates.condition = input.condition;
        if (input.notes !== undefined) updates.notes = input.notes;
        if (input.photo !== undefined) updates.photo = input.photo;

        await db.update(inventory).set(updates).where(eq(inventory.id, input.id));

        await db.insert(editHistory).values({
          entityType: "inventory",
          entityId: input.id,
          action: "update",
          previousValue: before[0] as any,
          newValue: { ...before[0], ...updates } as any,
          changedBy: ctx.user?.id || null,
          changedByName: input.editorName || ctx.user?.name || "匿名",
        });

        return { success: true };
      }),

    // 備品新規作成
    createInventory: publicProcedure
      .input(z.object({
        name: z.string(),
        qty: z.number(),
        location: z.string(),
        condition: z.string().optional(),
        notes: z.string().optional(),
        photo: z.string().optional(),
        tags: z.array(z.string()).optional(),
        editorName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db.insert(inventory).values({
          name: input.name,
          qty: input.qty,
          location: input.location,
          condition: input.condition || null,
          notes: input.notes || null,
          photo: input.photo || null,
          tags: input.tags || [],
        });

        await db.insert(editHistory).values({
          entityType: "inventory",
          entityId: result[0].insertId,
          action: "create",
          newValue: input as any,
          changedBy: ctx.user?.id || null,
          changedByName: input.editorName || ctx.user?.name || "匿名",
        });

        return { success: true, id: result[0].insertId };
      }),

    // 編集履歴取得
    getHistory: publicProcedure
      .input(z.object({ entityType: z.string(), entityId: z.number().optional(), limit: z.number().default(50) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        if (input.entityId) {
          return await db.select().from(editHistory)
            .where(and(
              eq(editHistory.entityType, input.entityType),
              eq(editHistory.entityId, input.entityId)
            ))
            .orderBy(desc(editHistory.changedAt))
            .limit(input.limit);
        }

        return await db.select().from(editHistory)
          .where(eq(editHistory.entityType, input.entityType))
          .orderBy(desc(editHistory.changedAt))
          .limit(input.limit);
      }),
  }),

  // 写真アップロード API
  upload: router({
    // 備品写真アップロード
    inventoryPhoto: publicProcedure
      .input(z.object({
        inventoryId: z.number(),
        photoUrl: z.string(),
        editorName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const before = await db.select().from(inventory).where(eq(inventory.id, input.inventoryId)).limit(1);
        if (!before[0]) throw new Error("Inventory item not found");

        await db.update(inventory).set({ photo: input.photoUrl }).where(eq(inventory.id, input.inventoryId));

        await db.insert(editHistory).values({
          entityType: "inventory",
          entityId: input.inventoryId,
          action: "update",
          previousValue: { photo: before[0].photo } as any,
          newValue: { photo: input.photoUrl } as any,
          changedBy: ctx.user?.id || null,
          changedByName: input.editorName || ctx.user?.name || "匿名",
        });

        return { success: true };
      }),
  }),

  // 免除申請システム
  exemption: router({
    // 申請一覧取得（全員が自分の申請を見れる、Adminは全件見れる）
    getApplications: publicProcedure
      .input(z.object({
        householdId: z.string().optional(),
        status: z.enum(["pending", "approved", "rejected"]).optional(),
        year: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) return [];

        const conditions = [];
        if (input.householdId) {
          conditions.push(eq(exemptionRequests.householdId, input.householdId));
        }
        if (input.status) {
          conditions.push(eq(exemptionRequests.status, input.status));
        }
        if (input.year) {
          conditions.push(eq(exemptionRequests.year, input.year));
        }

        const query = conditions.length > 0
          ? db.select().from(exemptionRequests).where(and(...conditions)).orderBy(desc(exemptionRequests.createdAt))
          : db.select().from(exemptionRequests).orderBy(desc(exemptionRequests.createdAt));

        return await query;
      }),

    // 申請作成
    createApplication: publicProcedure
      .input(z.object({
        householdId: z.string(),
        year: z.number(),
        reason: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // 同じ年度の申請がないか確認
        const existing = await db.select().from(exemptionRequests)
          .where(and(
            eq(exemptionRequests.householdId, input.householdId),
            eq(exemptionRequests.year, input.year),
            eq(exemptionRequests.status, "pending")
          ))
          .limit(1);

        if (existing.length > 0) {
          throw new Error("同じ年度の申請が既に存在します");
        }

        // バージョン番号を取得
        const previousVersions = await db.select().from(exemptionRequests)
          .where(and(
            eq(exemptionRequests.householdId, input.householdId),
            eq(exemptionRequests.year, input.year)
          ))
          .orderBy(desc(exemptionRequests.version))
          .limit(1);

        const version = previousVersions.length > 0 ? previousVersions[0].version + 1 : 1;

        const result = await db.insert(exemptionRequests).values({
          householdId: input.householdId,
          year: input.year,
          version,
          reason: input.reason,
          status: "pending",
        });

        // 管理者に通知
        await notifyOwner({
          title: `免除申請: ${input.householdId}号室（${input.year}年度）`,
          content: `${input.householdId}号室から${input.year}年度の組長就任免除申請がありました。\n\n理由: ${input.reason}\n\n管理画面で承認・却下を行ってください。`,
        });

        return { success: true, id: result[0].insertId };
      }),

    // 申請承認（Admin専用）
    approveApplication: adminProcedure
      .input(z.object({
        id: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const application = await db.select().from(exemptionRequests)
          .where(eq(exemptionRequests.id, input.id))
          .limit(1);

        if (!application[0]) throw new Error("Application not found");
        if (application[0].status !== "pending") throw new Error("Application is not pending");

        await db.update(exemptionRequests).set({
          status: "approved",
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
        }).where(eq(exemptionRequests.id, input.id));

        // 免除ステータスを作成
        const startDate = new Date(`${application[0].year}-04-01`);
        const endDate = new Date(`${application[0].year + 1}-03-31`);

        await db.insert(exemptionStatus).values({
          householdId: application[0].householdId,
          exemptionTypeCode: "C",
          startDate,
          endDate,
          reviewDate: endDate,
          status: "active",
          notes: input.notes || application[0].reason,
        });

        // 監査ログ
        await db.insert(auditLogs).values({
          action: "approve_exemption",
          entityType: "exemption_request",
          entityId: input.id,
          userId: ctx.user.id,
          details: JSON.stringify({ householdId: application[0].householdId, year: application[0].year }),
        });

        return { success: true };
      }),

    // 申請却下（Admin専用）
    rejectApplication: adminProcedure
      .input(z.object({
        id: z.number(),
        rejectReason: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const application = await db.select().from(exemptionRequests)
          .where(eq(exemptionRequests.id, input.id))
          .limit(1);

        if (!application[0]) throw new Error("Application not found");
        if (application[0].status !== "pending") throw new Error("Application is not pending");

        await db.update(exemptionRequests).set({
          status: "rejected",
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
        }).where(eq(exemptionRequests.id, input.id));

        // 監査ログ
        await db.insert(auditLogs).values({
          action: "reject_exemption",
          entityType: "exemption_request",
          entityId: input.id,
          userId: ctx.user.id,
          details: JSON.stringify({ householdId: application[0].householdId, year: application[0].year, rejectReason: input.rejectReason }),
        });

        return { success: true };
      }),

    // 保留中の申請数を取得（Admin用バッジ表示）
    getPendingCount: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return 0;

      const result = await db.select({ count: sql<number>`count(*)` })
        .from(exemptionRequests)
        .where(eq(exemptionRequests.status, "pending"));

      return result[0]?.count || 0;
    }),
  }),

  handover: handoverRouter,
  inquiry: inquiryRouter,
});

export type AppRouter = typeof appRouter;
