import { router, publicProcedure, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";
import { inquiries, inquiryReplies, leaderSchedule, householdEmails } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";

export const inquiryRouter = router({
  // 問い合わせ作成
  create: publicProcedure
    .input(z.object({
      householdId: z.string(),
      year: z.number(),
      title: z.string(),
      content: z.string(),
      category: z.enum(["participation", "opinion", "repair", "other"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(inquiries).values({
        householdId: input.householdId,
        year: input.year,
        title: input.title,
        content: input.content,
        category: input.category,
        status: "pending",
      });

      // その年の組長を取得
      const leaderScheduleRecord = await db.select().from(leaderSchedule)
        .where(eq(leaderSchedule.year, input.year))
        .limit(1);

      if (leaderScheduleRecord[0]) {
        const leaderHouseholdId = leaderScheduleRecord[0].primaryHouseholdId;
        const leaderEmail = await db.select().from(householdEmails)
          .where(eq(householdEmails.householdId, leaderHouseholdId))
          .limit(1);

        if (leaderEmail[0]) {
          // 組長へメール通知
          await notifyOwner({
            title: `問い合わせ: ${input.householdId}号室から（${input.category}）`,
            content: `${input.householdId}号室から問い合わせがありました。\n\nタイトル: ${input.title}\n内容: ${input.content}\n\n返信待ちキューで確認してください。`,
          });
        }
      }

      return { success: true, id: result[0].insertId };
    }),

  // 問い合わせ一覧取得
  list: publicProcedure
    .input(z.object({
      year: z.number().optional(),
      status: z.enum(["pending", "replied", "closed"]).optional(),
      householdId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      if (input.year) conditions.push(eq(inquiries.year, input.year));
      if (input.status) conditions.push(eq(inquiries.status, input.status));
      if (input.householdId) conditions.push(eq(inquiries.householdId, input.householdId));

      const query = conditions.length > 0
        ? db.select().from(inquiries).where(and(...conditions)).orderBy(desc(inquiries.createdAt))
        : db.select().from(inquiries).orderBy(desc(inquiries.createdAt));

      return await query;
    }),

  // 問い合わせ詳細取得（返信付き）
  getDetail: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const inquiry = await db.select().from(inquiries)
        .where(eq(inquiries.id, input.id))
        .limit(1);

      if (!inquiry[0]) return null;

      const replies = await db.select().from(inquiryReplies)
        .where(eq(inquiryReplies.inquiryId, input.id))
        .orderBy(asc(inquiryReplies.createdAt));

      return { ...inquiry[0], replies };
    }),

  // 問い合わせに返信
  reply: publicProcedure
    .input(z.object({
      inquiryId: z.number(),
      repliedByHouseholdId: z.string(),
      replyContent: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const inquiry = await db.select().from(inquiries)
        .where(eq(inquiries.id, input.inquiryId))
        .limit(1);

      if (!inquiry[0]) throw new Error("Inquiry not found");

      await db.insert(inquiryReplies).values({
        inquiryId: input.inquiryId,
        repliedByHouseholdId: input.repliedByHouseholdId,
        replyContent: input.replyContent,
      });

      // ステータスを replied に更新
      await db.update(inquiries).set({ status: "replied" })
        .where(eq(inquiries.id, input.inquiryId));

      // 問い合わせ元の住戸にメール通知
      const inquirerEmail = await db.select().from(householdEmails)
        .where(eq(householdEmails.householdId, inquiry[0].householdId))
        .limit(1);

      if (inquirerEmail[0]) {
        await notifyOwner({
          title: `問い合わせへの返信: "${inquiry[0].title}"`,
          content: `${input.repliedByHouseholdId}号室から返信がありました。\n\n返信内容: ${input.replyContent}`,
        });
      }

      return { success: true };
    }),

  // 返信待ちキュー取得（Admin用）
  getPending: adminProcedure
    .input(z.object({ year: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(inquiries.status, "pending")];
      if (input.year) conditions.push(eq(inquiries.year, input.year));

      return await db.select().from(inquiries)
        .where(and(...conditions))
        .orderBy(asc(inquiries.createdAt));
    }),
});
