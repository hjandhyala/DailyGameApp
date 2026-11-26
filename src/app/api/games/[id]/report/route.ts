import { z } from "zod";
import { reportGame } from "@/lib/server/games";
import { deviceHashFrom, ipHashFrom } from "@/lib/server/hash";
import { error, json, parseBody } from "@/lib/server/http";
import { DAY, rateLimit } from "@/lib/server/ratelimit";

const Schema = z.object({
  reason: z.enum(["broken", "spam", "duplicate", "not_daily", "other"]),
  note: z.string().trim().max(500).default(""),
});

export async function POST(req: Request, ctx: RouteContext<"/api/games/[id]/report">) {
  const { id } = await ctx.params;
  const device = deviceHashFrom(req);
  if (!device) return error(400, "Missing device id");
  const body = await parseBody(req, Schema);
  if (!body.ok) return body.res;
  const ok = (await rateLimit(`report:d:${device}`, 20, DAY)) && (await rateLimit(`report:ip:${ipHashFrom(req)}`, 40, DAY));
  if (!ok) return error(429, "Too many reports today");
  const res = await reportGame(id, device, body.data.reason, body.data.note);
  if (!res) return error(404, "Not found");
  return json({ ok: true, ...res });
}
