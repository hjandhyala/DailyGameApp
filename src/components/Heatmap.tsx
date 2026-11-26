"use client";
import { useMemo, useState } from "react";
import { addDays, weekday } from "@/lib/shared/dates";

const STEPS = ["var(--seq-0)", "var(--seq-1)", "var(--seq-2)", "var(--seq-3)", "var(--seq-4)", "var(--seq-5)"];

function step(v: number) {
  if (v <= 0) return 0;
  return Math.min(5, Math.max(1, Math.ceil(v * 5)));
}

/**
 * Calendar heatmap: one column per week, one cell per day.
 * `values` maps day → 0..1 (share of favorites done). `label` formats the tooltip.
 */
export function Heatmap({
  end,
  weeks = 26,
  values,
  label,
  cell = 14,
}: {
  end: string;
  weeks?: number;
  values: Map<string, number>;
  label: (day: string, v: number) => string;
  cell?: number;
}) {
  const [hover, setHover] = useState<{ day: string; x: number; y: number } | null>(null);
  const gap = 3;
  // Align so the last column is `end`'s week (Sunday-first rows).
  const first = addDays(end, -((weeks - 1) * 7 + weekday(end)));
  const days = useMemo(() => Array.from({ length: weeks * 7 }, (_, i) => addDays(first, i)).filter((d) => d <= end), [first, weeks, end]);
  const w = weeks * (cell + gap) + 24;
  const h = 7 * (cell + gap) + 18;
  const months: { x: number; label: string }[] = [];
  days.forEach((d, i) => {
    if (d.endsWith("-01") || i === 0) {
      const x = 24 + Math.floor(i / 7) * (cell + gap);
      if (!months.length || x - months[months.length - 1].x > 28) {
        months.push({ x, label: new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: "short" }) });
      }
    }
  });

  return (
    <div className="relative">
      <div className="no-scrollbar overflow-x-auto">
        <svg width={w} height={h} role="img" aria-label="Daily activity calendar" className="block">
          {months.map((m) => (
            <text key={m.x} x={m.x} y={10} fontSize={10} fill="var(--text-2)" fontWeight={700}>
              {m.label}
            </text>
          ))}
          {["M", "W", "F"].map((l, i) => (
            <text key={l} x={0} y={18 + (i * 2 + 1) * (cell + gap) + cell - 3} fontSize={9} fill="var(--text-2)">
              {l}
            </text>
          ))}
          {days.map((d, i) => {
            const v = values.get(d) ?? 0;
            const x = 24 + Math.floor(i / 7) * (cell + gap);
            const y = 18 + (i % 7) * (cell + gap);
            return (
              <rect
                key={d}
                x={x}
                y={y}
                width={cell}
                height={cell}
                rx={3}
                fill={STEPS[step(v)]}
                stroke={d === end ? "var(--text)" : "none"}
                strokeWidth={d === end ? 1.5 : 0}
                onMouseEnter={() => setHover({ day: d, x: x + cell / 2, y })}
                onMouseLeave={() => setHover(null)}
              >
                <title>{label(d, v)}</title>
              </rect>
            );
          })}
        </svg>
      </div>
      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-xs font-bold text-bg shadow"
          style={{ left: hover.x, top: hover.y - 4 }}
        >
          {label(hover.day, values.get(hover.day) ?? 0)}
        </div>
      )}
      <div className="mt-2 flex items-center justify-end gap-1 text-[11px] text-ink-2">
        Less
        {STEPS.map((s) => (
          <span key={s} className="inline-block size-3 rounded-[3px]" style={{ background: s }} />
        ))}
        More
      </div>
    </div>
  );
}
