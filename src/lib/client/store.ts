"use client";
import type { ParsedResult } from "@/lib/parsers";
import { localDay } from "@/lib/shared/dates";
import type { CatalogGame } from "@/lib/shared/types";
import { db, SYNC_TABLES, type CustomGame, type Play, type SyncKind } from "./db";
import { api, storage } from "./device";
import { enqueue } from "./sync";

export const isCustom = (ref: string) => ref.startsWith("custom:");

/** UI-friendly view of any game (catalog or private). */
export interface GameView {
  ref: string;
  slug?: string;
  name: string;
  url: string;
  host: string;
  iconUrl: string | null;
  category: string;
  description: string;
  isCustom: boolean;
  favoriteCount?: number;
}

export function viewOfCatalog(g: CatalogGame): GameView {
  return { ref: g.id, slug: g.slug, name: g.name, url: g.url, host: g.host, iconUrl: g.iconUrl, category: g.category, description: g.description, isCustom: false, favoriteCount: g.favoriteCount };
}
export function viewOfCustom(g: CustomGame): GameView {
  let host = "";
  try {
    host = new URL(g.url).hostname.replace(/^www\./, "");
  } catch {}
  return { ref: g.id, name: g.name, url: g.url, host, iconUrl: g.iconUrl, category: g.category, description: g.description, isCustom: true };
}

// ---------- settings ----------
export interface Settings {
  dayStartHour: number;
  promptAfterPlay: boolean;
}
export const DEFAULT_SETTINGS: Settings = { dayStartHour: 0, promptAfterPlay: true };

export async function getSettings(): Promise<Settings> {
  const rows = await db.settings.toArray();
  const out = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
  for (const r of rows) if (!r.deleted) out[r.key] = r.value;
  return out as unknown as Settings;
}
export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  await db.settings.put({ key, value, updatedAt: Date.now(), deleted: false });
  await enqueue("setting", key);
}
export async function today() {
  return localDay(new Date(), (await getSettings()).dayStartHour);
}

// ---------- favorites ----------
export async function setFavorite(ref: string, on: boolean) {
  const cur = await db.favorites.get(ref);
  const now = Date.now();
  if (on) {
    if (cur && !cur.deleted) return;
    const max = await db.favorites.orderBy("order").last();
    await db.favorites.put({ ref, order: (max?.order ?? 0) + 1, addedAt: now, updatedAt: now, deleted: false });
  } else {
    if (!cur || cur.deleted) return;
    await db.favorites.put({ ...cur, deleted: true, updatedAt: now });
  }
  await enqueue("favorite", ref);
  if (!isCustom(ref)) {
    api(`/api/games/${encodeURIComponent(ref)}/favorite`, { json: { on } }).catch(() => {});
  }
}

export async function reorderFavorites(refs: string[]) {
  const now = Date.now();
  await db.transaction("rw", db.favorites, async () => {
    for (const [i, ref] of refs.entries()) {
      const f = await db.favorites.get(ref);
      if (f && f.order !== i + 1) await db.favorites.put({ ...f, order: i + 1, updatedAt: now });
    }
  });
  for (const ref of refs) await enqueue("favorite", ref);
}

// ---------- custom (private) games ----------
export async function addCustomGame(g: Omit<CustomGame, "id" | "updatedAt" | "deleted">) {
  const id = `custom:${crypto.randomUUID()}`;
  await db.customGames.put({ ...g, id, updatedAt: Date.now(), deleted: false });
  await enqueue("customGame", id);
  await setFavorite(id, true);
  return id;
}

export async function deleteCustomGame(id: string) {
  const g = await db.customGames.get(id);
  if (!g) return;
  await db.customGames.put({ ...g, deleted: true, updatedAt: Date.now() });
  await enqueue("customGame", id);
  await setFavorite(id, false);
}

