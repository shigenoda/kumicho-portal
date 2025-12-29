import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTRPCMsw } from "trpc-msw";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { inquiries, inquiryReplies } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Inquiry System", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  it("should create an inquiry", async () => {
    const caller = appRouter.createCaller({
      user: { id: "test-user", name: "Test User", role: "user" },
    });

    const result = await caller.inquiry.create({
      householdId: "101",
      year: 2026,
      title: "参加確認",
      content: "河川清掃に参加できるか確認したいです",
      category: "participation",
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it("should get pending inquiries", async () => {
    const caller = appRouter.createCaller({
      user: { id: "admin-user", name: "Admin User", role: "admin" },
    });

    const result = await caller.inquiry.getPending({ year: 2026 });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it("should reply to an inquiry", async () => {
    // First create an inquiry
    const caller = appRouter.createCaller({
      user: { id: "test-user", name: "Test User", role: "user" },
    });

    const inquiry = await caller.inquiry.create({
      householdId: "102",
      year: 2026,
      title: "修繕依頼",
      content: "玄関の鍵が壊れています",
      category: "repair",
    });

    // Then reply to it
    const adminCaller = appRouter.createCaller({
      user: { id: "admin-user", name: "Admin User", role: "admin" },
    });

    const reply = await adminCaller.inquiry.reply({
      inquiryId: inquiry.id,
      repliedByHouseholdId: "101",
      replyContent: "修繕手配いたします",
    });

    expect(reply).toBeDefined();
    expect(reply.success).toBe(true);
  });

  it("should get inquiry detail", async () => {
    // Create an inquiry first
    const caller = appRouter.createCaller({
      user: { id: "test-user", name: "Test User", role: "user" },
    });

    const inquiry = await caller.inquiry.create({
      householdId: "103",
      year: 2026,
      title: "意見募集",
      content: "来年の活動について意見があります",
      category: "opinion",
    });

    // Get detail
    const detail = await caller.inquiry.getDetail({ id: inquiry.id });

    expect(detail).toBeDefined();
    expect(detail.id).toBe(inquiry.id);
    expect(detail.title).toBe("意見募集");
  });

  it("should handle inquiry with all categories", async () => {
    const caller = appRouter.createCaller({
      user: { id: "test-user", name: "Test User", role: "user" },
    });

    const categories = ["participation", "opinion", "repair", "other"] as const;

    for (const category of categories) {
      const result = await caller.inquiry.create({
        householdId: "104",
        year: 2026,
        title: `Test ${category}`,
        content: `Test content for ${category}`,
        category,
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      // category is stored in DB, verify by fetching
      const detail = await caller.inquiry.getDetail({ id: result.id });
      expect(detail.category).toBe(category);
    }
  });
});
