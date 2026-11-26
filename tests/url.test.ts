import { describe, expect, it } from "vitest";
import { normalizeUrl, parseGameUrl } from "@/lib/shared/url";

describe("url normalization", () => {
  it("dedupes common variants", () => {
    const a = normalizeUrl("https://www.nytimes.com/games/wordle/index.html?utm_source=x");
    const b = normalizeUrl("nytimes.com/games/wordle/");
    expect(a).toBe("nytimes.com/games/wordle");
    expect(b).toBe(a);
  });
  it("keeps meaningful query params", () => {
    expect(normalizeUrl("https://example.com/play?mode=daily&utm_campaign=z")).toBe("example.com/play?mode=daily");
  });
  it("rejects non-web urls", () => {
    expect(parseGameUrl("javascript:alert(1)")).toBeNull();
    expect(parseGameUrl("ftp://x.com")).toBeNull();
    expect(parseGameUrl("localhost")).toBeNull();
  });
});
