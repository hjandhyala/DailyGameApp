import { Brain, CaseSensitive, Clapperboard, Earth, Puzzle, Shapes, Sigma, type LucideIcon } from "lucide-react";
import { category } from "@/lib/shared/categories";

const ICONS: Record<string, LucideIcon> = {
  word: CaseSensitive,
  trivia: Brain,
  geo: Earth,
  math: Sigma,
  logic: Puzzle,
  media: Clapperboard,
  other: Shapes,
};

export function CategoryIcon({ id, size = 14 }: { id: string; size?: number }) {
  const Icon = ICONS[category(id).id] ?? Shapes;
  return <Icon size={size} strokeWidth={2.25} aria-hidden className="shrink-0" />;
}

export function CategoryTag({ id }: { id: string }) {
  const c = category(id);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide"
      style={{ background: `color-mix(in srgb, ${c.color} 16%, transparent)`, color: `color-mix(in srgb, ${c.color} 75%, var(--text))` }}
    >
      <CategoryIcon id={c.id} size={12} />
      {c.label}
    </span>
  );
}
