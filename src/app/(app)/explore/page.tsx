import type { Metadata } from "next";
import { ExploreView } from "@/components/ExploreView";
import { listGames } from "@/lib/server/games";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Explore" };

export default async function ExplorePage() {
  const games = await listGames({ sort: "popular" });
  return <ExploreView games={games} />;
}
