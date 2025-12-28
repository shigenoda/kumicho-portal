import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { posts, events, inventory, templates, rules, faq, changelog, secretNotes, riverCleaningRuns, InsertPost, InsertEvent, InsertInventoryItem, InsertTemplate, InsertRule, InsertFAQ, InsertChangelog, InsertSecretNote } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import * as db from "./db";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// Editor or Admin procedure
const editorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "editor" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Editor or Admin access required" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Posts (年度ログ)
  posts: router({
    getPublished: publicProcedure
      .input(z.object({ year: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const database = await getDb();
        if (!database) return [];
        let query: any = database.select().from(posts).where(eq(posts.status, "published"));
        if (input?.year) {
          query = query.where(eq(posts.year, input.year));
        }
        return await query.orderBy(desc(posts.publishedAt));
      }),
    
    getById: publicProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return await db.getPostById(input);
      }),
    
    create: editorProcedure
      .input(z.object({
        title: z.string(),
        body: z.string(),
        tags: z.array(z.string()),
        year: z.number(),
        category: z.enum(["inquiry", "answer", "decision", "pending", "trouble", "improvement"]),
        relatedLinks: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        
        const result = await database.insert(posts).values({
          title: input.title,
          body: input.body,
          tags: input.tags,
          year: input.year,
          category: input.category,
          status: "draft",
          authorId: ctx.user.id,
          authorRole: ctx.user.role as "editor" | "admin",
          relatedLinks: input.relatedLinks || [],
        });
        
        return result;
      }),
    
    approve: adminProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        
        await database.update(posts).set({
          status: "published",
          publishedAt: new Date(),
        }).where(eq(posts.id, input));
        
        return { success: true };
      }),
  }),

  // Events (年間カレンダー)
  events: router({
    getAll: publicProcedure.query(async () => {
      return await db.getEventsByYear(new Date().getFullYear());
    }),
    
    create: adminProcedure
      .input(z.object({
        title: z.string(),
        date: z.date(),
        category: z.string(),
        checklist: z.array(z.object({
          id: z.string(),
          text: z.string(),
          completed: z.boolean(),
        })).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        
        return await database.insert(events).values({
          title: input.title,
          date: input.date,
          category: input.category,
          checklist: input.checklist || [],
          notes: input.notes,
          attachments: [],
        });
      }),
  }),

  // Inventory (備品台帳)
  inventory: router({
    getAll: publicProcedure.query(async () => {
      return await db.getAllInventory();
    }),
    
    getById: publicProcedure
      .input(z.number())
      .query(async ({ input }) => {
        return await db.getInventoryById(input);
      }),
    
    create: adminProcedure
      .input(z.object({
        name: z.string(),
        qty: z.number(),
        location: z.string(),
        condition: z.string().optional(),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        
        return await database.insert(inventory).values({
          name: input.name,
          qty: input.qty,
          location: input.location,
          condition: input.condition,
          notes: input.notes,
          tags: input.tags || [],
        });
      }),
  }),

  // Templates (テンプレ)
  templates: router({
    getByCategory: publicProcedure
      .input(z.string())
      .query(async ({ input }) => {
        return await db.getTemplatesByCategory(input);
      }),
    
    getAll: publicProcedure.query(async () => {
      const database = await getDb();
      if (!database) return [];
      return await database.select().from(templates);
    }),
  }),

  // Rules (ルール・決定事項)
  rules: router({
    getDecided: publicProcedure.query(async () => {
      return await db.getDecidedRules();
    }),
    
    getAll: publicProcedure.query(async () => {
      const database = await getDb();
      if (!database) return [];
      return await database.select().from(rules);
    }),
  }),

  // FAQ
  faq: router({
    getAll: publicProcedure.query(async () => {
      return await db.getAllFAQ();
    }),
  }),

  // Changelog (変更履歴)
  changelog: router({
    getRecent: publicProcedure
      .input(z.number().optional())
      .query(async ({ input }) => {
        return await db.getRecentChangelog(input || 10);
      }),
  }),

  // Secret Notes (秘匿メモ - Admin only)
  secretNotes: router({
    getAll: adminProcedure.query(async () => {
      return await db.getSecretNotes();
    }),
    
    create: adminProcedure
      .input(z.object({
        title: z.string(),
        body: z.string(),
      }))
      .mutation(async ({ input }) => {
        const database = await getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        
        return await database.insert(secretNotes).values({
          title: input.title,
          body: input.body,
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
