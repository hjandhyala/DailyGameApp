"use client";
import Link from "next/link";
import { Check, ClipboardPaste, ExternalLink, Flame, Plus, Star } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { storage } from "@/lib/client/device";
import { GameIcon } from "./GameIcon";
import { ProgressRing } from "./ProgressRing";
import { Sheet } from "./Sheet";

const SEEN_KEY = "dgh.tourSeen";

const STEPS = [
  {
    title: "Pick your daily games",
    body: (
      <>
        Tap the <Star size={14} className="inline -mt-0.5" /> on any game in <b>Explore</b> to add it to your list. Missing one? Use{" "}
        <b>Add game</b> and paste its link.
      </>
    ),
    visual: <PickVisual />,
  },
  {
    title: "Play, then paste your result",
    body: (
      <>
        Tap <b>Play</b> to open the game. When you finish, press the game’s <b>Share</b> button, come back and paste. We read your score
        and check the game off.
      </>
    ),
    visual: <PasteVisual />,
  },
  {
    title: "Keep your streak going",
    body: (
      <>
        Today shows what’s left, your streak and your scores. <b>Stats</b> has your history. To use another device, link it in{" "}
        <b>Settings</b>. No account needed.
      </>
    ),
    visual: <TrackVisual />,
  },
];

/**
 * First-visit walkthrough on the Today page. Shows once for new visitors with an empty list;
 * `/?tour=1` (linked from Settings) replays it.
 */
export function WelcomeTour({ hasGames }: { hasGames: boolean }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const replay = useSearchParams().get("tour") === "1";
  const router = useRouter();

  useEffect(() => {
    if (replay) router.replace("/", { scroll: false });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage after hydration
    if (replay || (!hasGames && !storage.get(SEEN_KEY))) setOpen(true);
    // hasGames only matters on first load; later favorites shouldn't reopen or close the tour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replay]);

  function close() {
    storage.set(SEEN_KEY, "1");
    setOpen(false);
    setStep(0);
  }

  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  return (
    <Sheet open={open} onClose={close} title={s.title}>
      <div className="mb-4 grid min-h-36 place-items-center rounded-2xl bg-surface-2 p-4">{s.visual}</div>
      <p className="text-ink-2">{s.body}</p>
      <div className="mt-5 flex items-center gap-2">
        <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((_, i) => (
            <span key={i} className={`h-2 rounded-full transition-all ${i === step ? "w-5 bg-accent" : "w-2 bg-line"}`} />
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          {step > 0 ? (
            <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>
              Back
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={close}>
              Skip
            </button>
          )}
          {last ? (
            hasGames ? (
              <button className="btn btn-primary" onClick={close}>
                Got it
              </button>
            ) : (
              <Link href="/explore" className="btn btn-primary" onClick={close}>
                Explore games
              </Link>
            )
          ) : (
            <button className="btn btn-primary" onClick={() => setStep(step + 1)}>
              Next
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

function PickVisual() {
  const rows = [
    { name: "Krillion", cat: "trivia", on: true },
    { name: "Wordle", cat: "word", on: true },
    { name: "Worldle", cat: "geo", on: false },
  ];
  return (
    <ul className="w-full max-w-64 space-y-1.5" aria-hidden>
      {rows.map((r) => (
        <li key={r.name} className="flex items-center gap-2 rounded-xl bg-surface p-2 shadow-card">
          <GameIcon name={r.name} iconUrl={null} cat={r.cat} size={28} />
          <span className="flex-1 text-sm font-bold">{r.name}</span>
          <Star size={18} className={r.on ? "fill-amber-400 text-amber-400" : "text-ink-2"} />
        </li>
      ))}
      <li className="flex items-center justify-center gap-1 pt-1 text-xs font-bold text-accent">
        <Plus size={14} /> Add game by link
      </li>
    </ul>
  );
}

function PasteVisual() {
  return (
    <div className="w-full max-w-64 space-y-2" aria-hidden>
      <div className="flex items-center gap-2">
        <span className="btn btn-primary pointer-events-none flex-1 !py-1.5 text-sm">
          Play <ExternalLink size={14} />
        </span>
        <span className="btn btn-soft pointer-events-none !px-3 !py-1.5 text-sm">
          <ClipboardPaste size={14} />
        </span>
      </div>
      <pre className="rounded-xl bg-surface p-2.5 font-mono text-xs leading-relaxed shadow-card">{"Wordle 1,620 3/6\n🟩🟨⬛⬛⬛\n🟩🟩🟩🟩🟩"}</pre>
      <div className="flex items-center gap-2 rounded-xl bg-accent-soft px-3 py-1.5 text-sm">
        <span className="text-xs font-bold uppercase text-ink-2">Result</span>
        <span className="font-black text-accent">3/6</span>
        <Check size={16} strokeWidth={3} className="ml-auto text-good" />
      </div>
    </div>
  );
}

function TrackVisual() {
  return (
    <div className="flex items-center gap-4" aria-hidden>
      <ProgressRing done={3} total={4} size={76} />
      <div className="space-y-1.5">
        <p className="font-black">3 of 4 done</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-sm font-bold">
          <Flame size={15} className="text-orange-500" /> 12 day streak
        </span>
      </div>
    </div>
  );
}
