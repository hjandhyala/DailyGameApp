import "server-only";
import { and, asc, desc, eq, gt, like, or, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import type { CatalogGame } from "@/lib/shared/types";
import { faviconFor, hostOf, normalizeUrl, slugify } from "@/lib/shared/url";
import { db } from "./db";
import { favoriteMarks, games, reports, type Game } from "./schema";

export const AUTO_HIDE_REPORTS = 3;

export function toPublic(g: Game): CatalogGame {
  return {
    id: g.id,
    slug: g.slug,
    name: g.name,
    url: g.url,
    host: g.host,
    description: g.description,
    iconUrl: g.iconUrl,
    category: g.category,
    tags: g.tags,
    source: g.source,
    favoriteCount: g.favoriteCount,
    createdAt: g.createdAt,
  };
}

export type SortKey = "popular" | "new" | "az";

export async function listGames(opts: { q?: string; category?: string; sort?: SortKey; limit?: number } = {}) {
  const where = [eq(games.status, "active")];
  if (opts.category) where.push(eq(games.category, opts.category));
  if (opts.q) {
    const q = `%${opts.q.replace(/[%_]/g, "")}%`;
    where.push(or(like(games.name, q), like(games.host, q), like(games.description, q))!);
  }
  const order =
    opts.sort === "new"
      ? [desc(games.createdAt)]
      : opts.sort === "az"
        ? [asc(games.name)]
        : [desc(games.favoriteCount), asc(games.name)];
  const rows = await db
    .select()
    .from(games)
    .where(and(...where))
    .orderBy(...order)
    .limit(Math.min(opts.limit ?? 500, 1000));
  return rows.map(toPublic);
}

export async function getGame(idOrSlug: string) {
  const [g] = await db
    .select()
    .from(games)
    .where(or(eq(games.id, idOrSlug), eq(games.slug, idOrSlug)))
    .limit(1);
  return g ?? null;
}

export async function findByUrl(url: string) {
  const n = normalizeUrl(url);
  if (!n) return null;
  const [g] = await db.select().from(games).where(eq(games.normalizedUrl, n)).limit(1);
  return g ?? null;
}

async function uniqueSlug(base: string) {
  let slug = slugify(base);
  for (let i = 0; i < 5; i++) {
    const [hit] = await db.select({ id: games.id }).from(games).where(eq(games.slug, slug)).limit(1);
    if (!hit) return slug;
    slug = `${slugify(base)}-${randomBytes(2).toString("hex")}`;
  }
  return `${slugify(base)}-${randomBytes(4).toString("hex")}`;
}

export async function createCommunityGame(input: {
  url: string;
  name: string;
  description: string;
  category: string;
  iconUrl?: string | null;
  submitterHash: string;
}) {
  const normalizedUrl = normalizeUrl(input.url)!;
  const existing = await findByUrl(input.url);
  if (existing) return { game: existing, created: false };
  const slug = await uniqueSlug(input.name);
  const [game] = await db
    .insert(games)
    .values({
      id: `c_${randomBytes(8).toString("hex")}`,
      slug,
      name: input.name,
      url: input.url,
      normalizedUrl,
      host: hostOf(input.url),
      description: input.description,
      iconUrl: input.iconUrl || faviconFor(input.url),
      category: input.category,
      source: "community",
      submitterHash: input.submitterHash,
    })
    .onConflictDoNothing()
    .returning();
  if (!game) return { game: (await findByUrl(input.url))!, created: false };
  return { game, created: true };
}

/** Records one report per device; auto-hides at the threshold (counting only reports since last admin review). */
export async function reportGame(gameId: string, reporterHash: string, reason: string, note: string) {
  const game = await getGame(gameId);
  if (!game) return null;
  await db
    .insert(reports)
    .values({ gameId: game.id, reporterHash, reason: reason as "other", note })
    .onConflictDoNothing();
  const since = game.reviewedAt ?? 0;
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(reports)
    .where(and(eq(reports.gameId, game.id), gt(reports.createdAt, since)));
  const hide = game.status === "active" && n >= AUTO_HIDE_REPORTS;
  await db
    .update(games)
    .set({ reportCount: n, ...(hide ? { status: "hidden" as const } : {}), updatedAt: Date.now() })
    .where(eq(games.id, game.id));
  return { reportCount: n, hidden: hide || game.status === "hidden" };
}

export async function setFavoriteMark(gameId: string, deviceHash: string, on: boolean) {
  const game = await getGame(gameId);
  if (!game) return null;
  if (on) {
    await db.insert(favoriteMarks).values({ gameId: game.id, deviceHash }).onConflictDoNothing();
  } else {
    await db
      .delete(favoriteMarks)
      .where(and(eq(favoriteMarks.gameId, game.id), eq(favoriteMarks.deviceHash, deviceHash)));
  }
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(favoriteMarks)
    .where(eq(favoriteMarks.gameId, game.id));
  await db.update(games).set({ favoriteCount: n }).where(eq(games.id, game.id));
  return n;
}
