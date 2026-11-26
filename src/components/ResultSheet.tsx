"use client";
import { ClipboardPaste, Check } from "lucide-react";
import { useMemo, useState } from "react";
import { parseShare } from "@/lib/parsers";
import { markPlayed, type GameView } from "@/lib/client/store";
import { Sheet } from "./Sheet";

export function ResultSheet({ game, open, onClose, initialText = "" }: { game: GameView | null; open: boolean; onClose: () => void; initialText?: string }) {
  return (
    <Sheet open={open} onClose={onClose} title={game ? `Finished ${game.name}?` : "Add result"}>
      <ResultForm game={game} onClose={onClose} initialText={initialText} />
    </Sheet>
  );
}

function ResultForm({ game, onClose, initialText }: { game: GameView | null; onClose: () => void; initialText: string }) {
  const [text, setText] = useState(initialText);
  const [clipError, setClipError] = useState(false);
  const parsed = useMemo(() => (text.trim() ? parseShare(text, game?.slug) : null), [text, game?.slug]);

  async function paste() {
    try {
      const t = await navigator.clipboard.readText();
      setText(t);
    } catch {
      setClipError(true);
    }
  }
  async function save(withResult: boolean) {
    if (!game) return;
    await markPlayed(game.ref, withResult && parsed ? { resultText: text.trim().slice(0, 2000), result: parsed.result } : {});
    onClose();
  }

  return (
    <>
      <p className="mb-3 text-sm text-ink-2">Paste the share text from the game to save your score — or just mark it done.</p>
      <div className="relative">
        <textarea
          className="input min-h-28 resize-y font-mono text-sm"
          placeholder={"e.g. Wordle 1,234 3/6\n⬛🟨⬛⬛⬛\n🟩🟩🟩🟩🟩"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Share text"
        />
        <button type="button" className="btn btn-soft absolute bottom-3 right-2 !px-3 !py-1.5 text-xs" onClick={paste}>
          <ClipboardPaste size={14} /> Paste
        </button>
      </div>
      {clipError && <p className="mt-1 text-xs text-ink-2">Clipboard access was blocked — long-press the box and choose Paste.</p>}
      {parsed && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-accent-soft px-4 py-3">
          <span className="text-xs font-bold uppercase text-ink-2">Result</span>
          <span className={`text-lg font-black ${parsed.result.failed ? "text-danger" : "text-accent"}`}>{parsed.result.label}</span>
          {parsed.slug && game?.slug && parsed.slug !== game.slug && (
            <span className="ml-auto text-xs text-warn">Looks like a {parsed.slug} result</span>
          )}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn btn-primary flex-1" onClick={() => save(true)} disabled={!parsed}>
          <Check size={18} strokeWidth={3} /> Save result
        </button>
        <button className="btn btn-soft flex-1" onClick={() => save(false)}>
          Just mark done
        </button>
        <button className="btn btn-ghost w-full sm:w-auto" onClick={onClose}>
          Not yet
        </button>
      </div>
    </>
  );
}
