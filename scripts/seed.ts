import { sql } from "drizzle-orm";
import { games } from "../src/lib/server/schema";
import { SEED_GAMES } from "../src/lib/server/seed-games";
import { faviconFor, hostOf, normalizeUrl } from "../src/lib/shared/url";
import { client, db } from "./client";

async function main() {
  let n = 0;
  for (const g of SEED_GAMES) {
    const normalizedUrl = normalizeUrl(g.url)!;
    await db
      .insert(games)
      .values({
        id: g.slug,
        slug: g.slug,
        name: g.name,
        url: g.url,
        normalizedUrl,
        host: hostOf(g.url),
        description: g.description,
        iconUrl: faviconFor(g.url),
        category: g.category,
        tags: g.tags ?? [],
        source: "seed",
      })
      .onConflictDoUpdate({
        target: games.id,
        set: {
          name: g.name,
          url: g.url,
          normalizedUrl,
          host: hostOf(g.url),
          description: g.description,
          category: g.category,
          tags: g.tags ?? [],
          updatedAt: sql`(unixepoch() * 1000)`,
        },
      });
    n++;
  }
  console.log(`✓ seeded ${n} games`);
  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
