import { addDays, daysBetween } from "./dates";

export interface StreakInfo {
  current: number;
  best: number;
  /** True if the current streak is still alive but today isn't done yet. */
  atRisk: boolean;
}

/**
 * Streak over a set of days. The current streak counts consecutive days ending
 * today — or yesterday, so a streak isn't "broken" before you've had a chance to play.
 */
export function computeStreak(days: Iterable<string>, today: string): StreakInfo {
  const set = new Set(days);
  const sorted = [...set].filter((d) => d <= today).sort();
  let best = 0;
  let run = 0;
  let prev: string | undefined;
  for (const d of sorted) {
    run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  let current = 0;
  let cursor = set.has(today) ? today : addDays(today, -1);
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return { current, best, atRisk: current > 0 && !set.has(today) };
}

/** Days on which every one of `required` games was played (perfect days). */
export function perfectDays(playsByDay: Map<string, Set<string>>, required: string[]) {
  if (!required.length) return [];
  return [...playsByDay.entries()]
    .filter(([, games]) => required.every((g) => games.has(g)))
    .map(([d]) => d);
}
