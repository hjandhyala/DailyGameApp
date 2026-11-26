const TRACKING = /^(utm_|fbclid|gclid|mc_|ref$|ref_src$|igshid|si$)/i;

/** Parse a user-entered URL, adding https:// if no scheme is given. */
export function parseGameUrl(input: string): URL | null {
  let s = input.trim();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    return u;
  } catch {
    return null;
  }
}

/** Canonical form used for de-duplication: host without www, path without trailing slash, no tracking params/hash. */
export function normalizeUrl(input: string | URL): string | null {
  const u = typeof input === "string" ? parseGameUrl(input) : new URL(input.toString());
  if (!u) return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const params = [...u.searchParams.entries()]
    .filter(([k]) => !TRACKING.test(k))
    .sort(([a], [b]) => a.localeCompare(b));
  const qs = params.length ? `?${new URLSearchParams(params).toString()}` : "";
  let path = u.pathname.replace(/\/+$/, "");
  path = path.replace(/\/index\.html?$/i, "");
  const port = u.port && u.port !== "80" && u.port !== "443" ? `:${u.port}` : "";
  return `${host}${port}${path}${qs}`;
}

export function hostOf(input: string): string {
  const u = parseGameUrl(input);
  return u ? u.hostname.toLowerCase().replace(/^www\./, "") : "";
}

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "game"
  );
}

export function faviconFor(url: string) {
  const host = hostOf(url);
  return host ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128` : null;
}
