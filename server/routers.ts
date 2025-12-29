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
});

export type AppRouter = typeof appRouter;
