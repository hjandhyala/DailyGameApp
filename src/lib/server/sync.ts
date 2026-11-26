import "server-only";
import { and, asc, eq, gt, sql } from "drizzle-orm";
import { db } from "./db";
import { sha256 } from "./hash";
import { syncRecords, syncSpaces } from "./schema";

export interface SyncChange {
  kind: string;
  key: string;
  payload: unknown;
  updatedAt: number;
  deleted: boolean;
}

export function spaceIdFromSecret(secret: string) {
  return sha256(`sync:${secret}`);
}

export const SYNC_SECRET_RE = /^[A-Z2-7]{26}$/;

/**
 * Apply client changes (last-write-wins by updatedAt) and return everything after `since`.
 * Each applied change gets a per-space monotonically increasing seq, used as the pull cursor.
 */
export async function syncSpace(spaceId: string, since: number, changes: SyncChange[]) {
  return db.transaction(async (tx) => {
    await tx
      .insert(syncSpaces)
      .values({ id: spaceId })
      .onConflictDoUpdate({ target: syncSpaces.id, set: { lastSeenAt: Date.now() } });
    const [space] = await tx.select().from(syncSpaces).where(eq(syncSpaces.id, spaceId));
    let seq = space.seq;

    for (const c of changes) {
      const [cur] = await tx
        .select({ updatedAt: syncRecords.updatedAt })
        .from(syncRecords)
        .where(and(eq(syncRecords.spaceId, spaceId), eq(syncRecords.kind, c.kind), eq(syncRecords.key, c.key)));
      if (cur && cur.updatedAt >= c.updatedAt) continue;
      seq++;
      const row = {
        payload: JSON.stringify(c.payload ?? null),
        updatedAt: c.updatedAt,
        deleted: c.deleted,
        seq,
      };
      await tx
        .insert(syncRecords)
        .values({ spaceId, kind: c.kind, key: c.key, ...row })
        .onConflictDoUpdate({ target: [syncRecords.spaceId, syncRecords.kind, syncRecords.key], set: row });
    }
    if (seq !== space.seq) {
      await tx.update(syncSpaces).set({ seq }).where(eq(syncSpaces.id, spaceId));
    }

    // A cursor beyond the space's seq means the space was deleted and recreated: pull everything.
    const from = since > seq ? 0 : since;
    const rows = await tx
      .select()
      .from(syncRecords)
      .where(and(eq(syncRecords.spaceId, spaceId), gt(syncRecords.seq, from)))
      .orderBy(asc(syncRecords.seq))
      .limit(5000);
    return {
      cursor: rows.length ? rows[rows.length - 1].seq : from,
      hasMore: rows.length === 5000,
      changes: rows.map((r) => ({
        kind: r.kind,
        key: r.key,
        payload: JSON.parse(r.payload),
        updatedAt: r.updatedAt,
        deleted: r.deleted,
      })),
    };
  });
}

export async function deleteSpace(spaceId: string) {
  await db.delete(syncRecords).where(eq(syncRecords.spaceId, spaceId));
  await db.delete(syncSpaces).where(eq(syncSpaces.id, spaceId));
}

export async function spaceCount() {
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(syncSpaces);
  return n;
}
