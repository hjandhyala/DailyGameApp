import { z } from "zod";
import { deviceHashFrom } from "@/lib/server/hash";
import { error, json, parseBody } from "@/lib/server/http";
import { HOUR, rateLimit } from "@/lib/server/ratelimit";
import { recordPlay, recordVisit } from "@/lib/server/usage";

const Schema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("visit") }),
  z.object({ type: z.literal("play"), gameId: z.string().min(1).max(64) }),
]);

/** Anonymous usage pings (salted device hash only) powering the admin usage dashboard. */
export async function POST(req: Request) {
  const device = deviceHashFrom(req);
  if (!device) return error(400, "Missing device id");
  const body = await parseBody(req, Schema, 2000);
  if (!body.ok) return body.res;
  if (!(await rateLimit(`events:${device}`, 300, HOUR))) return error(429, "Slow down");
  const ua = req.headers.get("user-agent");
  if (body.data.type === "visit") await recordVisit(device, ua);
  else await recordPlay(device, body.data.gameId.startsWith("custom:") ? "custom" : body.data.gameId, ua);
  return json({ ok: true });
}
