"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, ExternalLink, Flag, Flame, Lock, PencilLine, Star, Trash2, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { db } from "@/lib/client/db";
import { api } from "@/lib/client/device";
import { useFavoriteRefs, usePlays, useToday } from "@/lib/client/hooks";
import { deleteCustomGame, setFavorite, viewOfCatalog, viewOfCustom, type GameView } from "@/lib/client/store";
import { gameStats } from "@/lib/shared/gameStats";
import type { CatalogGame } from "@/lib/shared/types";
import { CategoryTag } from "./CategoryChip";
import { GameIcon } from "./GameIcon";
import { Heatmap } from "./Heatmap";
import { ResultSheet } from "./ResultSheet";
import { Sheet } from "./Sheet";

export function GameDetail({ game: catalogGame }: { game: CatalogGame | null }) {
  const params = useSearchParams();
  const customRef = params.get("ref");
  const custom = useLiveQuery(async () => (customRef ? db.customGames.get(customRef) : undefined), [customRef]);
  const game: GameView | null = catalogGame ? viewOfCatalog(catalogGame) : custom && !custom.deleted ? viewOfCustom(custom) : null;
  const router = useRouter();
  const favs = useFavoriteRefs();
  const allPlays = usePlays();
  const today = useToday();
  const [sheet, setSheet] = useState(false);
  const [report, setReport] = useState(false);

  const plays = useMemo(() => allPlays.filter((p) => p.ref === game?.ref).sort((a, b) => b.day.localeCompare(a.day)), [allPlays, game?.ref]);
  const stats = useMemo(() => gameStats(plays, today), [plays, today]);
  const values = useMemo(() => new Map(plays.map((p) => [p.day, 1])), [plays]);

  if (!game) {
    return customRef && custom === undefined ? null : (
      <div className="card p-8 text-center">
        <p className="font-bold">Game not found.</p>
        <Link href="/explore" className="btn btn-primary mt-3">
          Explore games
        </Link>
      </div>
    );
  }
  const isFav = favs.has(game.ref);
  const playedToday = plays.some((p) => p.day === today);

  return (
    <div className="space-y-4">
      <section className="card p-5">
        <div className="flex items-start gap-4">
          <GameIcon name={game.name} iconUrl={game.iconUrl} cat={game.category} size={72} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black sm:text-3xl">{game.name}</h1>
            <p className="truncate text-sm text-ink-2">{game.host}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <CategoryTag id={game.category} />
              {game.isCustom && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-ink-2">
                  <Lock size={12} strokeWidth={2.5} aria-hidden /> Private
                </span>
              )}
              {!game.isCustom && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-ink-2">
                  <Star size={12} strokeWidth={2.5} aria-hidden /> {game.favoriteCount ?? 0} players
                </span>
              )}
            </div>
          </div>
        </div>
        {game.description && <p className="mt-4 text-ink-2">{game.description}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={game.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            Play <ExternalLink size={15} />
          </a>
          <button className={`btn ${isFav ? "btn-soft" : "btn-ghost border border-line"}`} onClick={() => setFavorite(game.ref, !isFav)} aria-pressed={isFav}>
            <Star size={16} fill={isFav ? "currentColor" : "none"} /> {isFav ? "Favorited" : "Add to favorites"}
          </button>
          <button className="btn btn-ghost" onClick={() => setSheet(true)}>
            <PencilLine size={16} /> {playedToday ? "Edit today's result" : "Add today's result"}
          </button>
          {game.isCustom ? (
            <button
              className="btn btn-danger ml-auto"
              onClick={async () => {
                if (confirm(`Delete ${game.name}? Your history for it stays in your stats.`)) {
                  await deleteCustomGame(game.ref);
                  router.push("/");
                }
              }}
            >
              <Trash2 size={15} /> Delete
            </button>
          ) : (
            <button className="btn btn-ghost ml-auto text-xs" onClick={() => setReport(true)}>
              <Flag size={14} /> Report
            </button>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<Flame size={16} className="text-orange-500" />} label="Current streak" value={`${stats.current}`} />
        <Stat icon={<Trophy size={16} className="text-amber-500" />} label="Best streak" value={`${stats.best}`} />
        <Stat label="Days played" value={`${stats.plays}`} />
        <Stat
          label={stats.winRate !== null ? "Win rate" : stats.bestTime ? "Best time" : "Avg score"}
          value={stats.winRate !== null ? `${Math.round(stats.winRate * 100)}%` : (stats.bestTime ?? stats.avgScore ?? "—")}
        />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-black">Your history</h2>
        <Heatmap end={today} weeks={20} values={values} label={(d, v) => `${new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}: ${v ? plays.find((p) => p.day === d)?.result?.label ?? "Played" : "Not played"}`} />
        {plays.length > 0 ? (
          <ul className="mt-4 divide-y divide-line">
            {plays.slice(0, 30).map((p) => (
              <li key={p.key} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-28 shrink-0 font-bold text-ink-2">
                  {new Date(`${p.day}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                </span>
                <span className={`font-black ${p.result?.failed ? "text-danger" : ""}`}>{p.result?.label ?? (
                    <span className="inline-flex items-center gap-1">
                      <Check size={14} strokeWidth={3} aria-hidden /> Played
                    </span>
                  )}</span>
                {p.result?.grid && <span className="ml-auto hidden truncate text-xs sm:block">{p.result.grid.split("\n")[0]}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink-2">No plays yet. Mark it done on the Today page.</p>
        )}
      </section>

      <ResultSheet open={sheet} game={game} onClose={() => setSheet(false)} initialText={plays.find((p) => p.day === today)?.resultText ?? ""} />
      {!game.isCustom && <ReportSheet open={report} onClose={() => setReport(false)} game={game} />}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-1 text-xs font-bold uppercase text-ink-2">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}

const REASONS = [
  { id: "broken", label: "Link is broken" },
  { id: "not_daily", label: "Not a daily game" },
  { id: "duplicate", label: "Duplicate" },
  { id: "spam", label: "Spam or inappropriate" },
  { id: "other", label: "Something else" },
] as const;

function ReportSheet({ open, onClose, game }: { open: boolean; onClose: () => void; game: GameView }) {
  const [reason, setReason] = useState<string>("broken");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  async function send() {
    setState("sending");
    try {
      await api(`/api/games/${encodeURIComponent(game.ref)}/report`, { json: { reason, note } });
      setState("sent");
    } catch {
      setState("error");
    }
  }
  return (
    <Sheet open={open} onClose={onClose} title={`Report ${game.name}`}>
      {state === "sent" ? (
        <div className="space-y-3">
          <p>Thanks — games with several reports are hidden automatically until a moderator reviews them.</p>
          <button className="btn btn-primary w-full" onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <button key={r.id} className="chip" aria-pressed={reason === r.id} onClick={() => setReason(r.id)}>
                {r.label}
              </button>
            ))}
          </div>
          <textarea className="input min-h-20" placeholder="Anything else? (optional)" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          {state === "error" && <p className="text-sm font-bold text-danger">Couldn’t send the report. Try again later.</p>}
          <button className="btn btn-primary w-full" onClick={send} disabled={state === "sending"}>
            Send report
          </button>
        </div>
      )}
    </Sheet>
  );
}
