"use client";
import { useState } from "react";
import { fmtNum, niceMax, shortDay, useWidth } from "./useWidth";

/** Single-series daily bar chart with per-bar hover tooltip. */
export function BarChart({ days, values, label, color = "var(--viz-1)", height = 200 }: { days: string[]; values: number[]; label: string; color?: string; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { top: 12, right: 8, bottom: 26, left: 40 };
  const iw = width - m.left - m.right;
  const ih = height - m.top - m.bottom;
  const max = niceMax(Math.max(1, ...values));
  const slot = iw / Math.max(1, values.length);
  const bw = Math.max(2, Math.min(28, slot - 2));
  const y = (v: number) => m.top + ih - (v / max) * ih;
  const ticks = [0, 0.5, 1].map((t) => max * t);
  const labelEvery = Math.ceil(days.length / Math.max(2, Math.floor(iw / 70)));

  return (
    <div ref={ref} className="relative w-full">
      <svg width={width} height={height} className="block" role="img" aria-label={`${label} per day`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.left} x2={m.left + iw} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray={t === 0 ? undefined : "2 4"} />
            <text x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--text-2)">
              {fmtNum(t)}
            </text>
          </g>
        ))}
        {values.map((v, i) => {
          const cx = m.left + slot * i + slot / 2;
          const h = Math.max(v > 0 ? 2 : 0, ih - (y(v) - m.top));
          const r = Math.min(4, bw / 2, h);
          const x0 = cx - bw / 2;
          const top = m.top + ih - h;
          return (
            <g key={days[i]} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onPointerDown={() => setHover(i)}>
              <rect x={m.left + slot * i} y={m.top} width={slot} height={ih} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x0},${m.top + ih} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + bw - r} Q${x0 + bw},${top} ${x0 + bw},${top + r} V${m.top + ih} Z`}
                  fill={color}
                  opacity={hover === null || hover === i ? 1 : 0.55}
                />
              )}
            </g>
          );
        })}
        {days.map((d, i) =>
          i % labelEvery === 0 || i === days.length - 1 ? (
            <text key={d} x={m.left + slot * i + slot / 2} y={height - 6} textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"} fontSize={11} fill="var(--text-2)">
              {shortDay(d)}
            </text>
          ) : null,
        )}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute z-10 rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lg"
          style={{ left: Math.min(width - 130, Math.max(0, m.left + slot * hover + slot / 2 + 10)), top: Math.max(0, y(values[hover]) - 40) }}
        >
          <div className="font-black text-ink">{shortDay(days[hover])}</div>
          <div className="text-ink-2">
            {label}: <span className="font-black text-ink">{fmtNum(values[hover])}</span>
          </div>
        </div>
      )}
    </div>
  );
}
