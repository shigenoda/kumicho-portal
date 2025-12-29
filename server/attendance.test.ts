import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import {
  riverCleaningEvents,
  attendanceResponses,
  householdEmails,
  posts,
  rules,
  inventory,
  editHistory,
} from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Attendance System", () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
  });

  describe("Attendance Events", () => {
    it("should create an attendance event", async () => {
      if (!db) throw new Error("Database not available");

      const result = await db.insert(riverCleaningEvents).values({
        title: "テスト河川清掃",
        year: 2026,
        scheduledDate: new Date("2026-04-15"),
        deadline: new Date("2026-04-10"),
        status: "open",
        createdBy: 0,
      });

      expect(result[0].insertId).toBeGreaterThan(0);

      // Cleanup
      await db.delete(riverCleaningEvents).where(eq(riverCleaningEvents.id, result[0].insertId));
    });

    it("should list attendance events", async () => {
      if (!db) throw new Error("Database not available");

      const events = await db.select().from(riverCleaningEvents);
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe("Attendance Responses", () => {
    it("should submit a response", async () => {
      if (!db) throw new Error("Database not available");

      // Create test event first
      const eventResult = await db.insert(riverCleaningEvents).values({
        title: "テスト河川清掃（回答テスト用）",
        year: 2026,
        scheduledDate: new Date("2026-04-15"),
        deadline: new Date("2026-04-10"),
        status: "open",
        createdBy: 0,
      });
      const eventId = eventResult[0].insertId;

      // Submit response
      const responseResult = await db.insert(attendanceResponses).values({
        eventId,
        householdId: "101",
        response: "attend",
        respondentName: "テスト太郎",
      });

      expect(responseResult[0].insertId).toBeGreaterThan(0);

      // Cleanup
      await db.delete(attendanceResponses).where(eq(attendanceResponses.eventId, eventId));
      await db.delete(riverCleaningEvents).where(eq(riverCleaningEvents.id, eventId));
    });
  });

  describe("Household Emails", () => {
    it("should register an email for a household", async () => {
      if (!db) throw new Error("Database not available");

      // Check if email already exists
      const existing = await db.select().from(householdEmails).where(eq(householdEmails.householdId, "999"));
      
      if (existing.length > 0) {
        // Update existing
        await db.update(householdEmails)
          .set({ email: "test@example.com" })
          .where(eq(householdEmails.householdId, "999"));
      } else {
        // Insert new
        const result = await db.insert(householdEmails).values({
          householdId: "999",
          email: "test@example.com",
        });
        expect(result[0].insertId).toBeGreaterThan(0);
      }

      // Cleanup
      await db.delete(householdEmails).where(eq(householdEmails.householdId, "999"));
    });
  });
});

describe("Edit System", () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
  });

  describe("Posts (Year Log)", () => {
    it("should create a post", async () => {
      if (!db) throw new Error("Database not available");

      const result = await db.insert(posts).values({
        title: "テスト投稿",
        body: "テスト本文",
        year: 2025,
        category: "decision",
        status: "published",
        authorId: 0,
        authorRole: "admin",
        tags: ["テスト"],
        relatedLinks: [],
      });

      expect(result[0].insertId).toBeGreaterThan(0);

      // Cleanup
      await db.delete(posts).where(eq(posts.id, result[0].insertId));
    });
  });

  describe("Rules", () => {
    it("should create a rule", async () => {
      if (!db) throw new Error("Database not available");

      const result = await db.insert(rules).values({
        title: "テストルール",
        summary: "テスト概要",
        details: "テスト詳細",
        status: "decided",
        evidenceLinks: [],
      });

      expect(result[0].insertId).toBeGreaterThan(0);

      // Cleanup
      await db.delete(rules).where(eq(rules.id, result[0].insertId));
    });
  });

  describe("Inventory", () => {
    it("should create an inventory item", async () => {
      if (!db) throw new Error("Database not available");

      const result = await db.insert(inventory).values({
        name: "テスト備品",
        qty: 5,
        location: "テスト倉庫",
        condition: "良好",
        tags: ["テスト"],
      });

      expect(result[0].insertId).toBeGreaterThan(0);

      // Cleanup
      await db.delete(inventory).where(eq(inventory.id, result[0].insertId));
    });

    it("should update inventory with photo", async () => {
      if (!db) throw new Error("Database not available");

      // Create test item
      const result = await db.insert(inventory).values({
        name: "写真テスト備品",
        qty: 1,
        location: "テスト倉庫",
        tags: [],
      });
      const itemId = result[0].insertId;

      // Update with photo
      await db.update(inventory)
        .set({ photo: "https://example.com/test.jpg" })
        .where(eq(inventory.id, itemId));

      // Verify
      const updated = await db.select().from(inventory).where(eq(inventory.id, itemId));
      expect(updated[0].photo).toBe("https://example.com/test.jpg");

      // Cleanup
      await db.delete(inventory).where(eq(inventory.id, itemId));
    });
  });

  describe("Edit History", () => {
    it("should record edit history", async () => {
      if (!db) throw new Error("Database not available");

      const result = await db.insert(editHistory).values({
        entityType: "test",
        entityId: 1,
        action: "create",
        newValue: { test: "value" },
        changedByName: "テストユーザー",
      });

      expect(result[0].insertId).toBeGreaterThan(0);

      // Cleanup
      await db.delete(editHistory).where(eq(editHistory.id, result[0].insertId));
    });
  });
});
