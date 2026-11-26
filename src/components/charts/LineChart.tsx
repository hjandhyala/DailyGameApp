"use client";
import { useState } from "react";
import { fmtNum, niceMax, shortDay, useWidth } from "./useWidth";

export interface LineSeries {
  key: string;
  label: string;
  color: string; // CSS color / var
  values: number[];
}

/** Multi-series line chart over days, one shared y-axis, crosshair + tooltip on hover. */
export function LineChart({ days, series, height = 220, area = false }: { days: string[]; series: LineSeries[]; height?: number; area?: boolean }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { top: 12, right: series.length > 1 ? 64 : 16, bottom: 26, left: 40 };
  const iw = width - m.left - m.right;
  const ih = height - m.top - m.bottom;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const x = (i: number) => m.left + (days.length <= 1 ? iw / 2 : (i / (days.length - 1)) * iw);
  const y = (v: number) => m.top + ih - (v / max) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t * 100) / 100);
  const labelEvery = Math.ceil(days.length / Math.max(2, Math.floor(iw / 70)));

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const i = Math.round((px / r.width) * (days.length - 1));
    setHover(Math.max(0, Math.min(days.length - 1, i)));
  }

  // Avoid overlapping end labels.
  const ends = series
    .map((s) => ({ s, y: y(s.values[s.values.length - 1] ?? 0) }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;

  return (
    <div ref={ref} className="relative w-full">
      {series.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-ink-2">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-[3px] w-4 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <svg width={width} height={height} className="block overflow-visible" role="img" aria-label={series.map((s) => s.label).join(", ") + " over time"}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.left} x2={m.left + iw} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} strokeDasharray={t === 0 ? undefined : "2 4"} />
            <text x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--text-2)">
              {fmtNum(t)}
            </text>
          </g>
        ))}
        {days.map((d, i) =>
          i % labelEvery === 0 || i === days.length - 1 ? (
            <text key={d} x={x(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"} fontSize={11} fill="var(--text-2)">
              {shortDay(d)}
            </text>
          ) : null,
        )}
        {series.map((s) => {
          const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
          return (
            <g key={s.key}>
              {area && <polygon points={`${x(0)},${y(0)} ${pts} ${x(s.values.length - 1)},${y(0)}`} fill={s.color} opacity={0.12} />}
              <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </g>
          );
        })}
        {series.length > 1 &&
          ends.map(({ s, y: ly }) => (
            <text key={s.key} x={m.left + iw + 8} y={ly} dy="0.32em" fontSize={11} fontWeight={700} fill="var(--text)">
              {fmtNum(s.values[s.values.length - 1] ?? 0)} <tspan fill="var(--text-2)" fontWeight={600}>{s.label.split(" ")[0].toLowerCase()}</tspan>
            </text>
          ))}
        {hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={m.top} y2={m.top + ih} stroke="var(--text-2)" strokeWidth={1} />
            {series.map((s) => (
              <circle key={s.key} cx={x(hover)} cy={y(s.values[hover] ?? 0)} r={4.5} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
            ))}
          </g>
        )}
        <rect
          x={m.left}
          y={m.top}
          width={iw}
          height={ih}
          fill="transparent"
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute z-10 min-w-32 rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lg"
          style={{
            left: Math.min(width - 150, Math.max(0, x(hover) + 12)),
            top: (series.length > 1 ? 24 : 0) + m.top,
          }}
        >
          <div className="mb-1 font-black text-ink">{shortDay(days[hover])}</div>
          {series.map((s) => (
            <div key={s.key} className="flex items-center gap-2 text-ink-2">
              <span className="inline-block size-2 rounded-full" style={{ background: s.color }} />
              <span className="flex-1">{s.label}</span>
              <span className="font-black text-ink">{fmtNum(s.values[hover] ?? 0)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
