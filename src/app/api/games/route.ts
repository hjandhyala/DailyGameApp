import { z } from "zod";
import { CATEGORY_IDS } from "@/lib/shared/categories";
import { parseGameUrl } from "@/lib/shared/url";
import { createCommunityGame, listGames, toPublic, type SortKey } from "@/lib/server/games";
import { deviceHashFrom, ipHashFrom } from "@/lib/server/hash";
import { error, json, parseBody } from "@/lib/server/http";
import { assertPublicUrl, UnsafeUrlError } from "@/lib/server/preview";
import { DAY, rateLimit } from "@/lib/server/ratelimit";
import { isBlocked } from "@/lib/server/blocklist";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const sort = (["popular", "new", "az"].includes(sp.get("sort") ?? "") ? sp.get("sort") : "popular") as SortKey;
  const games = await listGames({
    q: sp.get("q")?.slice(0, 80) || undefined,
    category: sp.get("category") || undefined,
    sort,
  });
  return json({ games }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300" } });
}

const CreateSchema = z.object({
  url: z.string().min(4).max(500),
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(280).default(""),
  category: z.enum(CATEGORY_IDS).default("other"),
  iconUrl: z.string().max(500).nullish(),
});

export async function POST(req: Request) {
  const device = deviceHashFrom(req);
  if (!device) return error(400, "Missing device id");
  const body = await parseBody(req, CreateSchema);
  if (!body.ok) return body.res;
  const u = parseGameUrl(body.data.url);
  if (!u) return error(400, "That doesn't look like a valid link");
  try {
    await assertPublicUrl(u);
  } catch (e) {
    if (e instanceof UnsafeUrlError) return error(400, e.message);
    return error(400, "Couldn't resolve that host");
  }
  if (isBlocked(u.hostname, body.data.name, body.data.description)) {
    return error(400, "That link can't be shared to the marketplace");
  }
  const ip = ipHashFrom(req);
  const ok = (await rateLimit(`publish:d:${device}`, 10, DAY)) && (await rateLimit(`publish:ip:${ip}`, 20, DAY));
  if (!ok) return error(429, "You've shared a lot of games today — try again tomorrow");

  let iconUrl = body.data.iconUrl ?? null;
  if (iconUrl && !/^https?:\/\//i.test(iconUrl)) iconUrl = null;
  const { game, created } = await createCommunityGame({
    url: u.toString(),
    name: body.data.name,
    description: body.data.description,
    category: body.data.category,
    iconUrl,
    submitterHash: device,
  });
  if (game.status === "removed") return error(400, "That game was removed from the marketplace");
  return json({ game: toPublic(game), created }, created ? 201 : 200);
}
