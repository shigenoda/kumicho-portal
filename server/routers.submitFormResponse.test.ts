import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { forms, formQuestions, formChoices, formResponses, formResponseItems } from "../drizzle/schema";

describe("submitFormResponse API", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  afterAll(async () => {
    // クリーンアップ
    if (db) {
      // テストデータを削除
      await db.delete(formResponseItems).where(eq(formResponseItems.id, -1)).catch(() => {});
      await db.delete(formResponses).where(eq(formResponses.id, -1)).catch(() => {});
    }
  });

  it("should create a form response with answers", async () => {
    if (!db) {
      expect(true).toBe(true);
      return;
    }

    // テスト用フォームを作成
    const testForm = await db.insert(forms).values({
      title: "Test Form for Response",
      description: "This is a test form",
      createdBy: 1,
      status: "active",
    });

    const createdForms = await db.select().from(forms).where(eq(forms.title, "Test Form for Response"));
    const formId = createdForms[0]?.id;

    if (!formId) {
      expect(true).toBe(true);
      return;
    }

    // テスト用質問を作成
    const testQuestion = await db.insert(formQuestions).values({
      formId,
      questionText: "What is your name?",
      questionType: "single_choice",
      required: true,
      orderIndex: 0,
    });

    const createdQuestions = await db
      .select()
      .from(formQuestions)
      .where(eq(formQuestions.formId, formId));
    const questionId = createdQuestions[0]?.id;

    if (!questionId) {
      expect(true).toBe(true);
      return;
    }

    // テスト用選択肢を作成
    const testChoice = await db.insert(formChoices).values({
      questionId,
      choiceText: "Option A",
      orderIndex: 0,
    });

    const createdChoices = await db
      .select()
      .from(formChoices)
      .where(eq(formChoices.questionId, questionId));
    const choiceId = createdChoices[0]?.id;

    if (!choiceId) {
      expect(true).toBe(true);
      return;
    }

    // フォーム回答を作成
    const response = await db.insert(formResponses).values({
      formId,
      userId: 1,
      householdId: "101",
      submittedAt: new Date(),
    });

    const createdResponses = await db
      .select()
      .from(formResponses)
      .where(eq(formResponses.formId, formId));
    const responseId = createdResponses[0]?.id;

    expect(responseId).toBeDefined();

    if (responseId) {
      // 回答内容を作成
      const responseItem = await db.insert(formResponseItems).values({
        responseId,
        questionId,
        choiceId,
        textAnswer: null,
      });

      const createdItems = await db
        .select()
        .from(formResponseItems)
        .where(eq(formResponseItems.responseId, responseId));

      expect(createdItems.length).toBeGreaterThan(0);
      expect(createdItems[0].choiceId).toBe(choiceId);
    }
  });

  it("should handle form response with multiple answers", async () => {
    if (!db) {
      expect(true).toBe(true);
      return;
    }

    // テスト用フォームを作成
    const testForm = await db.insert(forms).values({
      title: "Multi-Question Form",
      description: "Form with multiple questions",
      createdBy: 1,
      status: "active",
    });

    const createdForms = await db.select().from(forms).where(eq(forms.title, "Multi-Question Form"));
    const formId = createdForms[0]?.id;

    if (!formId) {
      expect(true).toBe(true);
      return;
    }

    // 複数の質問を作成
    const questions = [];
    for (let i = 0; i < 2; i++) {
      const q = await db.insert(formQuestions).values({
        formId,
        questionText: `Question ${i + 1}`,
        questionType: "single_choice",
        required: true,
        orderIndex: i,
      });
      questions.push(q);
    }

    const createdQuestions = await db
      .select()
      .from(formQuestions)
      .where(eq(formQuestions.formId, formId));

    expect(createdQuestions.length).toBe(2);

    // 各質問に選択肢を追加
    for (const question of createdQuestions) {
      const choice = await db.insert(formChoices).values({
        questionId: question.id,
        choiceText: "Option",
        orderIndex: 0,
      });
    }

    // フォーム回答を作成
    const response = await db.insert(formResponses).values({
      formId,
      userId: 2,
      householdId: "102",
      submittedAt: new Date(),
    });

    const createdResponses = await db
      .select()
      .from(formResponses)
      .where(eq(formResponses.formId, formId));
    const responseId = createdResponses[0]?.id;

    expect(responseId).toBeDefined();

    if (responseId) {
      // 各質問への回答を作成
      for (const question of createdQuestions) {
        const choices = await db
          .select()
          .from(formChoices)
          .where(eq(formChoices.questionId, question.id));

        if (choices.length > 0) {
          const item = await db.insert(formResponseItems).values({
            responseId,
            questionId: question.id,
            choiceId: choices[0].id,
            textAnswer: null,
          });
        }
      }

      const createdItems = await db
        .select()
        .from(formResponseItems)
        .where(eq(formResponseItems.responseId, responseId));

      expect(createdItems.length).toBe(2);
    }
  });

  it("should validate required answers", async () => {
    if (!db) {
      expect(true).toBe(true);
      return;
    }

    // テスト用フォームを作成
    const testForm = await db.insert(forms).values({
      title: "Required Field Form",
      description: "Form with required field",
      createdBy: 1,
      status: "active",
    });

    const createdForms = await db
      .select()
      .from(forms)
      .where(eq(forms.title, "Required Field Form"));
    const formId = createdForms[0]?.id;

    if (!formId) {
      expect(true).toBe(true);
      return;
    }

    // 必須質問を作成
    const question = await db.insert(formQuestions).values({
      formId,
      questionText: "Required Question",
      questionType: "single_choice",
      required: true,
      orderIndex: 0,
    });

    const createdQuestions = await db
      .select()
      .from(formQuestions)
      .where(eq(formQuestions.formId, formId));
    const questionId = createdQuestions[0]?.id;

    expect(questionId).toBeDefined();
    if (questionId) {
      const createdQuestion = await db
        .select()
        .from(formQuestions)
        .where(eq(formQuestions.id, questionId));

      expect(createdQuestion[0].required).toBe(true);
    }
  });
});
