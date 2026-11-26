import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { dailyActive, devices, playEvents } from "./schema";
import { utcDay } from "./http";

export function platformFrom(ua: string | null) {
  if (!ua) return "unknown";
  return /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? "mobile" : "desktop";
}

/** Record that an anonymous device was active today. Idempotent per device per day. */
export async function recordVisit(deviceHash: string, ua: string | null) {
  const day = utcDay();
  await db
    .insert(devices)
    .values({ hash: deviceHash, platform: platformFrom(ua), firstSeenDay: day, lastSeenDay: day })
    .onConflictDoUpdate({ target: devices.hash, set: { lastSeenDay: day } });
  await db.insert(dailyActive).values({ day, deviceHash }).onConflictDoNothing();
}

export async function recordPlay(deviceHash: string, gameId: string, ua: string | null) {
  await recordVisit(deviceHash, ua);
  await db.insert(playEvents).values({ day: utcDay(), deviceHash, gameId }).onConflictDoNothing();
}

export async function totalUsers() {
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(devices);
  return n;
}
