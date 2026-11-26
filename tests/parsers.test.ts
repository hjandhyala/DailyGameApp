import { describe, expect, it } from "vitest";
import { detectGame, parseGeneric, parseShare } from "@/lib/parsers";

describe("share parsers", () => {
  it("parses Wordle", () => {
    const r = parseShare("Wordle 1,234 3/6*\n\n⬛🟨⬛⬛⬛\n🟩🟩⬛🟩⬛\n🟩🟩🟩🟩🟩");
    expect(r?.slug).toBe("wordle");
    expect(r?.result).toMatchObject({ label: "3/6*", score: 3, max: 6, failed: false, puzzle: "1234" });
    expect(r?.result.grid?.split("\n")).toHaveLength(3);
  });

  it("parses a failed Wordle", () => {
    expect(parseShare("Wordle 1.111 X/6")?.result).toMatchObject({ failed: true, label: "X/6" });
  });

  it("parses Connections with mistakes", () => {
    const text = "Connections\nPuzzle #432\n🟨🟨🟨🟨\n🟩🟦🟩🟩\n🟩🟩🟩🟩\n🟦🟦🟦🟦\n🟪🟪🟪🟪";
    const r = parseShare(text);
    expect(r?.slug).toBe("connections");
    expect(r?.result).toMatchObject({ label: "1 mistake", failed: false, puzzle: "432" });
  });

  it("parses failed Connections", () => {
    const text = "Connections\nPuzzle #1\n🟨🟩🟨🟨\n🟨🟨🟦🟨\n🟪🟨🟨🟨\n🟨🟨🟨🟩";
    expect(parseShare(text)?.result).toMatchObject({ failed: true, label: "0/4 groups" });
  });

  it("parses Strands hints", () => {
    const r = parseShare("Strands #100\n“Fun”\n💡🔵🔵💡\n🟡🔵");
    expect(r?.result.label).toBe("2 hints");
  });

  it("parses the Mini time", () => {
    const r = parseShare("I solved the 3/14/2024 New York Times Mini Crossword in 0:45!");
    expect(r?.slug).toBe("the-mini");
    expect(r?.result.timeSec).toBe(45);
  });

  it("parses Queens time", () => {
    const r = parseShare("Queens #123 | 1:23 👑\nlnkd.in/queens");
    expect(r?.slug).toBe("queens");
    expect(r?.result.timeSec).toBe(83);
  });

  it("parses Worldle & Framed", () => {
    expect(parseShare("#Worldle #812 3/6 (100%)\n🟩🟩🟩🟩🟨⬅️")?.result).toMatchObject({ label: "3/6", score: 3 });
    expect(parseShare("Framed #700\n🎥 🟥 🟥 🟩 ⬛ ⬛ ⬛")?.result).toMatchObject({ label: "3/6", score: 3 });
  });

  it("parses Quordle", () => {
    const r = parseShare("Daily Quordle 900\n6️⃣5️⃣\n🟥8️⃣\nm-w.com/games/quordle/");
    expect(r?.result).toMatchObject({ failed: true, label: "6 5 X 8" });
  });

  it("parses Krillion and Daily Tens (best effort)", () => {
    expect(parseShare("I dove 4,200m in Krillion today 🦐")?.result.label).toBe("4,200 m");
    expect(parseShare("Daily Tens #42 — 7/10 🔟")?.result).toMatchObject({ score: 7, max: 10 });
  });

  it("prefers the known game's parser", () => {
    expect(parseShare("Got it 4/6!", "bandle")?.slug).toBe("bandle");
  });

  it("falls back to a generic parser", () => {
    expect(parseGeneric("MyGame #5 4/8 🎉")).toMatchObject({ label: "4/8", score: 4, max: 8 });
    expect(parseGeneric("done in 2:05")).toMatchObject({ timeSec: 125 });
    expect(parseShare("I finished!")?.result.label).toBe("Done");
  });

  it("does not misdetect plain text", () => {
    expect(detectGame("hello world")).toBeUndefined();
  });
});
