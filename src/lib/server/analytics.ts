import "server-only";
import { and, count, countDistinct, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { addDays, dayRange } from "@/lib/shared/dates";
import { db } from "./db";
import { utcDay } from "./http";
import { dailyActive, devices, games, playEvents, reports, syncSpaces } from "./schema";

export interface DayPoint {
  day: string;
  total: number;
  active: number;
  new: number;
  plays: number;
}

export async function usageOverview(days = 30) {
  const today = utcDay();
  const start = addDays(today, -(days - 1));
  const range = dayRange(today, days);

  const [[{ totalUsers }], [{ before }], newByDay, activeByDay, playsByDay] = await Promise.all([
    db.select({ totalUsers: count() }).from(devices),
    db.select({ before: count() }).from(devices).where(sql`${devices.firstSeenDay} < ${start}`),
    db
      .select({ day: devices.firstSeenDay, n: count() })
      .from(devices)
      .where(gte(devices.firstSeenDay, start))
      .groupBy(devices.firstSeenDay),
    db
      .select({ day: dailyActive.day, n: count() })
      .from(dailyActive)
      .where(gte(dailyActive.day, start))
      .groupBy(dailyActive.day),
    db
      .select({ day: playEvents.day, n: count() })
      .from(playEvents)
      .where(gte(playEvents.day, start))
      .groupBy(playEvents.day),
  ]);

  const nb = new Map(newByDay.map((r) => [r.day, r.n]));
  const ab = new Map(activeByDay.map((r) => [r.day, r.n]));
  const pb = new Map(playsByDay.map((r) => [r.day, r.n]));
  let running = before;
  const series: DayPoint[] = range.map((day) => {
    running += nb.get(day) ?? 0;
    return { day, total: running, active: ab.get(day) ?? 0, new: nb.get(day) ?? 0, plays: pb.get(day) ?? 0 };
  });

  const distinctSince = async (from: string) =>
    (await db.select({ n: countDistinct(dailyActive.deviceHash) }).from(dailyActive).where(gte(dailyActive.day, from)))[0].n;

  const [wau, mau, prevWau] = await Promise.all([
    distinctSince(addDays(today, -6)),
    distinctSince(addDays(today, -29)),
    db
      .select({ n: countDistinct(dailyActive.deviceHash) })
      .from(dailyActive)
      .where(and(gte(dailyActive.day, addDays(today, -13)), sql`${dailyActive.day} < ${addDays(today, -6)}`))
      .then((r) => r[0].n),
  ]);

  const platforms = await db.select({ platform: devices.platform, n: count() }).from(devices).groupBy(devices.platform);

  const topPlayedRaw = await db
    .select({ gameId: playEvents.gameId, n: count() })
    .from(playEvents)
    .where(gte(playEvents.day, addDays(today, -6)))
    .groupBy(playEvents.gameId)
    .orderBy(desc(count()))
    .limit(10);
  const ids = topPlayedRaw.map((r) => r.gameId).filter((id) => id !== "custom");
  const names = ids.length ? await db.select({ id: games.id, name: games.name }).from(games).where(inArray(games.id, ids)) : [];
  const nameOf = new Map(names.map((g) => [g.id, g.name]));
  const topPlayed = topPlayedRaw.map((r) => ({ id: r.gameId, name: r.gameId === "custom" ? "Private games" : (nameOf.get(r.gameId) ?? r.gameId), plays: r.n }));

  const topFavorited = await db
    .select({ id: games.id, name: games.name, n: games.favoriteCount })
    .from(games)
    .where(eq(games.status, "active"))
    .orderBy(desc(games.favoriteCount))
    .limit(10);

  const [[{ syncUsers }], catalog, [{ openReports }]] = await Promise.all([
    db.select({ syncUsers: count() }).from(syncSpaces),
    db.select({ source: games.source, status: games.status, n: count() }).from(games).groupBy(games.source, games.status),
    db.select({ openReports: count() }).from(reports).innerJoin(games, eq(games.id, reports.gameId)).where(eq(games.status, "hidden")),
  ]);

  const todayPoint = series[series.length - 1];
  return {
    today,
    totalUsers,
    newToday: todayPoint.new,
    dau: todayPoint.active,
    wau,
    prevWau,
    mau,
    playsToday: todayPoint.plays,
    plays30: series.reduce((a, p) => a + p.plays, 0),
    series,
    platforms,
    topPlayed,
    topFavorited,
    syncUsers,
    catalog: {
      active: catalog.filter((c) => c.status === "active").reduce((a, c) => a + c.n, 0),
      community: catalog.filter((c) => c.source === "community" && c.status !== "removed").reduce((a, c) => a + c.n, 0),
      hidden: catalog.filter((c) => c.status === "hidden").reduce((a, c) => a + c.n, 0),
    },
    openReports,
  };
}

export type UsageOverview = Awaited<ReturnType<typeof usageOverview>>;
