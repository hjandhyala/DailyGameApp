import { sql } from "drizzle-orm";
import { games } from "../src/lib/server/schema";
import { SEED_GAMES } from "../src/lib/server/seed-games";
import { faviconFor, hostOf, normalizeUrl } from "../src/lib/shared/url";
import { client, db } from "./client";

/**
 * Inserts seed games that aren't in the database yet. Existing rows are left alone so
 * admin edits survive the seed that runs on every deploy; pass --update to overwrite
 * them with seed-games.ts.
 */
const update = process.argv.includes("--update");

async function main() {
  let n = 0;
  for (const g of SEED_GAMES) {
    const normalizedUrl = normalizeUrl(g.url)!;
    const insert = db.insert(games).values({
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
    });
    const rows = await (update
      ? insert.onConflictDoUpdate({
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
        })
      : insert.onConflictDoNothing()
    ).returning({ id: games.id });
    n += rows.length;
  }
  console.log(
    update ? `✓ upserted ${n} seed games` : `✓ seeded ${n} new games (${SEED_GAMES.length - n} already present)`,
  );
  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
