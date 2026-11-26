"use client";
import Link from "next/link";
import { Star } from "lucide-react";
import type { CatalogGame } from "@/lib/shared/types";
import { setFavorite } from "@/lib/client/store";
import { CategoryTag } from "./CategoryChip";
import { GameIcon } from "./GameIcon";

export function GameCard({ game, isFav }: { game: CatalogGame; isFav: boolean }) {
  return (
    <li className="card flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <GameIcon name={game.name} iconUrl={game.iconUrl} cat={game.category} size={48} />
        <div className="min-w-0 flex-1">
          <Link href={`/g/${game.slug}`} className="block truncate text-base font-black hover:underline">
            {game.name}
          </Link>
          <p className="truncate text-xs text-ink-2">{game.host}</p>
        </div>
        <button
          onClick={() => setFavorite(game.id, !isFav)}
          aria-pressed={isFav}
          aria-label={isFav ? `Remove ${game.name} from favorites` : `Add ${game.name} to favorites`}
          className={`grid size-10 shrink-0 place-items-center rounded-full transition ${isFav ? "pop bg-amber-400 text-white" : "bg-surface-2 text-ink-2 hover:text-amber-500"}`}
        >
          <Star size={19} strokeWidth={2.5} fill={isFav ? "currentColor" : "none"} />
        </button>
      </div>
      <p className="line-clamp-2 min-h-10 text-sm text-ink-2">{game.description || "A daily game."}</p>
      <div className="mt-auto flex items-center gap-2">
        <CategoryTag id={game.category} />
        {game.source === "community" && <span className="text-[11px] font-bold text-ink-2">· community</span>}
        <span className="ml-auto text-xs font-bold text-ink-2" title="Players who favorited this">
          ★ {game.favoriteCount}
        </span>
      </div>
    </li>
  );
}
