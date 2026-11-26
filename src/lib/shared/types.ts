import type { CategoryId } from "./categories";

/** Public shape of a catalog game as returned by the API. */
export interface CatalogGame {
  id: string;
  slug: string;
  name: string;
  url: string;
  host: string;
  description: string;
  iconUrl: string | null;
  category: CategoryId | string;
  tags: string[];
  source: "seed" | "community";
  favoriteCount: number;
  createdAt: number;
}

export interface LinkPreview {
  url: string;
  normalizedUrl: string;
  host: string;
  title: string;
  description: string;
  iconUrl: string | null;
  existing: CatalogGame | null;
  reachable: boolean;
}
