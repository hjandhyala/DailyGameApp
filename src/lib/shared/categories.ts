export const CATEGORIES = [
  { id: "word", label: "Word", color: "#22c55e" },
  { id: "trivia", label: "Trivia", color: "#a855f7" },
  { id: "geo", label: "Geography", color: "#0ea5e9" },
  { id: "math", label: "Numbers", color: "#f97316" },
  { id: "logic", label: "Logic", color: "#ec4899" },
  { id: "media", label: "Movies & Music", color: "#ef4444" },
  { id: "other", label: "Other", color: "#64748b" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

export function category(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}
