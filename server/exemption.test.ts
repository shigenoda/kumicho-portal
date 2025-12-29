import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { exemptionRequests, exemptionStatus, households } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("Exemption Application System", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    // テストデータのクリーンアップ
    await db.delete(exemptionRequests).where(eq(exemptionRequests.householdId, "TEST"));
    await db.delete(exemptionStatus).where(eq(exemptionStatus.householdId, "TEST"));
  });

  it("should create an exemption application", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db.insert(exemptionRequests).values({
      householdId: "TEST",
      year: 2026,
      version: 1,
      reason: "テスト用の免除申請理由",
      status: "pending",
    });

    expect(result[0].insertId).toBeGreaterThan(0);
  });

  it("should retrieve pending applications", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const applications = await db.select().from(exemptionRequests)
      .where(and(
        eq(exemptionRequests.householdId, "TEST"),
        eq(exemptionRequests.status, "pending")
      ));

    expect(applications.length).toBeGreaterThan(0);
    expect(applications[0].reason).toBe("テスト用の免除申請理由");
  });

  it("should approve an application", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 申請を取得
    const applications = await db.select().from(exemptionRequests)
      .where(and(
        eq(exemptionRequests.householdId, "TEST"),
        eq(exemptionRequests.status, "pending")
      ))
      .limit(1);

    expect(applications.length).toBe(1);

    // 承認
    await db.update(exemptionRequests).set({
      status: "approved",
      approvedAt: new Date(),
    }).where(eq(exemptionRequests.id, applications[0].id));

    // 確認
    const updated = await db.select().from(exemptionRequests)
      .where(eq(exemptionRequests.id, applications[0].id))
      .limit(1);

    expect(updated[0].status).toBe("approved");
    expect(updated[0].approvedAt).not.toBeNull();
  });

  it("should create exemption status when approved", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 免除ステータスを作成
    const startDate = new Date("2026-04-01");
    const endDate = new Date("2027-03-31");

    await db.insert(exemptionStatus).values({
      householdId: "TEST",
      exemptionTypeCode: "C",
      startDate,
      endDate,
      reviewDate: endDate,
      status: "active",
      notes: "テスト用の免除ステータス",
    });

    // 確認
    const status = await db.select().from(exemptionStatus)
      .where(eq(exemptionStatus.householdId, "TEST"))
      .limit(1);

    expect(status.length).toBe(1);
    expect(status[0].exemptionTypeCode).toBe("C");
    expect(status[0].status).toBe("active");
  });

  it("should reject an application", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 新しい申請を作成
    const result = await db.insert(exemptionRequests).values({
      householdId: "TEST",
      year: 2027,
      version: 1,
      reason: "却下テスト用の申請",
      status: "pending",
    });

    const newId = result[0].insertId;

    // 却下
    await db.update(exemptionRequests).set({
      status: "rejected",
      approvedAt: new Date(),
    }).where(eq(exemptionRequests.id, newId));

    // 確認
    const updated = await db.select().from(exemptionRequests)
      .where(eq(exemptionRequests.id, newId))
      .limit(1);

    expect(updated[0].status).toBe("rejected");
  });

  it("should handle version increments for re-applications", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 同じ年度の再申請（バージョン2）
    const result = await db.insert(exemptionRequests).values({
      householdId: "TEST",
      year: 2027,
      version: 2,
      reason: "再申請の理由",
      status: "pending",
    });

    expect(result[0].insertId).toBeGreaterThan(0);

    // バージョン確認
    const applications = await db.select().from(exemptionRequests)
      .where(and(
        eq(exemptionRequests.householdId, "TEST"),
        eq(exemptionRequests.year, 2027)
      ));

    expect(applications.length).toBe(2);
    const versions = applications.map(a => a.version);
    expect(versions).toContain(1);
    expect(versions).toContain(2);
  });
});
