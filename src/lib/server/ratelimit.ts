import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { rateLimits } from "./schema";

/**
 * Fixed-window rate limiter stored in SQLite. Returns true if allowed.
 */
export async function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const windowStart = now - (now % windowMs);
  const rows = await db
    .insert(rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`CASE WHEN ${rateLimits.windowStart} = ${windowStart} THEN ${rateLimits.count} + 1 ELSE 1 END`,
        windowStart: sql`${windowStart}`,
      },
    })
    .returning({ count: rateLimits.count });
  return (rows[0]?.count ?? 1) <= limit;
}

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;
