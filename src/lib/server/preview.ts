import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { faviconFor, parseGameUrl } from "@/lib/shared/url";

const MAX_BYTES = 1_000_000;
const TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;

function ipv4Private(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

export function isPrivateIp(ip: string) {
  if (isIP(ip) === 4) return ipv4Private(ip);
  const v6 = ip.toLowerCase();
  if (v6 === "::" || v6 === "::1") return true;
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return ipv4Private(mapped[1]);
  return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(v6);
}

export class UnsafeUrlError extends Error {}

/** Throws UnsafeUrlError unless the URL is public http(s) on a standard port. */
export async function assertPublicUrl(u: URL) {
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new UnsafeUrlError("Only http(s) links are allowed");
  if (u.port && u.port !== "80" && u.port !== "443") throw new UnsafeUrlError("Non-standard ports are not allowed");
  if (u.username || u.password) throw new UnsafeUrlError("Credentials in URLs are not allowed");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new UnsafeUrlError("Private hosts are not allowed");
  }
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) {
    throw new UnsafeUrlError("That host resolves to a private address");
  }
}

async function readCapped(res: Response) {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let html = "";
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    html += decoder.decode(value, { stream: true });
    if (bytes > MAX_BYTES || /<\/head>/i.test(html)) break;
  }
  reader.cancel().catch(() => {});
  return html;
}

/** Fetch a URL safely, following a few redirects while re-validating each hop. */
export async function safeFetchHtml(start: URL) {
  let url = start;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    await assertPublicUrl(url);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; DailyGamesHubBot/1.0; link preview)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url);
      continue;
    }
    const type = res.headers.get("content-type") ?? "";
    const html = type.includes("html") ? await readCapped(res) : "";
    return { finalUrl: url, status: res.status, html };
  }
  throw new UnsafeUrlError("Too many redirects");
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };
function decode(s: string) {
  return s
    .replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, e: string) => {
      if (e[0] === "#") {
        const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function attrs(tag: string) {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    out[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? "";
  }
  return out;
}

export function extractMeta(html: string, base: URL) {
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => attrs(m[0]));
  const meta = (...names: string[]) => {
    for (const n of names) {
      const hit = metas.find((a) => (a.property ?? a.name ?? "").toLowerCase() === n && a.content);
      if (hit) return decode(hit.content);
    }
    return "";
  };
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  const title = meta("og:site_name", "application-name", "og:title", "twitter:title") || decode(titleTag);

  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => attrs(m[0]));
  const iconRank = (rel: string) =>
    rel.includes("apple-touch-icon") ? 3 : rel === "icon" || rel.includes("shortcut") ? 2 : rel.includes("icon") ? 1 : 0;
  const icon = links
    .filter((l) => l.href && iconRank((l.rel ?? "").toLowerCase()) > 0)
    .sort((a, b) => iconRank((b.rel ?? "").toLowerCase()) - iconRank((a.rel ?? "").toLowerCase()))[0];
  let iconUrl: string | null = null;
  if (icon) {
    try {
      const u = new URL(icon.href, base);
      if (u.protocol === "https:" || u.protocol === "http:") iconUrl = u.toString();
    } catch {}
  }
  return {
    title: title.slice(0, 80),
    description: meta("og:description", "description", "twitter:description").slice(0, 280),
    iconUrl: iconUrl ?? faviconFor(base.toString()),
  };
}

export async function fetchPreview(input: string) {
  const u = parseGameUrl(input);
  if (!u) throw new UnsafeUrlError("That doesn't look like a valid link");
  try {
    const { finalUrl, status, html } = await safeFetchHtml(u);
    const meta = extractMeta(html, finalUrl);
    return { url: finalUrl.toString(), reachable: status < 400, ...meta };
  } catch (e) {
    if (e instanceof UnsafeUrlError) throw e;
    // Network failure / timeout: still allow adding, with fallback metadata.
    return {
      url: u.toString(),
      reachable: false,
      title: "",
      description: "",
      iconUrl: faviconFor(u.toString()),
    };
  }
}
