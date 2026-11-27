"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Globe2, Link2, Loader2, Lock, Plus, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/client/device";
import { useFavoriteRefs } from "@/lib/client/hooks";
import { addCustomGame, cacheCatalogGame, setFavorite } from "@/lib/client/store";
import { CATEGORIES } from "@/lib/shared/categories";
import type { CatalogGame, LinkPreview } from "@/lib/shared/types";
import { CategoryIcon } from "./CategoryChip";
import { GameIcon } from "./GameIcon";

function guessCategory(text: string) {
  const t = text.toLowerCase();
  if (/word|letter|spell|crossword|anagram/.test(t)) return "word";
  if (/geo|country|countries|map|globe|flag|travel|city/.test(t)) return "geo";
  if (/movie|film|song|music|tv|album|artist|game screenshot/.test(t)) return "media";
  if (/math|number|equation|sum|digit/.test(t)) return "math";
  if (/trivia|quiz|history|guess|fact/.test(t)) return "trivia";
  if (/logic|puzzle|sudoku|grid/.test(t)) return "logic";
  return "other";
}

function extractUrl(s: string | null) {
  if (!s) return "";
  return s.match(/https?:\/\/\S+/)?.[0] ?? s;
}

export function AddView() {
  const params = useSearchParams();
  const router = useRouter();
  const favs = useFavoriteRefs();
  const initial = extractUrl(params.get("url")) || extractUrl(params.get("text"));
  const [url, setUrl] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cat, setCat] = useState("other");
  const [share, setShare] = useState(true);
  const [saving, setSaving] = useState(false);
  const autoRan = useRef(false);

  async function lookup(e?: React.FormEvent) {
    e?.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setErr(null);
    setPreview(null);
    try {
      const p = await api<LinkPreview>("/api/preview", { json: { url: url.trim() } });
      setPreview(p);
      setName(p.title || p.host.split(".")[0].replace(/^\w/, (c) => c.toUpperCase()));
      setDescription(p.description);
      setCat(guessCategory(`${p.title} ${p.description} ${p.host}`));
      if (p.existing) void cacheCatalogGame(p.existing);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initial && !autoRan.current) {
      autoRan.current = true;
      void lookup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (!preview) return;
    setSaving(true);
    setErr(null);
    try {
      if (share) {
        const { game } = await api<{ game: CatalogGame; created: boolean }>("/api/games", {
          json: { url: preview.url, name: name.trim(), description: description.trim(), category: cat, iconUrl: preview.iconUrl },
        });
        await cacheCatalogGame(game);
        await setFavorite(game.id, true);
      } else {
        await addCustomGame({ name: name.trim(), url: preview.url, iconUrl: preview.iconUrl, category: cat, description: description.trim() });
      }
      router.push("/?added=1");
    } catch (e) {
      setErr(
        e instanceof ApiError ? `${e.message}. You can still save it privately — uncheck “Share to marketplace”.` : "Couldn't save — check your connection and try again.",
      );
      setSaving(false);
    }
  }

  const existing = preview?.existing;
  const existingFav = existing ? favs.has(existing.id) : false;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-3xl font-black">Add a game</h1>
        <p className="text-ink-2">Paste a link to any daily game. It goes straight into your favorites.</p>
      </div>
      <form onSubmit={lookup} className="card flex flex-col gap-2 p-4 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Game link</span>
          <Link2 size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" />
          <input
            className="input !pl-10"
            placeholder="https://krillion.io"
            inputMode="url"
            autoComplete="url"
            autoFocus={!initial}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <button className="btn btn-primary" disabled={loading || !url.trim()}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {loading ? "Looking up…" : "Look up"}
        </button>
      </form>

      {err && (
        <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-bold text-danger">
          {err}
        </p>
      )}

      {existing && (
        <div className="card space-y-3 p-5">
          <div className="flex items-center gap-3">
            <GameIcon name={existing.name} iconUrl={existing.iconUrl} cat={existing.category} size={56} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase text-good">Already in the marketplace</p>
              <p className="truncate text-xl font-black">{existing.name}</p>
              <p className="truncate text-sm text-ink-2">{existing.host}</p>
            </div>
          </div>
          {existingFav ? (
            <div className="flex gap-2">
              <span className="btn btn-soft flex-1">
                <Check size={16} /> In your favorites
              </span>
              <Link href="/" className="btn btn-primary flex-1">
                Go to Today
              </Link>
            </div>
          ) : (
            <button className="btn btn-primary w-full" onClick={() => setFavorite(existing.id, true)}>
              <Star size={16} /> Add to favorites
            </button>
          )}
        </div>
      )}

      {preview && !existing && (
        <div className="card space-y-4 p-5">
          <div className="flex items-center gap-3">
            <GameIcon name={name || "?"} iconUrl={preview.iconUrl} cat={cat} size={56} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink-2">{preview.host}</p>
              {!preview.reachable && <p className="text-xs font-bold text-warn">We couldn’t load that page — double-check the link.</p>}
            </div>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-bold">Name</span>
            <input className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold">Description</span>
            <textarea className="input min-h-20" value={description} maxLength={280} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <fieldset>
            <legend className="mb-1 text-sm font-bold">Category</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button type="button" key={c.id} className="chip" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
                  <CategoryIcon id={c.id} /> {c.label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface-2 p-3">
            <input type="checkbox" className="mt-1 size-5 accent-[var(--accent)]" checked={share} onChange={(e) => setShare(e.target.checked)} />
            <span>
              <span className="flex items-center gap-1.5 font-bold">
                {share ? <Globe2 size={16} /> : <Lock size={16} />} Share to marketplace
              </span>
              <span className="block text-sm text-ink-2">
                {share ? "Everyone can discover it in Explore. Only the link, name, description and icon are shared." : "Only you will see this game (synced to your linked devices)."}
              </span>
            </span>
          </label>
          <button className="btn btn-primary w-full" onClick={save} disabled={saving || !name.trim()}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Star size={16} />} Add to my favorites
          </button>
        </div>
      )}

      <details className="card p-4 text-sm">
        <summary className="cursor-pointer font-bold">Tip: add games in one tap</summary>
        <div className="mt-2 space-y-2 text-ink-2">
          <p>On Android, install this app (browser menu → Install) and use your browser’s Share button on any game — choose DailyGames.</p>
          <p>
            On desktop, drag this bookmarklet to your bookmarks bar, then click it on any game’s page:{" "}
            <BookmarkletLink />
          </p>
        </div>
      </details>
    </div>
  );
}

function BookmarkletLink() {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    // Set via DOM: React blocks javascript: URLs in href props.
    ref.current?.setAttribute("href", `javascript:location.href='${location.origin}/add?url='+encodeURIComponent(location.href)`);
  }, []);
  return (
    <a ref={ref} className="btn btn-soft !py-1 text-xs" onClick={(e) => e.preventDefault()}>
      <Plus size={14} /> Add to DailyGames
    </a>
  );
}
