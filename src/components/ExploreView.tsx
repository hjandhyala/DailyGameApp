"use client";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFavoriteRefs } from "@/lib/client/hooks";
import { CATEGORIES } from "@/lib/shared/categories";
import type { CatalogGame } from "@/lib/shared/types";
import { CategoryIcon } from "./CategoryChip";
import { GameCard } from "./GameCard";

type Sort = "popular" | "new" | "az";

export function ExploreView({ games }: { games: CatalogGame[] }) {
  const favs = useFavoriteRefs();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("popular");

  useEffect(() => {
    try {
      const s = localStorage.getItem("dgh.exploreSort") as Sort | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage after hydration
      if (s) setSort(s);
    } catch {}
  }, []);
  const changeSort = (s: Sort) => {
    setSort(s);
    try {
      localStorage.setItem("dgh.exploreSort", s);
    } catch {}
  };

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = games.filter(
      (g) =>
        (!cat || g.category === cat) &&
        (!needle || g.name.toLowerCase().includes(needle) || g.host.includes(needle) || g.description.toLowerCase().includes(needle) || g.tags.some((t) => t.includes(needle))),
    );
    return list.sort((a, b) =>
      sort === "new" ? b.createdAt - a.createdAt : sort === "az" ? a.name.localeCompare(b.name) : b.favoriteCount - a.favoriteCount || a.name.localeCompare(b.name),
    );
  }, [games, q, cat, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-3xl font-black">Explore</h1>
          <p className="text-ink-2">{games.length} daily games and counting. Star the ones you play.</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search games</span>
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" />
          <input className="input !pl-10" placeholder="Search games…" value={q} onChange={(e) => setQ(e.target.value)} type="search" />
        </label>
        <select className="input sm:!w-44" value={sort} onChange={(e) => changeSort(e.target.value as Sort)} aria-label="Sort">
          <option value="popular">Most popular</option>
          <option value="new">Newest</option>
          <option value="az">A–Z</option>
        </select>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button className="chip" aria-pressed={cat === null} onClick={() => setCat(null)}>
          All
        </button>
        {CATEGORIES.map((c) => (
          <button key={c.id} className="chip" aria-pressed={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)}>
            <CategoryIcon id={c.id} /> {c.label}
          </button>
        ))}
      </div>
      {shown.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((g) => (
            <GameCard key={g.id} game={g} isFav={favs.has(g.id)} />
          ))}
        </ul>
      ) : (
        <div className="card p-8 text-center">
          <p className="font-bold">No games match{q ? ` “${q}”` : ""}.</p>
          <p className="mt-1 text-sm text-ink-2">Know one we’re missing? Add it by link.</p>
        </div>
      )}
      <div className="card flex flex-col items-center gap-2 p-6 text-center sm:flex-row sm:text-left">
        <div className="flex-1">
          <p className="font-black">Missing a game?</p>
          <p className="text-sm text-ink-2">Paste its link — we’ll grab the name and icon, and you can share it with everyone.</p>
        </div>
        <Link href={`/add${q ? `?url=${encodeURIComponent(q)}` : ""}`} className="btn btn-primary">
          <Plus size={16} /> Add by link
        </Link>
      </div>
    </div>
  );
}
