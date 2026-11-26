import { describe, expect, it } from "vitest";
import { assertPublicUrl, extractMeta, isPrivateIp } from "@/lib/server/preview";

describe("SSRF guard", () => {
  it("flags private ranges", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.1", "172.20.0.1", "169.254.169.254", "::1", "fd00::1", "::ffff:127.0.0.1", "0.0.0.0"]) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
    for (const ip of ["8.8.8.8", "1.1.1.1", "2606:4700::1111"]) expect(isPrivateIp(ip), ip).toBe(false);
  });
  it("rejects unsafe urls", async () => {
    await expect(assertPublicUrl(new URL("http://127.0.0.1/"))).rejects.toThrow();
    await expect(assertPublicUrl(new URL("http://localhost/"))).rejects.toThrow();
    await expect(assertPublicUrl(new URL("https://example.com:8443/"))).rejects.toThrow();
    await expect(assertPublicUrl(new URL("http://[::1]/"))).rejects.toThrow();
  });
});

describe("meta extraction", () => {
  it("reads og tags and icons", () => {
    const html = `<head><title>Fallback</title><meta property="og:site_name" content="Krillion &amp; Co">
      <meta name="description" content="Dive deep">
      <link rel="icon" href="/favicon.ico"><link rel="apple-touch-icon" href="/apple.png"></head>`;
    const m = extractMeta(html, new URL("https://krillion.io/play"));
    expect(m).toEqual({ title: "Krillion & Co", description: "Dive deep", iconUrl: "https://krillion.io/apple.png" });
  });
});
