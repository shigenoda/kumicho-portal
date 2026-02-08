import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { InsertUser, users, posts, events, inventory, templates, rules, faq, changelog, secretNotes, riverCleaningRuns } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Support both DATABASE_URL and POSTGRES_URL (Neon/Vercel integration)
function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  const dbUrl = getDatabaseUrl();
  if (!_db && dbUrl) {
    try {
      const client = postgres(dbUrl);
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users);
}

export async function updateUserRole(userId: number, role: string) {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.update(users).set({ role: role as any }).where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update user role:", error);
    return false;
  }
}

// Posts queries
export async function getPublishedPosts(year?: number) {
  const db = await getDb();
  if (!db) return [];
  let query: any = db.select().from(posts).where(eq(posts.status, "published"));
  if (year) {
    query = query.where(eq(posts.year, year));
  }
  return await query.orderBy(desc(posts.publishedAt));
}

export async function getPostById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Events queries
export async function getEventsByYear(year: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(events).orderBy(desc(events.date));
}

// Inventory queries
export async function getAllInventory() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(inventory);
}

export async function getInventoryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(inventory).where(eq(inventory.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Templates queries
export async function getTemplatesByCategory(category: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(templates).where(eq(templates.category, category));
}

// Rules queries
export async function getDecidedRules() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(rules).where(eq(rules.status, "decided"));
}

// FAQ queries
export async function getAllFAQ() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(faq);
}

// Changelog queries
export async function getRecentChangelog(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(changelog).orderBy(desc(changelog.date)).limit(limit);
}

// Secret notes queries (Admin only)
export async function getSecretNotes() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(secretNotes);
}
