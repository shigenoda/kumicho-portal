import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { leaderSchedule, editHistory, households } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("Rotation Management", () => {
  let testScheduleId: number;
  const testYear = 2099; // テスト用の未来の年度

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // テスト用の住戸が存在することを確認
    const existingHouseholds = await db.select().from(households).limit(2);
    if (existingHouseholds.length < 2) {
      throw new Error("Test requires at least 2 households in database");
    }

    // テスト用のローテーションスケジュールを作成
    const result = await db.insert(leaderSchedule).values({
      year: testYear,
      primaryHouseholdId: existingHouseholds[0].householdId,
      backupHouseholdId: existingHouseholds[1].householdId,
      status: "draft",
      reason: "テスト用スケジュール",
    });

    testScheduleId = result[0].insertId;
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // テストデータをクリーンアップ
    if (testScheduleId) {
      await db.delete(leaderSchedule).where(eq(leaderSchedule.id, testScheduleId));
    }
    await db.delete(editHistory).where(
      and(
        eq(editHistory.entityType, "leader_schedule"),
        eq(editHistory.entityId, testScheduleId)
      )
    );
  });

  it("should create a rotation schedule with draft status", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const schedule = await db
      .select()
      .from(leaderSchedule)
      .where(eq(leaderSchedule.id, testScheduleId))
      .limit(1);

    expect(schedule[0]).toBeDefined();
    expect(schedule[0].year).toBe(testYear);
    expect(schedule[0].status).toBe("draft");
  });

  it("should update status from draft to conditional", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .update(leaderSchedule)
      .set({ status: "conditional" })
      .where(eq(leaderSchedule.id, testScheduleId));

    const schedule = await db
      .select()
      .from(leaderSchedule)
      .where(eq(leaderSchedule.id, testScheduleId))
      .limit(1);

    expect(schedule[0].status).toBe("conditional");
  });

  it("should update status from conditional to confirmed", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .update(leaderSchedule)
      .set({ status: "confirmed" })
      .where(eq(leaderSchedule.id, testScheduleId));

    const schedule = await db
      .select()
      .from(leaderSchedule)
      .where(eq(leaderSchedule.id, testScheduleId))
      .limit(1);

    expect(schedule[0].status).toBe("confirmed");
  });

  it("should update primary and backup household", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const allHouseholds = await db.select().from(households).limit(3);
    if (allHouseholds.length < 3) {
      // 3つ目の住戸がない場合はスキップ
      return;
    }

    const newPrimary = allHouseholds[2].householdId;
    const newBackup = allHouseholds[0].householdId;

    await db
      .update(leaderSchedule)
      .set({
        primaryHouseholdId: newPrimary,
        backupHouseholdId: newBackup,
      })
      .where(eq(leaderSchedule.id, testScheduleId));

    const schedule = await db
      .select()
      .from(leaderSchedule)
      .where(eq(leaderSchedule.id, testScheduleId))
      .limit(1);

    expect(schedule[0].primaryHouseholdId).toBe(newPrimary);
    expect(schedule[0].backupHouseholdId).toBe(newBackup);
  });

  it("should update reason", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const newReason = "更新されたテスト理由";

    await db
      .update(leaderSchedule)
      .set({ reason: newReason })
      .where(eq(leaderSchedule.id, testScheduleId));

    const schedule = await db
      .select()
      .from(leaderSchedule)
      .where(eq(leaderSchedule.id, testScheduleId))
      .limit(1);

    expect(schedule[0].reason).toBe(newReason);
  });

  it("should record edit history", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 編集履歴を記録
    await db.insert(editHistory).values({
      entityType: "leader_schedule",
      entityId: testScheduleId,
      action: "update",
      previousValue: { status: "draft" },
      newValue: { status: "confirmed" },
      changedBy: null,
      changedByName: "テストユーザー",
    });

    const history = await db
      .select()
      .from(editHistory)
      .where(
        and(
          eq(editHistory.entityType, "leader_schedule"),
          eq(editHistory.entityId, testScheduleId)
        )
      );

    expect(history.length).toBeGreaterThan(0);
    expect(history[0].changedByName).toBe("テストユーザー");
  });

  it("should support all three status values", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const validStatuses = ["draft", "conditional", "confirmed"];

    for (const status of validStatuses) {
      await db
        .update(leaderSchedule)
        .set({ status: status as "draft" | "conditional" | "confirmed" })
        .where(eq(leaderSchedule.id, testScheduleId));

      const schedule = await db
        .select()
        .from(leaderSchedule)
        .where(eq(leaderSchedule.id, testScheduleId))
        .limit(1);

      expect(schedule[0].status).toBe(status);
    }
  });
});