// ---------- plays ----------
export async function markPlayed(ref: string, opts: { resultText?: string; result?: ParsedResult; day?: string } = {}) {
  const day = opts.day ?? (await today());
  const key = `${ref}|${day}`;
  const now = Date.now();
  const cur = await db.plays.get(key);
  const play: Play = {
    key,
    ref,
    day,
    completedAt: cur && !cur.deleted ? cur.completedAt : now,
    resultText: opts.resultText ?? (cur?.deleted ? undefined : cur?.resultText),
    result: opts.result ?? (cur?.deleted ? undefined : cur?.result),
    updatedAt: now,
    deleted: false,
  };
  await db.plays.put(play);
  await enqueue("play", key);
  if (!cur || cur.deleted) trackPlay(ref);
  return play;
}

export async function unmarkPlayed(ref: string, day?: string) {
  const key = `${ref}|${day ?? (await today())}`;
  const cur = await db.plays.get(key);
  if (!cur || cur.deleted) return;
  await db.plays.put({ ...cur, deleted: true, updatedAt: Date.now() });
  await enqueue("play", key);
}

// ---------- catalog cache ----------
let catalogPromise: Promise<CatalogGame[]> | null = null;
export function refreshCatalog(): Promise<CatalogGame[]> {
  catalogPromise ??= api<{ games: CatalogGame[] }>("/api/games?sort=popular")
    .then(async ({ games }) => {
      // Favorites that are no longer listed (e.g. hidden after reports) are fetched individually.
      const listed = new Set(games.map((g) => g.id));
      const missing = (await db.favorites.toArray()).filter((f) => !f.deleted && !isCustom(f.ref) && !listed.has(f.ref));
      for (const f of missing.slice(0, 50)) {
        const one = await api<{ game: CatalogGame }>(`/api/games/${encodeURIComponent(f.ref)}`).catch(() => null);
        if (one) games.push(one.game);
      }
      await db.transaction("rw", db.catalog, async () => {
        await db.catalog.clear();
        await db.catalog.bulkPut(games);
      });
      return games;
    })
    .catch(async () => db.catalog.toArray())
    .finally(() => setTimeout(() => (catalogPromise = null), 60_000));
  return catalogPromise;
}

export async function cacheCatalogGame(g: CatalogGame) {
  await db.catalog.put(g);
}

// ---------- anonymous usage pings ----------
export function trackVisit() {
  const d = localDay();
  if (storage.get("dgh.lastVisit") === d) return;
  api("/api/events", { json: { type: "visit" } })
    .then(() => storage.set("dgh.lastVisit", d))
    .catch(() => {});
}
function trackPlay(ref: string) {
  api("/api/events", { json: { type: "play", gameId: isCustom(ref) ? "custom:x" : ref } }).catch(() => {});
}

// ---------- export / import ----------
export async function exportData() {
  return {
    app: "daily-games-hub",
    version: 1,
    exportedAt: new Date().toISOString(),
    favorites: await db.favorites.toArray(),
    customGames: await db.customGames.toArray(),
    plays: await db.plays.toArray(),
    settings: await db.settings.toArray(),
  };
}

export async function importData(data: Awaited<ReturnType<typeof exportData>>) {
  if (data?.app !== "daily-games-hub") throw new Error("That file isn't a Daily Games Hub export");
  const merge = async (kind: SyncKind, rows: { updatedAt: number }[] | undefined, keyOf: (r: never) => string) => {
    const table = SYNC_TABLES[kind]() as unknown as {
      get(k: string): Promise<{ updatedAt: number } | undefined>;
      put(r: unknown): Promise<unknown>;
    };
    for (const r of rows ?? []) {
      const key = keyOf(r as never);
      const cur = await table.get(key);
      if (!cur || cur.updatedAt < r.updatedAt) {
        await table.put(r);
        await enqueue(kind, key);
      }
    }
  };
  await merge("favorite", data.favorites, (r: { ref: string }) => r.ref);
  await merge("customGame", data.customGames, (r: { id: string }) => r.id);
  await merge("play", data.plays, (r: { key: string }) => r.key);
  await merge("setting", data.settings, (r: { key: string }) => r.key);
}

export async function clearAllData() {
  await Promise.all([db.favorites.clear(), db.customGames.clear(), db.plays.clear(), db.settings.clear(), db.outbox.clear()]);
}
