export const CATEGORIES = [
  { id: "word", label: "Word", emoji: "🔤", color: "#22c55e" },
  { id: "trivia", label: "Trivia", emoji: "🧠", color: "#a855f7" },
  { id: "geo", label: "Geography", emoji: "🌍", color: "#0ea5e9" },
  { id: "math", label: "Numbers", emoji: "🔢", color: "#f97316" },
  { id: "logic", label: "Logic", emoji: "🧩", color: "#ec4899" },
  { id: "media", label: "Movies & Music", emoji: "🎬", color: "#ef4444" },
  { id: "other", label: "Other", emoji: "🎲", color: "#64748b" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

export function category(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}
