import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, inArray, like, or, sql, type SQL } from "drizzle-orm";
import { editGame, moderateGame } from "../../actions";
import { GameIcon } from "@/components/GameIcon";
import { db } from "@/lib/server/db";
import { games, reports } from "@/lib/server/schema";
import { CATEGORIES, category } from "@/lib/shared/categories";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Moderation" };

const TABS = [
  { id: "reported", label: "Needs review" },
  { id: "community", label: "Community" },
  { id: "all", label: "All games" },
  { id: "removed", label: "Removed" },
] as const;

const EDIT_ERRORS: Record<string, string> = {
  duplicate_url: "Another game already uses that link. It's listed below.",
  invalid_url: "That doesn't look like a valid game link.",
  not_found: "That game no longer exists.",
};

export default async function ModerationPage({ searchParams }: PageProps<"/admin/games">) {
  const sp = await searchParams;
  const tab = (typeof sp.tab === "string" ? sp.tab : "reported") as (typeof TABS)[number]["id"];
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const error = typeof sp.error === "string" ? EDIT_ERRORS[sp.error] : undefined;

  const where: SQL[] = [];
  if (tab === "reported") where.push(or(eq(games.status, "hidden"), sql`${games.reportCount} > 0`)!);
  if (tab === "community") where.push(eq(games.source, "community"), sql`${games.status} != 'removed'`);
  if (tab === "all") where.push(sql`${games.status} != 'removed'`);
  if (tab === "removed") where.push(eq(games.status, "removed"));
  if (q) where.push(or(like(games.name, `%${q}%`), like(games.host, `%${q}%`))!);

  const rows = await db
    .select()
    .from(games)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(games.status), desc(games.reportCount), desc(games.createdAt))
    .limit(200);

  const reps = rows.length
    ? await db
        .select()
        .from(reports)
        .where(inArray(reports.gameId, rows.map((r) => r.id)))
        .orderBy(desc(reports.createdAt))
    : [];
  const repsBy = new Map<string, typeof reps>();
  for (const r of reps) repsBy.set(r.gameId, [...(repsBy.get(r.gameId) ?? []), r]);

  const [{ needs }] = await db
    .select({ needs: sql<number>`count(*)` })
    .from(games)
    .where(or(eq(games.status, "hidden"), sql`${games.reportCount} > 0`));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-black">Moderation</h1>
        <p className="text-sm text-ink-2">Community games publish instantly. A game is hidden automatically after 3 reports from different devices.</p>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-bold text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <Link key={t.id} href={`/admin/games?tab=${t.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className="chip" aria-pressed={tab === t.id}>
            {t.label}
            {t.id === "reported" && needs > 0 && <span className="rounded-full bg-warn px-1.5 text-[10px] text-white">{needs}</span>}
          </Link>
        ))}
        <form className="ml-auto w-full sm:w-64">
          <input type="hidden" name="tab" value={tab} />
          <input className="input !py-1.5 text-sm" name="q" defaultValue={q} placeholder="Search name or host…" type="search" aria-label="Search games" />
        </form>
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-ink-2">{tab === "reported" ? "Nothing to review." : "No games found."}</div>
      ) : (
        <ul className="space-y-3">
          {rows.map((g) => {
            const rs = repsBy.get(g.id) ?? [];
            return (
              <li key={g.id} className="card p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <GameIcon name={g.name} iconUrl={g.iconUrl} cat={g.category} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black">{g.name}</span>
                      <StatusPill status={g.status} />
                      <span className="text-xs text-ink-2">
                        {g.source} · {category(g.category).label} · {g.favoriteCount} favorites · added {new Date(g.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <a href={g.url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm text-accent hover:underline">
                      {g.url}
                    </a>
                    {g.description && <p className="mt-1 text-sm text-ink-2">{g.description}</p>}
                  </div>
                  <form action={moderateGame} className="flex flex-wrap gap-1.5">
                    <input type="hidden" name="id" value={g.id} />
                    {g.status !== "active" && (
                      <button name="action" value="restore" className="btn btn-soft !px-3 !py-1.5 text-xs">
                        Restore
                      </button>
                    )}
                    {g.status === "active" && g.reportCount > 0 && (
                      <button name="action" value="clear_reports" className="btn btn-soft !px-3 !py-1.5 text-xs">
                        Dismiss reports
                      </button>
                    )}
                    {g.status === "active" && (
                      <button name="action" value="hide" className="btn btn-ghost border border-line !px-3 !py-1.5 text-xs">
                        Hide
                      </button>
                    )}
                    {g.status !== "removed" && (
                      <button name="action" value="remove" className="btn btn-danger !px-3 !py-1.5 text-xs">
                        Remove
                      </button>
                    )}
                  </form>
                </div>
                {rs.length > 0 && (
                  <div className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">
                    <p className="mb-1 font-bold">
                      {rs.length} report{rs.length > 1 ? "s" : ""}
                    </p>
                    <ul className="space-y-0.5 text-ink-2">
                      {rs.slice(0, 5).map((r) => (
                        <li key={r.id}>
                          <span className="font-bold text-ink">{r.reason.replace("_", " ")}</span>
                          {r.note && <> — “{r.note}”</>} <span className="text-xs">({new Date(r.createdAt).toLocaleDateString()})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer font-bold text-ink-2">Edit</summary>
                  <form action={editGame} className="mt-2 grid gap-2 sm:grid-cols-2">
                    <input type="hidden" name="id" value={g.id} />
                    <input className="input" name="name" defaultValue={g.name} aria-label="Name" maxLength={60} required />
                    <input className="input" name="url" defaultValue={g.url} aria-label="URL" required />
                    <select className="input" name="category" defaultValue={g.category} aria-label="Category">
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <input className="input" name="description" defaultValue={g.description} aria-label="Description" maxLength={280} />
                    <button className="btn btn-primary sm:col-span-2 sm:justify-self-start">Save</button>
                  </form>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-good-soft text-good",
    hidden: "bg-warn/15 text-warn",
    removed: "bg-danger/10 text-danger",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase ${map[status]}`}>{status}</span>;
}
