import { migrate } from "drizzle-orm/libsql/migrator";
import { client, db } from "./client";

async function main() {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✓ migrations applied");
  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
