import "./env";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../src/lib/server/schema";

// Vercel's filesystem is read-only, so the local-file fallback would only fail later.
if (process.env.VERCEL && !process.env.TURSO_DATABASE_URL) {
  throw new Error("TURSO_DATABASE_URL must be set on Vercel");
}

export const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});
export const db = drizzle(client, { schema });
