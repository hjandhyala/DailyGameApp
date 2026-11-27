"use client";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowDown, ArrowUp, Check, ClipboardPaste, ExternalLink, Flame, Gamepad2, PencilLine, Plus, Star, Trash2 } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { db } from "@/lib/client/db";
import { useFavorites, usePlays, useSettings, useToday } from "@/lib/client/hooks";
import { markPlayed, reorderFavorites, setFavorite, unmarkPlayed, viewOfCatalog, type GameView } from "@/lib/client/store";
import { detectGame } from "@/lib/parsers";
import { computeStreak } from "@/lib/shared/streaks";
import { GameIcon } from "./GameIcon";
import { ProgressRing } from "./ProgressRing";
import { ResultSheet } from "./ResultSheet";
import { WelcomeTour } from "./WelcomeTour";

const PENDING_KEY = "dgh.pendingPlay";

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Up late?" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function TodayView() {
  const favorites = useFavorites();
  const plays = usePlays();
  const today = useToday();
  const settings = useSettings();
  const [sheet, setSheet] = useState<{ game: GameView; text?: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const todayPlays = useMemo(() => new Map(plays.filter((p) => p.day === today).map((p) => [p.ref, p])), [plays, today]);
  const favs = useMemo(() => favorites ?? [], [favorites]);
  const done = favs.filter((f) => todayPlays.has(f.ref)).length;

  const streak = useMemo(() => {
    const favRefs = new Set(favs.map((f) => f.ref));
    return computeStreak(plays.filter((p) => favRefs.has(p.ref)).map((p) => p.day), today);
  }, [plays, favs, today]);

  // "Did you finish?" prompt when returning from a game tab.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !settings.promptAfterPlay) return;
      let pending: { ref: string; at: number } | null = null;
      try {
        pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? "null");
      } catch {}
      if (!pending) return;
      sessionStorage.removeItem(PENDING_KEY);
      if (Date.now() - pending.at < 4000) return;
      const game = favs.find((f) => f.ref === pending!.ref);
      if (game && !todayPlays.has(game.ref)) setSheet({ game });
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [favs, todayPlays, settings.promptAfterPlay]);

  const onPlay = useCallback((g: GameView) => {
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({ ref: g.ref, at: Date.now() }));
    } catch {}
  }, []);

  async function pasteAnywhere() {
    let text = "";
    try {
      text = await navigator.clipboard.readText();
    } catch {
      setNotice("Clipboard access was blocked. Tap the pencil button on a game and paste there instead.");
      return;
    }
    const slug = detectGame(text);
    const game = slug ? favs.find((f) => f.slug === slug) : undefined;
    if (game) setSheet({ game, text });
    else setNotice(slug ? `That looks like a ${slug} result, but it isn't in your favorites.` : "Couldn't tell which game that result is from — use the pencil button on the game instead.");
  }

  function move(i: number, dir: -1 | 1) {
    const refs = favs.map((f) => f.ref);
    const j = i + dir;
    if (j < 0 || j >= refs.length) return;
    [refs[i], refs[j]] = [refs[j], refs[i]];
    void reorderFavorites(refs);
  }

  if (favorites === undefined) return <div className="h-64" aria-busy />;

  const dateLabel = new Date(`${today}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-5">
      <section className="card flex items-center gap-4 p-5">
        <ProgressRing done={done} total={favs.length} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink-2">{dateLabel}</p>
          <h1 className="text-2xl font-black leading-tight sm:text-3xl">
            {favs.length && done === favs.length ? "All done today!" : greeting()}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 font-bold" title="Days in a row you've played at least one favorite">
              <Flame size={15} className={streak.current ? "text-orange-500" : "text-ink-2"} />
              {streak.current} day streak
            </span>
            {streak.atRisk && <span className="text-xs font-bold text-warn">Play one today to keep it going</span>}
          </div>
        </div>
        {favs.length > 0 && (
          <div className="hidden flex-col gap-2 sm:flex">
            <button className="btn btn-soft" onClick={pasteAnywhere}>
              <ClipboardPaste size={16} /> Paste result
            </button>
            <button className="btn btn-ghost" onClick={() => setEditing((e) => !e)}>
              <PencilLine size={16} /> {editing ? "Done" : "Edit list"}
            </button>
          </div>
        )}
      </section>

      {favs.length > 0 && (
        <div className="flex gap-2 sm:hidden">
          <button className="btn btn-soft flex-1" onClick={pasteAnywhere}>
            <ClipboardPaste size={16} /> Paste result
          </button>
          <button className="btn btn-ghost flex-1" onClick={() => setEditing((e) => !e)}>
            <PencilLine size={16} /> {editing ? "Done" : "Edit list"}
          </button>
        </div>
      )}

      {notice && (
        <div role="status" className="flex items-start gap-3 rounded-2xl bg-accent-soft px-4 py-3 text-sm">
          <span className="flex-1">{notice}</span>
          <button className="font-bold text-accent" onClick={() => setNotice(null)}>
            OK
          </button>
        </div>
      )}

      {favs.length === 0 ? (
        <EmptyToday />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {favs.map((g, i) => {
            const play = todayPlays.get(g.ref);
            return (
              <li key={g.ref} className={`card relative flex flex-col gap-3 p-4 transition ${play ? "border-good/40 bg-good-soft/40" : ""}`}>
                <div className="flex items-center gap-3">
                  <GameIcon name={g.name} iconUrl={g.iconUrl} cat={g.category} size={52} />
                  <div className="min-w-0 flex-1">
                    <Link href={g.slug ? `/g/${g.slug}` : `/g/custom?ref=${encodeURIComponent(g.ref)}`} className="block truncate text-lg font-black hover:underline">
                      {g.name}
                    </Link>
                    <p className="truncate text-xs text-ink-2">{g.host}</p>
                  </div>
                  <button
                    onClick={() => (play ? unmarkPlayed(g.ref, today) : markPlayed(g.ref, { day: today }))}
                    aria-pressed={!!play}
                    aria-label={play ? `Mark ${g.name} as not done` : `Mark ${g.name} as done`}
                    className={`grid size-11 shrink-0 place-items-center rounded-full border-2 transition ${play ? "pop border-good bg-good text-white" : "border-line text-ink-2 hover:border-good hover:text-good"}`}
                  >
                    <Check size={22} strokeWidth={3.2} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {editing ? (
                    <>
                      <button className="btn btn-ghost !p-2" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${g.name} up`}>
                        <ArrowUp size={16} />
                      </button>
                      <button className="btn btn-ghost !p-2" onClick={() => move(i, 1)} disabled={i === favs.length - 1} aria-label={`Move ${g.name} down`}>
                        <ArrowDown size={16} />
                      </button>
                      <button className="btn btn-danger ml-auto" onClick={() => setFavorite(g.ref, false)}>
                        <Trash2 size={15} /> Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <a href={g.url} target="_blank" rel="noopener noreferrer" onClick={() => onPlay(g)} className={`btn flex-1 ${play ? "btn-soft" : "btn-primary"}`}>
                        {play ? "Play again" : "Play"} <ExternalLink size={15} />
                      </a>
                      <button className="btn btn-ghost !px-3" onClick={() => setSheet({ game: g })} aria-label={`Add ${g.name} result`} title="Add result">
                        <PencilLine size={16} />
                      </button>
                    </>
                  )}
                </div>
                {play?.result && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-ink-2">Today:</span>
                    <span className={`font-black ${play.result.failed ? "text-danger" : "text-good"}`}>{play.result.label}</span>
                  </div>
                )}
              </li>
            );
          })}
          <li>
            <Link href="/explore" className="flex h-full min-h-32 flex-col items-center justify-center gap-1 rounded-[1.25rem] border-2 border-dashed border-line p-4 text-ink-2 transition hover:border-accent hover:text-accent">
              <Plus size={26} />
              <span className="font-bold">Add more games</span>
            </Link>
          </li>
        </ul>
      )}

      <ResultSheet open={!!sheet} game={sheet?.game ?? null} initialText={sheet?.text} onClose={() => setSheet(null)} />
      <Suspense>
        <WelcomeTour hasGames={favs.length > 0} />
      </Suspense>
    </div>
  );
}

