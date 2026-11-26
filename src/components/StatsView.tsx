"use client";
import Link from "next/link";
import { Flame, Sparkles, Trophy } from "lucide-react";
import { useMemo } from "react";
import { useFavorites, usePlays, useToday } from "@/lib/client/hooks";
import { addDays, dayRange } from "@/lib/shared/dates";
import { gameStats } from "@/lib/shared/gameStats";
import { computeStreak, perfectDays } from "@/lib/shared/streaks";
import { GameIcon } from "./GameIcon";
import { Heatmap } from "./Heatmap";

export function StatsView() {
  const favList = useFavorites();
  const favorites = useMemo(() => favList ?? [], [favList]);
  const plays = usePlays();
  const today = useToday();

  const data = useMemo(() => {
    const favRefs = favorites.map((f) => f.ref);
    const byDay = new Map<string, Set<string>>();
    for (const p of plays) {
      if (!byDay.has(p.day)) byDay.set(p.day, new Set());
      byDay.get(p.day)!.add(p.ref);
    }
    const values = new Map<string, number>();
    for (const [d, set] of byDay) {
      const n = favRefs.length ? favRefs.filter((r) => set.has(r)).length / favRefs.length : 0;
      values.set(d, favRefs.length ? n || (set.size ? 0.1 : 0) : Math.min(1, set.size / 3));
    }
    const any = computeStreak(byDay.keys(), today);
    const perfect = computeStreak(perfectDays(byDay, favRefs), today);
    const last30 = dayRange(today, 30);
    const active30 = last30.filter((d) => byDay.has(d)).length;
    return { byDay, values, any, perfect, active30, favRefs };
  }, [plays, favorites, today]);

  const perGame = useMemo(
    () =>
      favorites
        .map((g) => ({ g, s: gameStats(plays.filter((p) => p.ref === g.ref), today) }))
        .sort((a, b) => b.s.current - a.s.current || b.s.plays - a.s.plays),
    [favorites, plays, today],
  );

  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-black">Stats</h1>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile icon={<Flame size={16} className="text-orange-500" />} label="Daily streak" value={data.any.current} sub={`Best ${data.any.best}`} />
        <Tile icon={<Sparkles size={16} className="text-accent" />} label="Perfect-day streak" value={data.perfect.current} sub={`Best ${data.perfect.best}`} />
        <Tile icon={<Trophy size={16} className="text-amber-500" />} label="Games played" value={plays.length} sub="all time" />
        <Tile label="Active days" value={data.active30} sub="last 30 days" />
      </section>

      <section className="card p-5">
        <h2 className="font-black">Activity</h2>
        <p className="mb-3 text-sm text-ink-2">Darker = more of your favorites finished that day.</p>
        <Heatmap
          end={today}
          weeks={26}
          values={data.values}
          label={(d) => {
            const set = data.byDay.get(d);
            const n = set ? data.favRefs.filter((r) => set.has(r)).length : 0;
            return `${fmt(d)}: ${set ? `${n}/${data.favRefs.length} favorites${set.size > n ? ` (+${set.size - n} other)` : ""}` : "nothing played"}`;
          }}
        />
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-bold text-ink-2">Show last 14 days as a list</summary>
          <table className="mt-2 w-full text-left">
            <thead className="text-xs uppercase text-ink-2">
              <tr>
                <th className="py-1 font-bold">Day</th>
                <th className="py-1 font-bold">Favorites done</th>
              </tr>
            </thead>
            <tbody>
              {dayRange(today, 14)
                .reverse()
                .map((d) => {
                  const set = data.byDay.get(d);
                  const n = set ? data.favRefs.filter((r) => set.has(r)).length : 0;
                  return (
                    <tr key={d} className="border-t border-line">
                      <td className="py-1.5">{fmt(d)}</td>
                      <td className="py-1.5 font-bold">
                        {n}/{data.favRefs.length}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </details>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-black">By game</h2>
        {perGame.length === 0 ? (
          <p className="text-sm text-ink-2">
            Favorite some games on <Link href="/explore" className="font-bold text-accent">Explore</Link> to see per-game stats.
          </p>
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-xs uppercase text-ink-2">
                <tr>
                  <th className="px-2 py-1 font-bold">Game</th>
                  <th className="px-2 py-1 text-right font-bold">Streak</th>
                  <th className="px-2 py-1 text-right font-bold">Best</th>
                  <th className="px-2 py-1 text-right font-bold">Played</th>
                  <th className="px-2 py-1 text-right font-bold">Win / avg</th>
                  <th className="px-2 py-1 font-bold">Last 7 days</th>
                </tr>
              </thead>
              <tbody>
                {perGame.map(({ g, s }) => {
                  const days = new Set(plays.filter((p) => p.ref === g.ref).map((p) => p.day));
                  return (
                    <tr key={g.ref} className="border-t border-line">
                      <td className="px-2 py-2">
                        <Link href={g.slug ? `/g/${g.slug}` : `/g/custom?ref=${encodeURIComponent(g.ref)}`} className="flex items-center gap-2 font-bold hover:underline">
                          <GameIcon name={g.name} iconUrl={g.iconUrl} cat={g.category} size={26} />
                          <span className="truncate">{g.name}</span>
                        </Link>
                      </td>
                      <td className="px-2 py-2 text-right font-black">{s.current ? `🔥 ${s.current}` : "0"}</td>
                      <td className="px-2 py-2 text-right">{s.best}</td>
                      <td className="px-2 py-2 text-right">{s.plays}</td>
                      <td className="px-2 py-2 text-right">{s.winRate !== null ? `${Math.round(s.winRate * 100)}%` : (s.bestTime ?? s.avgScore ?? "—")}</td>
                      <td className="px-2 py-2">
                        <div className="flex gap-1" aria-label={`Played ${[...Array(7)].filter((_, i) => days.has(addDays(today, i - 6))).length} of the last 7 days`}>
                          {[...Array(7)].map((_, i) => {
                            const d = addDays(today, i - 6);
                            return <span key={d} title={fmt(d)} className="size-3 rounded-[3px]" style={{ background: days.has(d) ? "var(--seq-3)" : "var(--seq-0)" }} />;
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Tile({ label, value, sub, icon }: { label: string; value: number; sub: string; icon?: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-1 text-xs font-bold uppercase text-ink-2">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-3xl font-black">{value}</div>
      <div className="text-xs text-ink-2">{sub}</div>
    </div>
  );
}
