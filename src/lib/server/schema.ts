import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const now = sql`(unixepoch() * 1000)`;

export const games = sqliteTable(
  "games",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    normalizedUrl: text("normalized_url").notNull(),
    host: text("host").notNull(),
    description: text("description").notNull().default(""),
    iconUrl: text("icon_url"),
    category: text("category").notNull().default("other"),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    source: text("source", { enum: ["seed", "community"] }).notNull(),
    status: text("status", { enum: ["active", "hidden", "removed"] }).notNull().default("active"),
    reportCount: integer("report_count").notNull().default(0),
    favoriteCount: integer("favorite_count").notNull().default(0),
    submitterHash: text("submitter_hash"),
    reviewedAt: integer("reviewed_at"),
    createdAt: integer("created_at").notNull().default(now),
    updatedAt: integer("updated_at").notNull().default(now),
  },
  (t) => [
    uniqueIndex("games_slug_idx").on(t.slug),
    uniqueIndex("games_normalized_url_idx").on(t.normalizedUrl),
    index("games_status_idx").on(t.status),
  ],
);

export const reports = sqliteTable(
  "reports",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    gameId: text("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
    reporterHash: text("reporter_hash").notNull(),
    reason: text("reason", {
      enum: ["broken", "spam", "duplicate", "not_daily", "other"],
    }).notNull(),
    note: text("note").notNull().default(""),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [uniqueIndex("reports_game_reporter_idx").on(t.gameId, t.reporterHash)],
);

export const favoriteMarks = sqliteTable(
  "favorite_marks",
  {
    gameId: text("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
    deviceHash: text("device_hash").notNull(),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.deviceHash] })],
);

export const syncSpaces = sqliteTable("sync_spaces", {
  id: text("id").primaryKey(), // sha256(secret)
  seq: integer("seq").notNull().default(0),
  createdAt: integer("created_at").notNull().default(now),
  lastSeenAt: integer("last_seen_at").notNull().default(now),
});

export const syncRecords = sqliteTable(
  "sync_records",
  {
    spaceId: text("space_id").notNull().references(() => syncSpaces.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    key: text("key").notNull(),
    payload: text("payload").notNull(),
    updatedAt: integer("updated_at").notNull(),
    deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
    seq: integer("seq").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.spaceId, t.kind, t.key] }),
    index("sync_records_seq_idx").on(t.spaceId, t.seq),
  ],
);

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: integer("window_start").notNull(),
  count: integer("count").notNull(),
});

/** Anonymous usage analytics — one row per device (salted hash, never the raw id). */
export const devices = sqliteTable(
  "devices",
  {
    hash: text("hash").primaryKey(),
    platform: text("platform").notNull().default("unknown"), // mobile | desktop | unknown
    firstSeenDay: text("first_seen_day").notNull(), // YYYY-MM-DD (UTC)
    lastSeenDay: text("last_seen_day").notNull(),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("devices_first_seen_idx").on(t.firstSeenDay)],
);

export const dailyActive = sqliteTable(
  "daily_active",
  {
    day: text("day").notNull(),
    deviceHash: text("device_hash").notNull(),
  },
  (t) => [primaryKey({ columns: [t.day, t.deviceHash] })],
);

export const playEvents = sqliteTable(
  "play_events",
  {
    day: text("day").notNull(),
    deviceHash: text("device_hash").notNull(),
    gameId: text("game_id").notNull(), // catalog id, or "custom"
  },
  (t) => [
    primaryKey({ columns: [t.day, t.deviceHash, t.gameId] }),
    index("play_events_game_idx").on(t.gameId, t.day),
  ],
);

export type Game = typeof games.$inferSelect;
