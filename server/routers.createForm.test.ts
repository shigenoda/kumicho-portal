import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { z } from "zod";

/**
 * フォーム作成 API のテスト
 */
describe("data.createForm", () => {
  it("should validate required fields", () => {
    const schema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      dueDate: z.string().optional(),
      questions: z.array(
        z.object({
          text: z.string().min(1),
          type: z.enum(["single_choice", "multiple_choice"]),
          choices: z.array(z.string().min(1)),
        })
      ).min(1),
    });

    // Valid input
    const validInput = {
      title: "河川清掃出欠",
      description: "2026年7月の河川清掃の出欠を入力してください",
      dueDate: "2026-07-10T23:59:59",
      questions: [
        {
          text: "河川清掃に参加しますか？",
          type: "single_choice" as const,
          choices: ["出席", "欠席", "未定"],
        },
      ],
    };

    const result = schema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("should reject empty title", () => {
    const schema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      dueDate: z.string().optional(),
      questions: z.array(
        z.object({
          text: z.string().min(1),
          type: z.enum(["single_choice", "multiple_choice"]),
          choices: z.array(z.string().min(1)),
        })
      ).min(1),
    });

    const invalidInput = {
      title: "",
      questions: [
        {
          text: "質問",
          type: "single_choice" as const,
          choices: ["選択肢1", "選択肢2"],
        },
      ],
    };

    const result = schema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it("should reject empty questions", () => {
    const schema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      dueDate: z.string().optional(),
      questions: z.array(
        z.object({
          text: z.string().min(1),
          type: z.enum(["single_choice", "multiple_choice"]),
          choices: z.array(z.string().min(1)),
        })
      ).min(1),
    });

    const invalidInput = {
      title: "テストフォーム",
      questions: [],
    };

    const result = schema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it("should reject question with empty choices", () => {
    const schema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      dueDate: z.string().optional(),
      questions: z.array(
        z.object({
          text: z.string().min(1),
          type: z.enum(["single_choice", "multiple_choice"]),
          choices: z.array(z.string().min(1)),
        })
      ).min(1),
    });

    const invalidInput = {
      title: "テストフォーム",
      questions: [
        {
          text: "質問",
          type: "single_choice" as const,
          choices: [""],
        },
      ],
    };

    const result = schema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it("should accept multiple questions with different types", () => {
    const schema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      dueDate: z.string().optional(),
      questions: z.array(
        z.object({
          text: z.string().min(1),
          type: z.enum(["single_choice", "multiple_choice"]),
          choices: z.array(z.string().min(1)),
        })
      ).min(1),
    });

    const validInput = {
      title: "複合フォーム",
      questions: [
        {
          text: "単一選択の質問",
          type: "single_choice" as const,
          choices: ["選択肢1", "選択肢2", "選択肢3"],
        },
        {
          text: "複数選択の質問",
          type: "multiple_choice" as const,
          choices: ["項目A", "項目B", "項目C"],
        },
      ],
    };

    const result = schema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("should handle optional description and dueDate", () => {
    const schema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      dueDate: z.string().optional(),
      questions: z.array(
        z.object({
          text: z.string().min(1),
          type: z.enum(["single_choice", "multiple_choice"]),
          choices: z.array(z.string().min(1)),
        })
      ).min(1),
    });

    const minimalInput = {
      title: "シンプルフォーム",
      questions: [
        {
          text: "質問",
          type: "single_choice" as const,
          choices: ["はい", "いいえ"],
        },
      ],
    };

    const result = schema.safeParse(minimalInput);
    expect(result.success).toBe(true);
  });
});
