import { category } from "@/lib/shared/categories";

export function CategoryTag({ id }: { id: string }) {
  const c = category(id);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide"
      style={{ background: `color-mix(in srgb, ${c.color} 16%, transparent)`, color: `color-mix(in srgb, ${c.color} 75%, var(--text))` }}
    >
      <span aria-hidden>{c.emoji}</span>
      {c.label}
    </span>
  );
}
