import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GameDetail } from "@/components/GameDetail";
import { getGame, toPublic } from "@/lib/server/games";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/g/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "custom") return { title: "My game" };
  const g = await getGame(slug);
  return g ? { title: g.name, description: g.description } : {};
}

export default async function GamePage({ params }: PageProps<"/g/[slug]">) {
  const { slug } = await params;
  if (slug === "custom") {
    return (
      <Suspense>
        <GameDetail game={null} />
      </Suspense>
    );
  }
  const g = await getGame(slug);
  if (!g || g.status === "removed") notFound();
  return (
    <Suspense>
      <GameDetail game={toPublic(g)} />
    </Suspense>
  );
}
