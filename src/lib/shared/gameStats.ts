import { formatClock, type ParsedResult } from "@/lib/parsers";
import { computeStreak, type StreakInfo } from "./streaks";

export interface PlayLike {
  ref: string;
  day: string;
  result?: ParsedResult;
}

export interface GameStats extends StreakInfo {
  plays: number;
  winRate: number | null;
  avgScore: string | null;
  bestTime: string | null;
}

export function gameStats(plays: PlayLike[], today: string): GameStats {
  const s = computeStreak(plays.map((p) => p.day), today);
  const withOutcome = plays.filter((p) => p.result && p.result.failed !== undefined);
  const wins = withOutcome.filter((p) => !p.result!.failed).length;
  const scored = plays.filter((p) => p.result?.score !== undefined && !p.result.failed);
  const timed = plays.filter((p) => p.result?.timeSec !== undefined).map((p) => p.result!.timeSec!);
  const avg = scored.length ? scored.reduce((a, p) => a + p.result!.score!, 0) / scored.length : null;
  return {
    ...s,
    plays: plays.length,
    winRate: withOutcome.length ? wins / withOutcome.length : null,
    avgScore: avg === null ? null : avg >= 100 ? Math.round(avg).toLocaleString("en-US") : avg.toFixed(1),
    bestTime: timed.length ? formatClock(Math.min(...timed)) : null,
  };
}
