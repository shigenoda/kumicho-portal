import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { users, leaderSchedule } from "../../drizzle/schema";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
    
    // ユーザーが存在する場合、現年度の組長かどうかを確認
    if (user) {
      const db = await getDb();
      if (db) {
        // 現在の年度を判定（4月が新年度）
        const now = new Date();
        const month = now.getMonth() + 1;
        const currentYear = month >= 4 ? now.getFullYear() : now.getFullYear() - 1;
        
        // 現年度の組長スケジュールを取得
        const schedule = await db
          .select()
          .from(leaderSchedule)
          .where(eq(leaderSchedule.year, currentYear))
          .limit(1);
        
        // ユーザーの住戸IDが現年度の組長候補に含まれているかを確認
        if (schedule[0] && (
          schedule[0].primaryHouseholdId === user.householdId ||
          schedule[0].backupHouseholdId === user.householdId
        )) {
          // 組長の場合、admin権限に更新
          if (user.role !== "admin") {
            await db
              .update(users)
              .set({ role: "admin" })
              .where(eq(users.id, user.id));
            
            user.role = "admin";
          }
        }
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
