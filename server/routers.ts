import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure, adminProcedure } from "./_core/trpc";
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
} from "../drizzle/schema";

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
  }),

  // ローテ管理 API
  leaderRotation: router({
    // ローテ選定ロジックの自動計算
    calculateNextYear: adminProcedure
      .input(z.object({ year: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // 1. 最新のローテロジックを取得
        const logicRecords = await db
          .select()
          .from(leaderRotationLogic)
          .orderBy(desc(leaderRotationLogic.version))
          .limit(1);

        const logic = logicRecords[0]?.logic;
        if (!logic) throw new Error("No rotation logic defined");

        // 2. 全住戸を取得
        const allHouseholds = await db.select().from(households);

        // 3. 前回担当者を取得
        const prevYear = input.year - 1;
        const prevScheduleArray = await db
          .select()
          .from(leaderSchedule)
          .where(eq(leaderSchedule.year, prevYear))
          .limit(1);
        const prevSchedule = prevScheduleArray[0];

        // 4. 免除申請を確認
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

        // 5. 候補を計算（優先度順）
        const candidates = allHouseholds
          .filter((h) => !exemptedHouseholds.has(h.householdId))
          .sort((a, b) => {
            // 優先度1: 前回担当からの経過年数
            const aYearsSinceLast = prevSchedule
              ? prevSchedule.primaryHouseholdId === a.householdId
                ? 1
                : 999
              : 999;
            const bYearsSinceLast = prevSchedule
              ? prevSchedule.primaryHouseholdId === b.householdId
                ? 1
                : 999
              : 999;

            if (aYearsSinceLast !== bYearsSinceLast) {
              return bYearsSinceLast - aYearsSinceLast;
            }

            // 優先度2: 入居開始が古い
            if (a.moveInDate && b.moveInDate) {
              return a.moveInDate.getTime() - b.moveInDate.getTime();
            }

            // 優先度3: 住戸ID昇順
            return a.householdId.localeCompare(b.householdId);
          });

        if (candidates.length < 2) {
          throw new Error("Not enough eligible households for rotation");
        }

        // 6. Primary と Backup を決定
        const primary = candidates[0];
        const backup = candidates[1];

        // 7. DB に保存
        await db.insert(leaderSchedule).values({
          year: input.year,
          primaryHouseholdId: primary.householdId,
          backupHouseholdId: backup.householdId,
          status: "draft",
          reason: `自動計算: 前回担当からの経過年数、入居開始日、住戸ID昇順で選定`,
        });

        return {
          success: true,
          primary: primary.householdId,
          backup: backup.householdId,
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

        return { success: true, version: nextVersion };
      }),
  }),

  // 検索機能
  search: router({
    global: protectedProcedure
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
              .where(
                or(
                  like(posts.title, searchTerm),
                  like(posts.body, searchTerm)
                )
              )
              .limit(5),
            db
              .select()
              .from(inventory)
              .where(
                or(
                  like(inventory.name, searchTerm),
                  like(inventory.notes, searchTerm)
                )
              )
              .limit(5),
            db
              .select()
              .from(rules)
              .where(
                or(
                  like(rules.title, searchTerm),
                  like(rules.details, searchTerm)
                )
              )
              .limit(5),
            db
              .select()
              .from(faq)
              .where(
                or(
                  like(faq.question, searchTerm),
                  like(faq.answer, searchTerm)
                )
              )
              .limit(5),
            db
              .select()
              .from(templates)
              .where(
                or(
                  like(templates.title, searchTerm),
                  like(templates.body, searchTerm)
                )
              )
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

  // データ取得 API
  data: router({
    getEvents: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(events).orderBy(asc(events.date));
    }),

    getInventory: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(inventory).orderBy(asc(inventory.name));
    }),

    getTemplates: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(templates).orderBy(asc(templates.category));
    }),

    getRules: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(rules).orderBy(asc(rules.title));
    }),

    getFAQ: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(faq).orderBy(asc(faq.question));
    }),

    getPosts: protectedProcedure
      .input(z.object({ year: z.number().optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const currentYear = input.year || new Date().getFullYear();
        return await db
          .select()
          .from(posts)
          .where(
            and(
              eq(posts.year, currentYear),
              eq(posts.status, "published")
            )
          )
          .orderBy(desc(posts.publishedAt));
      }),

    getChangelog: protectedProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return await db
          .select()
          .from(changelog)
          .orderBy(desc(changelog.date))
          .limit(input.limit);
      }),

    getSecretNotes: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(secretNotes).orderBy(desc(secretNotes.updatedAt));
    }),

    getHandoverBagItems: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(handoverBagItems).orderBy(asc(handoverBagItems.name));
    }),

    getHouseholds: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(households).orderBy(asc(households.householdId));
    }),
    updateHousehold: adminProcedure
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

        return { success: true };
      }),

    recalculateSchedules: adminProcedure
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

        return { success: true, candidateCount: candidates.length };
      }),

    getRotationWithReasons: protectedProcedure
      .input(z.object({ year: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        // 全住戸を取得
        const allHouseholds = await db.select().from(households);

        // 前回担当者を取得
        const prevYear = input.year - 1;
        const prevScheduleArray = await db
          .select()
          .from(leaderSchedule)
          .where(eq(leaderSchedule.year, prevYear))
          .limit(1);
        const prevSchedule = prevScheduleArray[0];

        // 免除申請を確認
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

        // 入居12ヶ月未満の住戸を確認
        const now = new Date();
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
        const lessThanYearHouseholds = new Set(
          allHouseholds
            .filter((h) => h.moveInDate && h.moveInDate > twelveMonthsAgo)
            .map((h) => h.householdId)
        );

        // 直近2年以内に組長経験のある住戸を確認
        const recentLeaderHouseholds = new Set(
          allHouseholds
            .filter((h) => (h.leaderHistoryCount || 0) > 0)
            .map((h) => h.householdId)
        );

        // 各住戸の候補外理由を計算
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

        // 現在のスケジュールを取得
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

      const emails = await db.select().from(residentEmails);
      return emails;
    }),

    getForms: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      const allForms = await db.select().from(forms).orderBy(desc(forms.createdAt));
      return allForms;
    }),
  }),

  // 投稿管理 API
  posts: router({
    create: protectedProcedure
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
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (!ctx.user) throw new Error("Not authenticated");

        await db.insert(posts).values({
          title: input.title,
          body: input.body,
          tags: input.tags,
          category: input.category,
          year: input.year,
          status: ctx.user.role === "admin" ? "published" : "pending",
          authorId: ctx.user.id,
          authorRole: ctx.user.role as "editor" | "admin",
          isHypothesis: input.isHypothesis,
          relatedLinks: input.relatedLinks,
        });

        return { success: true };
      }),

    approve: adminProcedure
      .input(z.object({ postId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db
          .update(posts)
          .set({ status: "published", publishedAt: new Date() })
          .where(eq(posts.id, input.postId));

        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
