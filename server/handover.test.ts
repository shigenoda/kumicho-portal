import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { handoverBagItems } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Handover Bag Items System", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    // テストデータのクリーンアップ
    await db.delete(handoverBagItems).where(eq(handoverBagItems.name, "TEST_ITEM"));
  });

  it("should create a handover item", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db.insert(handoverBagItems).values({
      name: "TEST_ITEM",
      description: "テスト用の物品",
      location: "テスト保管場所",
      isChecked: false,
      notes: "テスト備考",
    });

    expect(result[0].insertId).toBeGreaterThan(0);
  });

  it("should retrieve all handover items", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const items = await db.select().from(handoverBagItems);

    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
  });

  it("should update a handover item", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // アイテムを取得
    const items = await db.select().from(handoverBagItems)
      .where(eq(handoverBagItems.name, "TEST_ITEM"))
      .limit(1);

    expect(items.length).toBe(1);

    // 更新
    await db.update(handoverBagItems).set({
      description: "更新されたテスト説明",
      location: "更新された保管場所",
    }).where(eq(handoverBagItems.id, items[0].id));

    // 確認
    const updated = await db.select().from(handoverBagItems)
      .where(eq(handoverBagItems.id, items[0].id))
      .limit(1);

    expect(updated[0].description).toBe("更新されたテスト説明");
    expect(updated[0].location).toBe("更新された保管場所");
  });

  it("should toggle checked status", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // アイテムを取得
    const items = await db.select().from(handoverBagItems)
      .where(eq(handoverBagItems.name, "TEST_ITEM"))
      .limit(1);

    expect(items.length).toBe(1);
    const originalStatus = items[0].isChecked;

    // トグル
    await db.update(handoverBagItems).set({
      isChecked: !originalStatus,
    }).where(eq(handoverBagItems.id, items[0].id));

    // 確認
    const updated = await db.select().from(handoverBagItems)
      .where(eq(handoverBagItems.id, items[0].id))
      .limit(1);

    expect(updated[0].isChecked).toBe(!originalStatus);
  });

  it("should delete a handover item", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // アイテムを取得
    const items = await db.select().from(handoverBagItems)
      .where(eq(handoverBagItems.name, "TEST_ITEM"))
      .limit(1);

    expect(items.length).toBe(1);

    // 削除
    await db.delete(handoverBagItems).where(eq(handoverBagItems.id, items[0].id));

    // 確認
    const deleted = await db.select().from(handoverBagItems)
      .where(eq(handoverBagItems.id, items[0].id));

    expect(deleted.length).toBe(0);
  });

  it("should handle multiple items with different states", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 複数のアイテムを作成
    const items = [
      { name: "鍵", location: "玄関", isChecked: true },
      { name: "印鑑", location: "机", isChecked: false },
      { name: "帳簿", location: "棚", isChecked: true },
    ];

    for (const item of items) {
      await db.insert(handoverBagItems).values({
        ...item,
        description: `${item.name}のテスト`,
      });
    }

    // チェック済みのアイテムを取得
    const allItems = await db.select().from(handoverBagItems);
    const checkedItems = allItems.filter(item => item.isChecked);

    expect(checkedItems.length).toBeGreaterThanOrEqual(2);
  });
});
