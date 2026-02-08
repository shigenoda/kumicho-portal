import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import { z } from "zod";
import { getDb } from "./db";
import { eq, like, or, and, desc, asc, lte, gte } from "drizzle-orm";
import {
  posts,
  events,
  inventory,
  templates,
  rules,
  faq,
  changelog,
  secretNotes,
  households,
  leaderSchedule,
  leaderRotationLogic,
  exemptionRequests,
  ruleVersions,
  pendingQueue,
  handoverBagItems,
  memberTopSummary,
  residentEmails,
  forms,
  formQuestions,
  formChoices,
  formResponses,
  formResponseItems,
} from "../drizzle/schema";

// 変更ログをDBに記録するヘルパー
async function logChange(summary: string, entityType: string, entityId?: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(changelog).values({
    summary,
    date: new Date(),
    relatedEntityType: entityType,
    relatedEntityId: entityId ?? null,
  });
}

export const appRouter = router({
  system: systemRouter,

  // 認証不要 - meはnullを返す
  auth: router({
    me: publicProcedure.query(() => null),
    logout: publicProcedure.mutation(() => ({ success: true }) as const),
  }),

  // Member トップ用 API
  memberTop: router({
    getSummary: publicProcedure
      .input(z.object({ year: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;

        const summary = await db
          .select()
          .from(memberTopSummary)
          .where(eq(memberTopSummary.year, input.year))
          .limit(1);

        return summary[0] || null;
      }),

    getLeaderSchedule: publicProcedure
      .input(z.object({ year: z.number().optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const currentYear = input.year || new Date().getFullYear();
        const schedules = await db
          .select()
          .from(leaderSchedule)
          .where(and(gte(leaderSchedule.year, currentYear), lte(leaderSchedule.year, currentYear + 8)))
          .orderBy(asc(leaderSchedule.year));

        return schedules;
      }),

    getPendingQueue: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      const pending = await db
        .select()
        .from(pendingQueue)
        .where(eq(pendingQueue.status, "pending"))
        .orderBy(desc(pendingQueue.priority), asc(pendingQueue.createdAt));

      return pending;
    }),
  }),

  // ローテ管理 API
  leaderRotation: router({
    calculateNextYear: publicProcedure
      .input(z.object({ year: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const logicRecords = await db
          .select()
          .from(leaderRotationLogic)
          .orderBy(desc(leaderRotationLogic.version))
          .limit(1);

        const logic = logicRecords[0]?.logic;
        if (!logic) throw new Error("No rotation logic defined");

        const allHouseholds = await db.select().from(households);

        const prevYear = input.year - 1;
        const prevScheduleArray = await db
          .select()
          .from(leaderSchedule)
          .where(eq(leaderSchedule.year, prevYear))
          .limit(1);
        const prevSchedule = prevScheduleArray[0];

        const exemptions = await db
          .select()
          .from(exemptionRequests)
          .where(
            and(
              eq(exemptionRequests.year, input.year),
              eq(exemptionRequests.status, "approved")
            )
          );

        const exemptedHouseholds = new Set(exemptions.map((e) => e.householdId));

        const candidates = allHouseholds
          .filter((h) => !exemptedHouseholds.has(h.householdId))
          .sort((a, b) => {
            const aYearsSinceLast = prevSchedule
              ? prevSchedule.primaryHouseholdId === a.householdId ? 1 : 999
              : 999;
            const bYearsSinceLast = prevSchedule
              ? prevSchedule.primaryHouseholdId === b.householdId ? 1 : 999
              : 999;

            if (aYearsSinceLast !== bYearsSinceLast) {
              return bYearsSinceLast - aYearsSinceLast;
            }

            if (a.moveInDate && b.moveInDate) {
              return a.moveInDate.getTime() - b.moveInDate.getTime();
            }

            return a.householdId.localeCompare(b.householdId);
          });

        if (candidates.length < 2) {
          throw new Error("Not enough eligible households for rotation");
        }

        const primary = candidates[0];
        const backup = candidates[1];

        await db.insert(leaderSchedule).values({
          year: input.year,
          primaryHouseholdId: primary.householdId,
          backupHouseholdId: backup.householdId,
          status: "draft",
          reason: `自動計算: 前回担当からの経過年数、入居開始日、住戸ID昇順で選定`,
        });

        await logChange(`${input.year}年度ローテを自動計算`, "leaderSchedule");

        return {
          success: true,
          primary: primary.householdId,
          backup: backup.householdId,
        };
      }),

    confirm: publicProcedure
      .input(z.object({ scheduleId: z.number(), status: z.enum(["conditional", "confirmed"]) }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db
          .update(leaderSchedule)
          .set({ status: input.status })
          .where(eq(leaderSchedule.id, input.scheduleId));

        await logChange(`ローテステータスを「${input.status}」に変更`, "leaderSchedule", input.scheduleId);

        return { success: true };
      }),

    updateLogic: publicProcedure
      .input(
        z.object({
          priority: z.array(z.string()),
          excludeConditions: z.array(z.string()),
          reason: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const latestLogic = await db
          .select()
          .from(leaderRotationLogic)
          .orderBy(desc(leaderRotationLogic.version))
          .limit(1);

        const nextVersion = (latestLogic[0]?.version || 0) + 1;

        await db.insert(leaderRotationLogic).values({
          version: nextVersion,
          logic: {
            priority: input.priority,
            excludeConditions: input.excludeConditions,
          },
          reason: input.reason,
        });

        await logChange(`ローテロジック v${nextVersion} を更新`, "leaderRotationLogic");

        return { success: true, version: nextVersion };
      }),
  }),

  // 検索機能
  search: router({
    global: publicProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const searchTerm = `%${input.query}%`;

        try {
          const results = await Promise.all([
            db
              .select()
              .from(posts)
              .where(or(like(posts.title, searchTerm), like(posts.body, searchTerm)))
              .limit(5),
            db
              .select()
              .from(inventory)
              .where(or(like(inventory.name, searchTerm), like(inventory.notes, searchTerm)))
              .limit(5),
            db
              .select()
              .from(rules)
              .where(or(like(rules.title, searchTerm), like(rules.details, searchTerm)))
              .limit(5),
            db
              .select()
              .from(faq)
              .where(or(like(faq.question, searchTerm), like(faq.answer, searchTerm)))
              .limit(5),
            db
              .select()
              .from(templates)
              .where(or(like(templates.title, searchTerm), like(templates.body, searchTerm)))
              .limit(5),
          ]);

          return {
            posts: results[0],
            inventory: results[1],
            rules: results[2],
            faq: results[3],
            templates: results[4],
          };
        } catch (error) {
          console.error("Search error:", error);
          return [];
        }
      }),
  }),

  // データ取得・更新 API（全て公開）
  data: router({
    getEvents: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(events).orderBy(asc(events.date));
    }),

    getInventory: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(inventory).orderBy(asc(inventory.name));
    }),

    getTemplates: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(templates).orderBy(asc(templates.category));
    }),

    getRules: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(rules).orderBy(asc(rules.title));
    }),

    getFAQ: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(faq).orderBy(asc(faq.question));
    }),

    updateFAQ: publicProcedure
      .input(
        z.object({
          id: z.number(),
          question: z.string().min(1),
          answer: z.string().min(1),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        await db
          .update(faq)
          .set({
            question: input.question,
            answer: input.answer,
            updatedAt: new Date(),
          })
          .where(eq(faq.id, input.id));

        await logChange(`FAQ「${input.question}」を更新`, "faq", input.id);

        return { success: true };
      }),

    deleteFAQ: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        await db.delete(faq).where(eq(faq.id, input.id));

        await logChange(`FAQ (ID: ${input.id}) を削除`, "faq", input.id);

        return { success: true };
      }),

    getPosts: publicProcedure
      .input(z.object({ year: z.number().optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const currentYear = input.year || new Date().getFullYear();
        return await db
          .select()
          .from(posts)
          .where(eq(posts.year, currentYear))
          .orderBy(desc(posts.updatedAt));
      }),

    getChangelog: publicProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return await db
          .select()
          .from(changelog)
          .orderBy(desc(changelog.date))
          .limit(input.limit);
      }),

    getSecretNotes: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(secretNotes).orderBy(desc(secretNotes.updatedAt));
    }),

    getHandoverBagItems: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(handoverBagItems).orderBy(asc(handoverBagItems.name));
    }),

    getHouseholds: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(households).orderBy(asc(households.householdId));
    }),

    updateHousehold: publicProcedure
      .input(
        z.object({
          householdId: z.string(),
          moveInDate: z.date().optional(),
          leaderHistoryCount: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db
          .update(households)
          .set({
            moveInDate: input.moveInDate,
            leaderHistoryCount: input.leaderHistoryCount,
          })
          .where(eq(households.householdId, input.householdId));

        await logChange(`住戸 ${input.householdId} の情報を更新`, "households");

        return { success: true };
      }),

    recalculateSchedules: publicProcedure
      .input(z.object({ year: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const allHouseholds = await db.select().from(households);
        const prevYear = input.year - 1;
        const prevScheduleArray = await db
          .select()
          .from(leaderSchedule)
          .where(eq(leaderSchedule.year, prevYear))
          .limit(1);
        const prevSchedule = prevScheduleArray[0];

        const exemptions = await db
          .select()
          .from(exemptionRequests)
          .where(
            and(
              eq(exemptionRequests.year, input.year),
              eq(exemptionRequests.status, "approved")
            )
          );

        const exemptedHouseholds = new Set(exemptions.map((e) => e.householdId));
        const now = new Date();
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
        const lessThanYearHouseholds = new Set(
          allHouseholds
            .filter((h) => h.moveInDate && h.moveInDate > twelveMonthsAgo)
            .map((h) => h.householdId)
        );

        const recentLeaderHouseholds = new Set(
          allHouseholds
            .filter((h) => (h.leaderHistoryCount || 0) > 0)
            .map((h) => h.householdId)
        );

        const candidates = allHouseholds
          .filter((h) => {
            return !exemptedHouseholds.has(h.householdId) &&
                   !lessThanYearHouseholds.has(h.householdId) &&
                   !recentLeaderHouseholds.has(h.householdId);
          })
          .sort((a, b) => {
            const aYearsSinceLast = prevSchedule
              ? prevSchedule.primaryHouseholdId === a.householdId ? 1 : 999
              : 999;
            const bYearsSinceLast = prevSchedule
              ? prevSchedule.primaryHouseholdId === b.householdId ? 1 : 999
              : 999;

            if (aYearsSinceLast !== bYearsSinceLast) {
              return bYearsSinceLast - aYearsSinceLast;
            }

            if (a.moveInDate && b.moveInDate) {
              return a.moveInDate.getTime() - b.moveInDate.getTime();
            }

            return a.householdId.localeCompare(b.householdId);
          });

        await db
          .delete(leaderSchedule)
          .where(eq(leaderSchedule.year, input.year));

        if (candidates.length >= 2) {
          const primary = candidates[0];
          const backup = candidates[1];

          await db.insert(leaderSchedule).values({
            year: input.year,
            primaryHouseholdId: primary.householdId,
            backupHouseholdId: backup.householdId,
            status: "draft",
            reason: "自動再計算",
          });
        }

        await logChange(`${input.year}年度ローテを再計算`, "leaderSchedule");

        return { success: true, candidateCount: candidates.length };
      }),

    getRotationWithReasons: publicProcedure
      .input(z.object({ year: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const allHouseholds = await db.select().from(households);

        const prevYear = input.year - 1;
        const prevScheduleArray = await db
          .select()
          .from(leaderSchedule)
          .where(eq(leaderSchedule.year, prevYear))
          .limit(1);
        const prevSchedule = prevScheduleArray[0];

        const exemptions = await db
          .select()
          .from(exemptionRequests)
          .where(
            and(
              eq(exemptionRequests.year, input.year),
              eq(exemptionRequests.status, "approved")
            )
          );

        const exemptedHouseholds = new Set(exemptions.map((e) => e.householdId));

        const now = new Date();
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
        const lessThanYearHouseholds = new Set(
          allHouseholds
            .filter((h) => h.moveInDate && h.moveInDate > twelveMonthsAgo)
            .map((h) => h.householdId)
        );

        const recentLeaderHouseholds = new Set(
          allHouseholds
            .filter((h) => (h.leaderHistoryCount || 0) > 0)
            .map((h) => h.householdId)
        );

        const householdsWithReasons = allHouseholds.map((h) => {
          const reasons: string[] = [];
          if (lessThanYearHouseholds.has(h.householdId)) {
            reasons.push("A");
          }
          if (recentLeaderHouseholds.has(h.householdId)) {
            reasons.push("B");
          }
          if (exemptedHouseholds.has(h.householdId)) {
            reasons.push("C");
          }

          return {
            householdId: h.householdId,
            moveInDate: h.moveInDate,
            leaderHistoryCount: h.leaderHistoryCount || 0,
            reasons: reasons,
            isCandidate: reasons.length === 0,
          };
        });

        const schedule = await db
          .select()
          .from(leaderSchedule)
          .where(eq(leaderSchedule.year, input.year))
          .limit(1);

        return {
          year: input.year,
          households: householdsWithReasons,
          schedule: schedule[0] || null,
        };
      }),

    getResidentEmails: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(residentEmails);
    }),

    getForms: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(forms).orderBy(desc(forms.createdAt));
    }),

    // 認証不要：アクティブなフォーム一覧を返す
    getActiveForms: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      const activeForms = await db
        .select()
        .from(forms)
        .where(eq(forms.status, "active"))
        .orderBy(desc(forms.createdAt));

      const formsWithDetails = await Promise.all(
        activeForms.map(async (form) => {
          const questions = await db
            .select()
            .from(formQuestions)
            .where(eq(formQuestions.formId, form.id))
            .orderBy(asc(formQuestions.orderIndex));

          const questionsWithChoices = await Promise.all(
            questions.map(async (question) => {
              const choices = await db
                .select()
                .from(formChoices)
                .where(eq(formChoices.questionId, question.id))
                .orderBy(asc(formChoices.orderIndex));

              return { ...question, choices };
            })
          );

          return { ...form, questions: questionsWithChoices };
        })
      );

      return formsWithDetails;
    }),

    submitFormResponse: publicProcedure
      .input(
        z.object({
          formId: z.number(),
          householdId: z.string().optional(),
          answers: z.array(
            z.object({
              questionId: z.number(),
              choiceId: z.number().optional(),
              textAnswer: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        try {
          const [createdResponse] = await db.insert(formResponses).values({
            formId: input.formId,
            householdId: input.householdId || null,
            submittedAt: new Date(),
          }).returning();

          const responseId = createdResponse.id;

          for (const answer of input.answers) {
            await db.insert(formResponseItems).values({
              responseId,
              questionId: answer.questionId,
              choiceId: answer.choiceId || null,
              textAnswer: answer.textAnswer || null,
            });
          }

          const formData = await db.select().from(forms).where(eq(forms.id, input.formId)).limit(1);
          if (formData.length > 0) {
            try {
              await notifyOwner({
                title: `フォーム回答: ${formData[0].title}`,
                content: `${input.householdId || "匿名"} から「${formData[0].title}」への回答がありました。`,
              });
            } catch (notifyError) {
              console.warn("Failed to send notification:", notifyError);
            }
          }

          await logChange(`フォーム「${formData[0]?.title}」に回答`, "formResponses", responseId);

          return { success: true, responseId };
        } catch (error) {
          console.error("Form submission error:", error);
          throw new Error("Failed to submit form response");
        }
      }),

    createForm: publicProcedure
      .input(
        z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          dueDate: z.string().optional(),
          questions: z.array(
            z.object({
              text: z.string().min(1),
              type: z.enum(["single_choice", "multiple_choice"]),
              choices: z.array(z.string().min(1)),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        try {
          const [createdForm] = await db.insert(forms).values({
            title: input.title,
            description: input.description || null,
            dueDate: input.dueDate ? new Date(input.dueDate) : null,
            status: "draft",
          }).returning();

          const formId = createdForm.id;

          for (let qIndex = 0; qIndex < input.questions.length; qIndex++) {
            const question = input.questions[qIndex];

            const [createdQuestion] = await db.insert(formQuestions).values({
              formId,
              questionText: question.text,
              questionType: question.type,
              required: true,
              orderIndex: qIndex,
            }).returning();

            const questionId = createdQuestion.id;

            for (let cIndex = 0; cIndex < question.choices.length; cIndex++) {
              const choice = question.choices[cIndex];
              if (choice.trim()) {
                await db.insert(formChoices).values({
                  questionId,
                  choiceText: choice,
                  orderIndex: cIndex,
                });
              }
            }
          }

          await logChange(`フォーム「${input.title}」を作成`, "forms", formId);

          return { success: true, formId };
        } catch (error) {
          console.error("Form creation error:", error);
          throw new Error("Failed to create form");
        }
      }),

    getFormStats: publicProcedure
      .input(z.object({ formId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;

        try {
          const form = await db.select().from(forms).where(eq(forms.id, input.formId)).limit(1);
          if (!form.length) throw new Error("Form not found");

          const questions = await db
            .select()
            .from(formQuestions)
            .where(eq(formQuestions.formId, input.formId))
            .orderBy(asc(formQuestions.orderIndex));

          const questionStats = await Promise.all(
            questions.map(async (question) => {
              const choices = await db
                .select()
                .from(formChoices)
                .where(eq(formChoices.questionId, question.id))
                .orderBy(asc(formChoices.orderIndex));

              const choiceStats = await Promise.all(
                choices.map(async (choice) => {
                  const count = await db
                    .select()
                    .from(formResponseItems)
                    .where(and(eq(formResponseItems.questionId, question.id), eq(formResponseItems.choiceId, choice.id)));

                  return {
                    id: choice.id,
                    text: choice.choiceText,
                    count: count.length,
                  };
                })
              );

              return {
                id: question.id,
                text: question.questionText,
                type: question.questionType,
                choices: choiceStats,
              };
            })
          );

          const responses = await db
            .select()
            .from(formResponses)
            .where(eq(formResponses.formId, input.formId));

          const respondents = await Promise.all(
            responses.map(async (response) => {
              const items = await db
                .select()
                .from(formResponseItems)
                .where(eq(formResponseItems.responseId, response.id));

              return {
                id: response.id,
                householdId: response.householdId,
                submittedAt: response.submittedAt,
                answerCount: items.length,
              };
            })
          );

          const allHouseholds = await db.select().from(households);
          const respondedHouseholds = new Set(respondents.map((r) => r.householdId));
          const unansweredHouseholds = allHouseholds.filter(
            (h) => !respondedHouseholds.has(h.householdId)
          );

          return {
            form: form[0],
            questions: questionStats,
            respondents,
            totalHouseholds: allHouseholds.length,
            respondedCount: respondents.length,
            unansweredCount: unansweredHouseholds.length,
            unansweredHouseholds,
          };
        } catch (error) {
          console.error("Form stats error:", error);
          throw new Error("Failed to get form stats");
        }
      }),

    updateForm: publicProcedure
      .input(
        z.object({
          formId: z.number(),
          title: z.string().min(1).optional(),
          description: z.string().optional(),
          dueDate: z.string().optional(),
          status: z.enum(["draft", "active", "closed"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        try {
          const updateData: any = {};
          if (input.title) updateData.title = input.title;
          if (input.description !== undefined) updateData.description = input.description || null;
          if (input.dueDate !== undefined) updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
          if (input.status) updateData.status = input.status;

          await db.update(forms).set(updateData).where(eq(forms.id, input.formId));

          await logChange(`フォーム (ID: ${input.formId}) を更新`, "forms", input.formId);

          return { success: true };
        } catch (error) {
          console.error("Form update error:", error);
          throw new Error("Failed to update form");
        }
      }),

    deleteForm: publicProcedure
      .input(z.object({ formId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");

        try {
          const responses = await db
            .select()
            .from(formResponses)
            .where(eq(formResponses.formId, input.formId));

          for (const response of responses) {
            await db
              .delete(formResponseItems)
              .where(eq(formResponseItems.responseId, response.id));
          }

          await db.delete(formResponses).where(eq(formResponses.formId, input.formId));

          const questions = await db
            .select()
            .from(formQuestions)
            .where(eq(formQuestions.formId, input.formId));

          for (const question of questions) {
            await db.delete(formChoices).where(eq(formChoices.questionId, question.id));
          }

          await db.delete(formQuestions).where(eq(formQuestions.formId, input.formId));

          await db.delete(forms).where(eq(forms.id, input.formId));

          await logChange(`フォーム (ID: ${input.formId}) を削除`, "forms", input.formId);

          return { success: true };
        } catch (error) {
          console.error("Form deletion error:", error);
          throw new Error("Failed to delete form");
        }
      }),
  }),

  // 投稿管理 API
  posts: router({
    create: publicProcedure
      .input(
        z.object({
          title: z.string(),
          body: z.string(),
          tags: z.array(z.string()),
          category: z.enum(["inquiry", "answer", "decision", "pending", "trouble", "improvement"]),
          year: z.number(),
          isHypothesis: z.boolean().default(false),
          relatedLinks: z.array(z.string()).default([]),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.insert(posts).values({
          title: input.title,
          body: input.body,
          tags: input.tags,
          category: input.category,
          year: input.year,
          status: "published",
          isHypothesis: input.isHypothesis,
          relatedLinks: input.relatedLinks,
          publishedAt: new Date(),
        });

        await logChange(`投稿「${input.title}」を作成`, "posts");

        return { success: true };
      }),

    approve: publicProcedure
      .input(z.object({ postId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db
          .update(posts)
          .set({ status: "published", publishedAt: new Date() })
          .where(eq(posts.id, input.postId));

        await logChange(`投稿 (ID: ${input.postId}) を承認`, "posts", input.postId);

        return { success: true };
      }),
  }),

  // リマインダーメール送信
  reminder: router({
    sendFormReminderEmails: publicProcedure.mutation(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const upcomingForms = await db
        .select()
        .from(forms)
        .where(
          and(
            eq(forms.status, "active"),
            gte(forms.dueDate, now),
            lte(forms.dueDate, in24Hours)
          )
        );

      for (const form of upcomingForms) {
        const unansweredHouseholds = await db
          .select({ householdId: households.householdId })
          .from(households)
          .leftJoin(
            formResponses,
            and(
              eq(formResponses.householdId, households.householdId),
              eq(formResponses.formId, form.id)
            )
          )
          .where(eq(formResponses.id, null as any));

        for (const household of unansweredHouseholds) {
          await notifyOwner({
            title: `フォーム回答リマインダー: ${form.title}`,
            content: `住戸 ${household.householdId} へ\n\n下記のフォームの回答期限が近づいています。\n\nフォーム: ${form.title}\n期限: ${form.dueDate?.toLocaleString("ja-JP")}\n\nお早めに回答いただけるようお願いします。`,
          });
        }
      }

      return { success: true, formsProcessed: upcomingForms.length };
    }),
  }),
});

export type AppRouter = typeof appRouter;
