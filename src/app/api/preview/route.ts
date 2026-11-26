import { z } from "zod";
import { findByUrl, toPublic } from "@/lib/server/games";
import { deviceHashFrom, ipHashFrom } from "@/lib/server/hash";
import { error, json, parseBody } from "@/lib/server/http";
import { fetchPreview, UnsafeUrlError } from "@/lib/server/preview";
import { HOUR, rateLimit } from "@/lib/server/ratelimit";
import type { LinkPreview } from "@/lib/shared/types";
import { hostOf, normalizeUrl, parseGameUrl } from "@/lib/shared/url";

const Schema = z.object({ url: z.string().min(4).max(500) });

export async function POST(req: Request) {
  const body = await parseBody(req, Schema);
  if (!body.ok) return body.res;
  const key = deviceHashFrom(req) ?? ipHashFrom(req);
  if (!(await rateLimit(`preview:${key}`, 30, HOUR))) return error(429, "Too many previews — try again later");

  const u = parseGameUrl(body.data.url);
  if (!u) return error(400, "That doesn't look like a valid link");

  const existingFirst = await findByUrl(u.toString());
  if (existingFirst && existingFirst.status !== "removed") {
    const g = toPublic(existingFirst);
    return json<LinkPreview>({
      url: g.url,
      normalizedUrl: existingFirst.normalizedUrl,
      host: g.host,
      title: g.name,
      description: g.description,
      iconUrl: g.iconUrl,
      existing: existingFirst.status === "active" ? g : null,
      reachable: true,
    });
  }

  try {
    const p = await fetchPreview(u.toString());
    // Redirects might land on a game we already have.
    const existing = p.url !== u.toString() ? await findByUrl(p.url) : null;
    return json<LinkPreview>({
      url: p.url,
      normalizedUrl: normalizeUrl(p.url) ?? "",
      host: hostOf(p.url),
      title: p.title,
      description: p.description,
      iconUrl: p.iconUrl,
      existing: existing && existing.status === "active" ? toPublic(existing) : null,
      reachable: p.reachable,
    });
  } catch (e) {
    if (e instanceof UnsafeUrlError) return error(400, e.message);
    return error(400, "Couldn't look up that link");
  }
}
