"use client";
import Dexie, { type EntityTable } from "dexie";
import type { ParsedResult } from "@/lib/parsers";
import type { CatalogGame } from "@/lib/shared/types";

export interface Synced {
  updatedAt: number;
  deleted: boolean;
}

export interface Favorite extends Synced {
  ref: string; // catalog game id, or "custom:<uuid>"
  order: number;
  addedAt: number;
}

export interface CustomGame extends Synced {
  id: string; // "custom:<uuid>"
  name: string;
  url: string;
  iconUrl: string | null;
  category: string;
  description: string;
  /** If later published, the catalog id it maps to. */
  publishedId?: string;
}

export interface Play extends Synced {
  key: string; // `${ref}|${day}`
  ref: string;
  day: string; // YYYY-MM-DD local
  completedAt: number;
  resultText?: string;
  result?: ParsedResult;
}

export interface Setting extends Synced {
  key: string;
  value: unknown;
}

export interface OutboxEntry {
  id: string; // `${kind}:${key}`
  kind: SyncKind;
  key: string;
}

export type SyncKind = "favorite" | "customGame" | "play" | "setting";

class HubDB extends Dexie {
  favorites!: EntityTable<Favorite, "ref">;
  customGames!: EntityTable<CustomGame, "id">;
  plays!: EntityTable<Play, "key">;
  settings!: EntityTable<Setting, "key">;
  catalog!: EntityTable<CatalogGame, "id">;
  outbox!: EntityTable<OutboxEntry, "id">;

  constructor() {
    super("daily-games-hub");
    this.version(1).stores({
      favorites: "ref, order, deleted",
      customGames: "id, deleted",
      plays: "key, ref, day, deleted",
      settings: "key",
      catalog: "id, slug, category",
      outbox: "id",
    });
  }
}

export const db = new HubDB();

export const SYNC_TABLES = {
  favorite: () => db.favorites,
  customGame: () => db.customGames,
  play: () => db.plays,
  setting: () => db.settings,
} as const;
