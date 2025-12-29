import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { handoverBagItems } from "../drizzle/schema";

export const handoverRouter = router({
  // 物品一覧取得
  getItems: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    return await db.select().from(handoverBagItems).orderBy(handoverBagItems.id);
  }),

  // 物品追加
  createItem: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      location: z.string().min(1),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(handoverBagItems).values({
        name: input.name,
        description: input.description,
        location: input.location,
        notes: input.notes,
        isChecked: false,
      });

      return { id: result[0].insertId, ...input, isChecked: false };
    }),

  // 物品編集
  updateItem: publicProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1),
      description: z.string().optional(),
      location: z.string().min(1),
      isChecked: z.boolean(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(handoverBagItems).set({
        name: input.name,
        description: input.description,
        location: input.location,
        isChecked: input.isChecked,
        notes: input.notes,
      }).where(eq(handoverBagItems.id, input.id));

      return { success: true };
    }),

  // 物品削除
  deleteItem: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(handoverBagItems).where(eq(handoverBagItems.id, input.id));

      return { success: true };
    }),

  // チェック状態の切り替え
  toggleItem: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const item = await db.select().from(handoverBagItems)
        .where(eq(handoverBagItems.id, input.id))
        .limit(1);

      if (!item.length) throw new Error("Item not found");

      await db.update(handoverBagItems).set({
        isChecked: !item[0].isChecked,
      }).where(eq(handoverBagItems.id, input.id));

      return { success: true, isChecked: !item[0].isChecked };
    }),
});
