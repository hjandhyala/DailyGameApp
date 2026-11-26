/**
 * Share-text parsers. Each parser recognises the text a game puts on your
 * clipboard when you press "Share" and extracts a compact result.
 */

export interface ParsedResult {
  /** Short human label, e.g. "3/6", "0:42", "Genius", "2 mistakes". */
  label: string;
  score?: number;
  max?: number;
  failed?: boolean;
  timeSec?: number;
  /** Emoji grid lines, if any. */
  grid?: string;
  /** Puzzle number if the share text includes one. */
  puzzle?: string;
}

export interface Parser {
  slug: string;
  detect: RegExp;
  parse(text: string): ParsedResult | null;
}

const EMOJI_LINE = /^[\s\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}⬛⬜\u{1F7E5}-\u{1F7EB}️⃣\d#*]+$/u;

export function extractGrid(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && EMOJI_LINE.test(l) && /\p{Extended_Pictographic}|[\u{1F7E5}-\u{1F7EB}⬛⬜]/u.test(l));
  return lines.length ? lines.join("\n") : undefined;
}

export function parseClock(s: string) {
  const parts = s.split(":").map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return undefined;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

export function formatClock(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

const num = (s: string) => Number(s.replace(/[,.\s]/g, ""));

/** "<Name> #123 3/6" style used by many clones. */
function slashGame(slug: string, name: RegExp, max?: number): Parser {
  return {
    slug,
    detect: name,
    parse(text) {
      const re = new RegExp(`${name.source}[^\\n]*?(?:#?\\s*([\\d,.]+))?[^\\n]*?\\b([0-9]+|X)\\s*/\\s*(${max ?? "\\d+"})`, "i");
      const m = text.match(re);
      if (!m) return null;
      const failed = m[2].toUpperCase() === "X";
      const mx = Number(m[3]);
      return {
        label: `${m[2].toUpperCase()}/${mx}`,
        score: failed ? undefined : Number(m[2]),
        max: mx,
        failed,
        puzzle: m[1],
        grid: extractGrid(text),
      };
    },
  };
}

/** LinkedIn-style "Queens #123 | 1:23" */
function timedGame(slug: string, name: RegExp): Parser {
  return {
    slug,
    detect: name,
    parse(text) {
      const m = text.match(new RegExp(`${name.source}\\s*#?\\s*(\\d+)?[^\\n]*?(\\d+:\\d{2}(?::\\d{2})?)`, "i"));
      if (!m) return null;
      const timeSec = parseClock(m[2]);
      return { label: m[2], timeSec, puzzle: m[1] };
    },
  };
}

const SPELLING_BEE_RANKS = ["Beginner", "Good Start", "Moving Up", "Good", "Solid", "Nice", "Great", "Amazing", "Genius", "Queen Bee"];

export const PARSERS: Parser[] = [
  {
    slug: "wordle",
    detect: /\bWordle\s+[\d,.]+/i,
    parse(text) {
      const m = text.match(/\bWordle\s+([\d,.]+)\s+([1-6X])\/6(\*?)/i);
      if (!m) return null;
      const failed = m[2].toUpperCase() === "X";
      return {
        label: `${m[2].toUpperCase()}/6${m[3] ? "*" : ""}`,
        score: failed ? undefined : Number(m[2]),
        max: 6,
        failed,
        puzzle: String(num(m[1])),
        grid: extractGrid(text),
      };
    },
  },
  {
    slug: "connections",
    detect: /\bConnections\b[\s\S]*Puzzle\s*#/i,
    parse(text) {
      const rows = text
        .split(/\r?\n/)
        .map((l) => [...l.trim()].filter((c) => /[\u{1F7E8}\u{1F7E9}\u{1F7E6}\u{1F7EA}]/u.test(c)))
        .filter((r) => r.length === 4);
      if (!rows.length) return null;
      const solved = rows.filter((r) => r.every((c) => c === r[0])).length;
      const mistakes = rows.length - solved;
      const failed = solved < 4;
      return {
        label: failed ? `${solved}/4 groups` : mistakes === 0 ? "Perfect" : `${mistakes} mistake${mistakes > 1 ? "s" : ""}`,
        score: mistakes,
        max: 4,
        failed,
        puzzle: text.match(/Puzzle\s*#\s*(\d+)/i)?.[1],
        grid: extractGrid(text),
      };
    },
  },
  {
    slug: "strands",
    detect: /\bStrands\s*#\s*\d+/i,
    parse(text) {
      const grid = extractGrid(text) ?? "";
      const hints = [...grid].filter((c) => c === "💡").length;
      return {
        label: hints ? `${hints} hint${hints > 1 ? "s" : ""}` : "No hints",
        score: hints,
        puzzle: text.match(/Strands\s*#\s*(\d+)/i)?.[1],
        grid: grid || undefined,
      };
    },
  },
  {
    slug: "the-mini",
    detect: /Mini Crossword/i,
    parse(text) {
      const m = text.match(/Mini Crossword in\s+(\d+:\d{2}(?::\d{2})?)/i);
      if (!m) return null;
      return { label: m[1], timeSec: parseClock(m[1]) };
    },
  },
  {
    slug: "spelling-bee",
    detect: /Spelling Bee/i,
    parse(text) {
      const rank = [...SPELLING_BEE_RANKS].reverse().find((r) => new RegExp(`\\b${r}\\b`, "i").test(text));
      const pts = text.match(/(\d+)\s*(?:points|pts)/i);
      if (!rank && !pts) return null;
      return {
        label: rank ?? `${pts![1]} pts`,
        score: pts ? Number(pts[1]) : SPELLING_BEE_RANKS.indexOf(rank!) + 1,
      };
    },
  },
  {
    slug: "quordle",
    detect: /Daily Quordle/i,
    parse(text) {
      const after = text.split(/Daily Quordle[^\n]*\n/i)[1] ?? "";
      const cells = [...after.matchAll(/([1-9])️?⃣|🟥/gu)].slice(0, 4).map((m) => (m[1] ? Number(m[1]) : null));
      if (cells.length < 4) return null;
      const failed = cells.some((c) => c === null);
      return {
        label: cells.map((c) => c ?? "X").join(" "),
        score: failed ? undefined : Math.max(...(cells as number[])),
        max: 9,
        failed,
        puzzle: text.match(/Daily Quordle\s*#?\s*(\d+)/i)?.[1],
      };
    },
  },
  {
    slug: "octordle",
    detect: /Daily Octordle/i,
    parse(text) {
      const score = text.match(/Score:\s*(\d+)/i);
      if (!score) return null;
      return { label: `Score ${score[1]}`, score: Number(score[1]), puzzle: text.match(/Octordle\s*#?\s*(\d+)/i)?.[1] };
    },
  },
  {
    slug: "framed",
    detect: /\bFramed\s*#\s*\d+/i,
    parse(text) {
      const line = text.split(/\r?\n/).find((l) => /🎥/u.test(l));
      if (!line) return null;
      const squares = [...line].filter((c) => /[🟥🟩⬛]/u.test(c));
      const hit = squares.indexOf("🟩");
      const failed = hit < 0;
      return {
        label: failed ? "X/6" : `${hit + 1}/6`,
        score: failed ? undefined : hit + 1,
        max: 6,
        failed,
        puzzle: text.match(/Framed\s*#\s*(\d+)/i)?.[1],
        grid: line.trim(),
      };
    },
  },
  {
    slug: "globle",
    detect: /#globle/i,
    parse(text) {
      const m = text.match(/=\s*(\d+)/);
      if (!m) return null;
      return { label: `${m[1]} guesses`, score: Number(m[1]), grid: extractGrid(text) };
    },
  },
  {
    slug: "waffle",
    detect: /#waffle\s*\d+/i,
    parse(text) {
      const m = text.match(/#waffle\s*(\d+)\s+([0-5X])\/5/i);
      if (!m) return null;
      const failed = m[2].toUpperCase() === "X";
      return { label: `${m[2]}/5 ⭐`, score: failed ? 0 : Number(m[2]), max: 5, failed, puzzle: m[1] };
    },
  },
  {
    slug: "contexto",
    detect: /contexto/i,
    parse(text) {
      const m = text.match(/got it in\s+(\d+)\s+guesses/i) ?? text.match(/(\d+)\s+guesses/i);
      if (!m) return null;
      const gaveUp = /gave up/i.test(text);
      return { label: gaveUp ? "Gave up" : `${m[1]} guesses`, score: Number(m[1]), failed: gaveUp };
    },
  },
  {
    slug: "pinpoint",
    detect: /\bPinpoint\s*#\s*\d+/i,
    parse(text) {
      const m = text.match(/(\d)\s*guess/i);
      if (!m) return null;
      return { label: `${m[1]} guess${m[1] === "1" ? "" : "es"}`, score: Number(m[1]), max: 5, puzzle: text.match(/Pinpoint\s*#\s*(\d+)/i)?.[1] };
    },
  },
  timedGame("queens", /\bQueens/),
  timedGame("tango", /\bTango/),
  timedGame("zip", /\bZip/),
  {
    // Best-effort: Krillion scores answers by rarity (points) and depth (meters).
    slug: "krillion",
    detect: /krillion/i,
    parse(text) {
      const pts = text.match(/([\d,]+)\s*(?:pts|points)\b/i);
      const depth = text.match(/([\d,]+)\s*(?:m|meters|metres)\b/i);
      if (!pts && !depth) return null;
      const score = num((pts ?? depth)![1]);
      return { label: pts ? `${score.toLocaleString("en-US")} pts` : `${score.toLocaleString("en-US")} m`, score, grid: extractGrid(text) };
    },
  },
  {
    // Best-effort: Daily Tens — name the top ten.
    slug: "daily-tens",
    detect: /daily\s*tens/i,
    parse(text) {
      const m = text.match(/\b(\d{1,2})\s*\/\s*10\b/);
      if (!m) return null;
      return { label: `${m[1]}/10`, score: Number(m[1]), max: 10, grid: extractGrid(text) };
    },
  },
  slashGame("worldle", /#Worldle/i, 6),
  slashGame("tradle", /#Tradle/i, 6),
  slashGame("nerdle", /nerdlegame/i, 6),
  slashGame("mathler", /Mathler/i, 6),
  slashGame("bandle", /Bandle/i, 6),
  slashGame("costcodle", /Costcodle/i, 6),
  slashGame("flagle", /Flagle/i, 6),
  slashGame("phrazle", /Phrazle/i, 6),
];

/** Fallback for unknown games: N/M, X/M, a clock time, or "N guesses". */
export function parseGeneric(text: string): ParsedResult | null {
  const slash = text.match(/\b([0-9]{1,3}|X)\s*\/\s*([0-9]{1,3})\b/i);
  if (slash) {
    const failed = slash[1].toUpperCase() === "X";
    return {
      label: `${slash[1].toUpperCase()}/${slash[2]}`,
      score: failed ? undefined : Number(slash[1]),
      max: Number(slash[2]),
      failed,
      grid: extractGrid(text),
    };
  }
  const clock = text.match(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/);
  if (clock) return { label: clock[1], timeSec: parseClock(clock[1]), grid: extractGrid(text) };
  const guesses = text.match(/\b(\d+)\s+(?:guesses|tries|attempts)\b/i);
  if (guesses) return { label: `${guesses[1]} guesses`, score: Number(guesses[1]), grid: extractGrid(text) };
  const pts = text.match(/\b([\d,]+)\s*(?:pts|points)\b/i);
  if (pts) return { label: `${pts[1]} pts`, score: num(pts[1]), grid: extractGrid(text) };
  const grid = extractGrid(text);
  return grid ? { label: "Done", grid } : null;
}

export function parserFor(slug: string | undefined) {
  return slug ? PARSERS.find((p) => p.slug === slug) : undefined;
}

/** Which game does this share text belong to? Returns a seed slug or undefined. */
export function detectGame(text: string): string | undefined {
  return PARSERS.find((p) => p.detect.test(text) && p.parse(text))?.slug;
}

/**
 * Parse share text. If `slug` is given (we know which game the user just played),
 * its parser is tried first; then auto-detection; then the generic fallback.
 */
export function parseShare(text: string, slug?: string): { slug?: string; result: ParsedResult } | null {
  const t = text.trim().slice(0, 4000);
  if (!t) return null;
  const preferred = parserFor(slug);
  const r1 = preferred?.parse(t);
  if (r1) return { slug, result: r1 };
  const detected = detectGame(t);
  if (detected) return { slug: detected, result: parserFor(detected)!.parse(t)! };
  const g = parseGeneric(t);
  return g ? { slug, result: g } : { slug, result: { label: "Done" } };
}
