"use client";
import { db, SYNC_TABLES, type OutboxEntry, type SyncKind } from "./db";
import { storage } from "./device";

const SECRET_KEY = "dgh.syncSecret";
const CURSOR_KEY = "dgh.syncCursor";
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export interface SyncStatus {
  state: "idle" | "syncing" | "error" | "offline" | "off";
  lastSyncAt: number | null;
  error?: string;
}

let status: SyncStatus = { state: "idle", lastSyncAt: null };
const listeners = new Set<(s: SyncStatus) => void>();
function setStatus(s: Partial<SyncStatus>) {
  status = { ...status, ...s };
  listeners.forEach((l) => l(status));
}
export function subscribeSync(fn: (s: SyncStatus) => void) {
  listeners.add(fn);
  fn(status);
  return () => listeners.delete(fn);
}
export const getSyncStatus = () => status;

export function generateSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(17));
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return out.slice(0, 26);
}

export function formatSecret(s: string) {
  return s.match(/.{1,4}/g)?.join("-") ?? s;
}
export function cleanSecret(s: string) {
  return s.toUpperCase().replace(/[^A-Z2-7]/g, "");
}

export const getSecret = () => storage.get(SECRET_KEY);
function ensureSecret() {
  let s = getSecret();
  if (!s) {
    s = generateSecret();
    storage.set(SECRET_KEY, s);
    storage.set(CURSOR_KEY, "0");
  }
  return s;
}

export async function enqueue(kind: SyncKind, key: string) {
  await db.outbox.put({ id: `${kind}:${key}`, kind, key });
  scheduleSync();
}

async function enqueueEverything() {
  const entries: OutboxEntry[] = [];
  for (const kind of Object.keys(SYNC_TABLES) as SyncKind[]) {
    const table = SYNC_TABLES[kind]();
    const keys = (await table.toCollection().primaryKeys()) as string[];
    for (const key of keys) entries.push({ id: `${kind}:${key}`, kind, key });
  }
  await db.outbox.bulkPut(entries);
}

let timer: ReturnType<typeof setTimeout> | undefined;
export function scheduleSync(delay = 2000) {
  if (typeof window === "undefined") return;
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), delay);
}

let running: Promise<void> | null = null;
export function syncNow(): Promise<void> {
  if (running) return running;
  running = doSync().finally(() => (running = null));
  return running;
}

async function doSync() {
  if (typeof navigator !== "undefined" && !navigator.onLine) return setStatus({ state: "offline" });
  const hasLocal = (await db.outbox.count()) > 0;
  // Sync is automatic: create a sync space the first time there's something to save.
  if (!getSecret() && !hasLocal) return setStatus({ state: "off" });
  const secret = ensureSecret();
  setStatus({ state: "syncing", error: undefined });
  try {
    for (let round = 0; round < 20; round++) {
      const outbox = await db.outbox.limit(500).toArray();
      const changes: { kind: SyncKind; key: string; payload: unknown; updatedAt: number; deleted: boolean }[] = [];
      for (const e of outbox) {
        const rec = await SYNC_TABLES[e.kind]().get(e.key);
        if (!rec) continue;
        const { updatedAt, deleted, ...payload } = rec as { updatedAt: number; deleted: boolean };
        changes.push({ kind: e.kind, key: e.key, payload, updatedAt, deleted });
      }
      const since = Number(storage.get(CURSOR_KEY) ?? 0) || 0;
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "content-type": "application/json", "x-sync-key": secret },
        body: JSON.stringify({ since, changes }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Sync failed (${res.status})`);
      const data: {
        cursor: number;
        hasMore: boolean;
        changes: { kind: SyncKind; key: string; payload: Record<string, unknown>; updatedAt: number; deleted: boolean }[];
      } = await res.json();

      await db.transaction("rw", [db.favorites, db.customGames, db.plays, db.settings, db.outbox], async () => {
        // Clear outbox entries whose record hasn't changed since we sent it.
        for (const c of changes) {
          const cur = (await SYNC_TABLES[c.kind as SyncKind]().get(c.key)) as { updatedAt: number } | undefined;
          if (!cur || cur.updatedAt === c.updatedAt) await db.outbox.delete(`${c.kind}:${c.key}`);
        }
        for (const e of outbox) {
          if (!changes.some((c) => c.kind === e.kind && c.key === e.key)) await db.outbox.delete(e.id);
        }
        // Last-write-wins merge of remote changes.
        for (const c of data.changes) {
          const table = SYNC_TABLES[c.kind]?.();
          if (!table) continue;
          const cur = (await table.get(c.key)) as { updatedAt: number } | undefined;
          if (!cur || cur.updatedAt < c.updatedAt) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (table as any).put({ ...c.payload, updatedAt: c.updatedAt, deleted: c.deleted });
          }
        }
      });
      storage.set(CURSOR_KEY, String(data.cursor));
      if (!data.hasMore && (await db.outbox.count()) === 0) break;
    }
    setStatus({ state: "idle", lastSyncAt: Date.now() });
  } catch (e) {
    setStatus({ state: "error", error: e instanceof Error ? e.message : String(e) });
  }
}

/** Explicitly turn sync on (creates a code even with no data yet). */
export async function enableSync() {
  ensureSecret();
  await enqueueEverything();
  await syncNow();
}

/** Link this browser to an existing sync code. */
export async function linkDevice(code: string, mode: "merge" | "replace") {
  const secret = cleanSecret(code);
  if (secret.length !== 26) throw new Error("That sync code doesn't look right — it should be 26 characters");
  if (mode === "replace") {
    await db.transaction("rw", [db.favorites, db.customGames, db.plays, db.settings, db.outbox], async () => {
      await Promise.all([db.favorites.clear(), db.customGames.clear(), db.plays.clear(), db.settings.clear(), db.outbox.clear()]);
    });
  } else {
    await enqueueEverything();
  }
  storage.set(SECRET_KEY, secret);
  storage.set(CURSOR_KEY, "0");
  await syncNow();
  if (status.state === "error") throw new Error(status.error);
}

/** Stop syncing on this device (data stays local and on the server). */
export function unlinkDevice() {
  storage.remove(SECRET_KEY);
  storage.remove(CURSOR_KEY);
  setStatus({ state: "off", lastSyncAt: null });
}

/** Delete the synced copy on the server for every linked device, then stop syncing here. */
export async function deleteRemote() {
  const secret = getSecret();
  if (secret) await fetch("/api/sync", { method: "DELETE", headers: { "x-sync-key": secret } });
  unlinkDevice();
}

/** Issue a new code (old code stops working for new devices); re-uploads everything. */
export async function regenerateSecret() {
  await deleteRemote();
  await enqueueEverything();
  ensureSecret();
  await syncNow();
}

let started = false;
export function startAutoSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  scheduleSync(500);
  window.addEventListener("online", () => scheduleSync(500));
  window.addEventListener("focus", () => scheduleSync(1000));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") scheduleSync(1000);
  });
  setInterval(() => scheduleSync(0), 5 * 60_000);
}
