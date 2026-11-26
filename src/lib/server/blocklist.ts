import "server-only";

// Minimal spam guard. Extend via BLOCKED_HOSTS env (comma-separated).
const BUILTIN_HOSTS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "cutt.ly"];
const WORDS = /\b(casino|viagra|porn|xxx|crypto ?giveaway|onlyfans|escort|loan approval)\b/i;

export function isBlocked(hostname: string, ...texts: string[]) {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  const extra = (process.env.BLOCKED_HOSTS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if ([...BUILTIN_HOSTS, ...extra].some((h) => host === h || host.endsWith(`.${h}`))) return true;
  return texts.some((t) => WORDS.test(t));
}
