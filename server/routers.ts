import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { eq, like, or } from "drizzle-orm";
import { posts, events, inventory, templates, rules, faq, changelog, secretNotes } from "../drizzle/schema";

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

  // Search functionality
  search: router({
    global: protectedProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const searchTerm = `%${input.query}%`;
        
        try {
          const results = await Promise.all([
            db.select().from(posts).where(
              or(
                like(posts.title, searchTerm),
                like(posts.body, searchTerm)
              )
            ).limit(5),
            db.select().from(inventory).where(
              or(
                like(inventory.name, searchTerm),
                like(inventory.notes, searchTerm)
              )
            ).limit(5),
            db.select().from(rules).where(
              or(
                like(rules.title, searchTerm),
                like(rules.details, searchTerm)
              )
            ).limit(5),
            db.select().from(faq).where(
              or(
                like(faq.question, searchTerm),
                like(faq.answer, searchTerm)
              )
            ).limit(5),
          ]);

          return {
            posts: results[0],
            inventory: results[1],
            rules: results[2],
            faq: results[3],
          };
        } catch (error) {
          console.error("Search error:", error);
          return { posts: [], inventory: [], rules: [], faq: [] };
        }
      }),
  }),

  // Events (年間カレンダー)
  events: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      try {
        return await db.select().from(events).orderBy(events.date);
      } catch (error) {
        console.error("Events list error:", error);
        return [];
      }
    }),
  }),

  // Inventory (備品台帳)
  inventory: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      try {
        return await db.select().from(inventory).orderBy(inventory.name);
      } catch (error) {
        console.error("Inventory list error:", error);
        return [];
      }
    }),
  }),

  // Templates (テンプレ置き場)
  templates: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      try {
        return await db.select().from(templates);
      } catch (error) {
        console.error("Templates list error:", error);
        return [];
      }
    }),
  }),

  // Rules (ルール・決定事項)
  rules: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      try {
        return await db.select().from(rules).orderBy(rules.title);
      } catch (error) {
        console.error("Rules list error:", error);
        return [];
      }
    }),
  }),

  // FAQ
  faq: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      try {
        return await db.select().from(faq);
      } catch (error) {
        console.error("FAQ list error:", error);
        return [];
      }
    }),
  }),

  // Posts (年度ログ)
  posts: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      try {
        return await db.select().from(posts)
          .where(eq(posts.status, 'published'))
          .orderBy(posts.publishedAt);
      } catch (error) {
        console.error("Posts list error:", error);
        return [];
      }
    }),
  }),

  // Changelog (変更履歴)
  changelog: router({
    getRecent: protectedProcedure
      .input(z.number().default(5))
      .query(async ({ input: limit }) => {
        const db = await getDb();
        if (!db) return [];
        try {
          return await db.select().from(changelog)
            .orderBy(changelog.date)
            .limit(limit);
        } catch (error) {
          console.error("Changelog error:", error);
          return [];
        }
      }),
  }),

  // Secret Notes (Admin限定)
  secretNotes: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== 'admin') {
        throw new Error('Unauthorized');
      }
      const db = await getDb();
      if (!db) return [];
      try {
        return await db.select().from(secretNotes);
      } catch (error) {
        console.error("Secret notes error:", error);
        return [];
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
