export function ProgressRing({ done, total, size = 92 }: { done: number; total: number; size?: number }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total ? Math.min(1, done / total) : 0;
  const complete = total > 0 && done >= total;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${done} of ${total} games done today`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={complete ? "var(--good)" : "var(--accent)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">
        <div>
          <div className="text-2xl font-black">{complete ? "🎉" : `${done}/${total}`}</div>
          {!complete && <div className="mt-0.5 text-[10px] font-bold uppercase text-ink-2">done</div>}
        </div>
      </div>
    </div>
  );
}
