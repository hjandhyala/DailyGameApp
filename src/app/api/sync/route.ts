import { z } from "zod";
import { ipHashFrom } from "@/lib/server/hash";
import { error, json, parseBody } from "@/lib/server/http";
import { HOUR, rateLimit } from "@/lib/server/ratelimit";
import { deleteSpace, spaceIdFromSecret, SYNC_SECRET_RE, syncSpace } from "@/lib/server/sync";

const Change = z.object({
  kind: z.enum(["favorite", "customGame", "play", "setting"]),
  key: z.string().min(1).max(200),
  payload: z.unknown(),
  updatedAt: z.number().int().nonnegative(),
  deleted: z.boolean(),
});
const Schema = z.object({
  since: z.number().int().nonnegative().default(0),
  changes: z.array(Change).max(500).default([]),
});

function space(req: Request) {
  const secret = req.headers.get("x-sync-key")?.toUpperCase().replace(/[^A-Z2-7]/g, "");
  if (!secret || !SYNC_SECRET_RE.test(secret)) return null;
  return spaceIdFromSecret(secret);
}

export async function POST(req: Request) {
  const id = space(req);
  if (!id) return error(401, "Missing or invalid sync key");
  if (!(await rateLimit(`sync:${id}`, 600, HOUR)) || !(await rateLimit(`sync:ip:${ipHashFrom(req)}`, 1200, HOUR))) {
    return error(429, "Syncing too often");
  }
  const body = await parseBody(req, Schema, 1_000_000);
  if (!body.ok) return body.res;
  for (const c of body.data.changes) {
    if (JSON.stringify(c.payload ?? null).length > 8000) return error(413, "Record too large");
  }
  const changes = body.data.changes.map((c) => ({ ...c, payload: c.payload ?? null }));
  return json(await syncSpace(id, body.data.since, changes));
}

export async function DELETE(req: Request) {
  const id = space(req);
  if (!id) return error(401, "Missing or invalid sync key");
  await deleteSpace(id);
  return json({ ok: true });
}