function EmptyToday() {
  const popular = useLiveQuery(async () => (await db.catalog.toArray()).sort((a, b) => b.favoriteCount - a.favoriteCount || a.name.localeCompare(b.name)), []);
  const featured = useMemo(() => {
    if (!popular) return [];
    const first = ["krillion", "daily-tens", "wordle", "connections"];
    const pri = (slug: string) => (first.includes(slug) ? first.indexOf(slug) : 99);
    return [...popular].sort((a, b) => pri(a.slug) - pri(b.slug)).slice(0, 6);
  }, [popular]);
  return (
    <section className="card p-6 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <Gamepad2 size={28} aria-hidden />
      </div>
      <h2 className="mt-2 text-xl font-black">Build your daily lineup</h2>
      <p className="mx-auto mt-1 max-w-md text-ink-2">Star the games you play every day. They show up here with a checklist, streaks and your scores.</p>
      {featured.length > 0 && (
        <ul className="mx-auto mt-5 grid max-w-xl grid-cols-2 gap-2 text-left sm:grid-cols-3">
          {featured.map((g) => (
            <li key={g.id}>
              <button
                onClick={() => setFavorite(g.id, true)}
                className="flex w-full items-center gap-2 rounded-2xl border border-line bg-surface p-2.5 transition hover:border-accent"
              >
                <GameIcon name={g.name} iconUrl={viewOfCatalog(g).iconUrl} cat={g.category} size={32} />
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{g.name}</span>
                <Star size={16} className="text-ink-2" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link href="/explore" className="btn btn-primary">
          Explore games
        </Link>
        <Link href="/add" className="btn btn-soft">
          <Plus size={16} /> Add by link
        </Link>
      </div>
    </section>
  );
}
