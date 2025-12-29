import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { vaultEntries, auditLogs, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Vault CRUD API", () => {
  let testUserId: number;
  let testVaultId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // テスト用 Admin ユーザーを作成
    const existingUser = await db.select().from(users).where(eq(users.openId, "test-vault-admin")).limit(1);
    if (existingUser[0]) {
      testUserId = existingUser[0].id;
    } else {
      const result = await db.insert(users).values({
        openId: "test-vault-admin",
        name: "Vault Test Admin",
        role: "admin",
      });
      testUserId = result[0].insertId;
    }
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // テストデータをクリーンアップ
    if (testVaultId) {
      await db.delete(vaultEntries).where(eq(vaultEntries.id, testVaultId));
    }
    await db.delete(auditLogs).where(eq(auditLogs.entityType, "vault_entry"));
  });

  it("should create a vault entry", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db.insert(vaultEntries).values({
      category: "連絡先",
      key: "テスト連絡先",
      maskedValue: "****-****-****",
      actualValue: "03-1234-5678",
      classification: "confidential",
      createdBy: testUserId,
    });

    testVaultId = result[0].insertId;
    expect(testVaultId).toBeGreaterThan(0);

    // 作成されたエントリを確認
    const entry = await db.select().from(vaultEntries).where(eq(vaultEntries.id, testVaultId)).limit(1);
    expect(entry[0]).toBeDefined();
    expect(entry[0].category).toBe("連絡先");
    expect(entry[0].key).toBe("テスト連絡先");
    expect(entry[0].maskedValue).toBe("****-****-****");
    expect(entry[0].actualValue).toBe("03-1234-5678");
    expect(entry[0].classification).toBe("confidential");
  });

  it("should update a vault entry", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.update(vaultEntries).set({
      key: "更新後の連絡先",
      maskedValue: "***-***-***",
    }).where(eq(vaultEntries.id, testVaultId));

    const entry = await db.select().from(vaultEntries).where(eq(vaultEntries.id, testVaultId)).limit(1);
    expect(entry[0].key).toBe("更新後の連絡先");
    expect(entry[0].maskedValue).toBe("***-***-***");
    // actualValue は変更されていないことを確認
    expect(entry[0].actualValue).toBe("03-1234-5678");
  });

  it("should list vault entries", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const entries = await db.select().from(vaultEntries);
    expect(entries.length).toBeGreaterThan(0);
    
    // テストエントリが含まれていることを確認
    const testEntry = entries.find(e => e.id === testVaultId);
    expect(testEntry).toBeDefined();
  });

  it("should record audit log for vault operations", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 監査ログを記録
    await db.insert(auditLogs).values({
      userId: testUserId,
      action: "view",
      entityType: "vault_entry",
      entityId: testVaultId,
      details: "テスト閲覧",
    });

    const logs = await db.select().from(auditLogs).where(eq(auditLogs.entityId, testVaultId));
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].action).toBe("view");
  });

  it("should delete a vault entry", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.delete(vaultEntries).where(eq(vaultEntries.id, testVaultId));

    const entry = await db.select().from(vaultEntries).where(eq(vaultEntries.id, testVaultId)).limit(1);
    expect(entry.length).toBe(0);

    // testVaultId をリセット（afterAll でのクリーンアップをスキップ）
    testVaultId = 0;
  });

  it("should support different classification levels", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // internal レベルのエントリを作成
    const result = await db.insert(vaultEntries).values({
      category: "その他",
      key: "内部情報テスト",
      maskedValue: "***",
      actualValue: "内部データ",
      classification: "internal",
      createdBy: testUserId,
    });

    const internalId = result[0].insertId;
    const entry = await db.select().from(vaultEntries).where(eq(vaultEntries.id, internalId)).limit(1);
    expect(entry[0].classification).toBe("internal");

    // クリーンアップ
    await db.delete(vaultEntries).where(eq(vaultEntries.id, internalId));
  });
});
