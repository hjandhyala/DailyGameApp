import "server-only";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

type DB = LibSQLDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __db?: DB; __client?: Client };

function make(): DB {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || "file:local.db",
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  });
  globalForDb.__client = client;
  return drizzle(client, { schema });
}

export const db: DB = globalForDb.__db ?? (globalForDb.__db = make());
export { schema };
