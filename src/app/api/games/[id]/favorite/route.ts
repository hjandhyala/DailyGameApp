import { z } from "zod";
import { setFavoriteMark } from "@/lib/server/games";
import { deviceHashFrom } from "@/lib/server/hash";
import { error, json, parseBody } from "@/lib/server/http";
import { HOUR, rateLimit } from "@/lib/server/ratelimit";

const Schema = z.object({ on: z.boolean() });

export async function POST(req: Request, ctx: RouteContext<"/api/games/[id]/favorite">) {
  const { id } = await ctx.params;
  const device = deviceHashFrom(req);
  if (!device) return error(400, "Missing device id");
  const body = await parseBody(req, Schema);
  if (!body.ok) return body.res;
  if (!(await rateLimit(`fav:${device}`, 200, HOUR))) return error(429, "Slow down");
  const count = await setFavoriteMark(id, device, body.data.on);
  if (count === null) return error(404, "Not found");
  return json({ favoriteCount: count });
}
