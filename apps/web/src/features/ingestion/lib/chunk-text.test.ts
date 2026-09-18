import { describe, expect, it } from "vitest";
import { chunkText } from "./chunk-text";

describe("chunkText", () => {
  it("returns [] for empty text", () => {
    expect(chunkText("")).toEqual([]);
  });

  it("returns [] for whitespace-only text", () => {
    expect(chunkText("   \n\n\t  ")).toEqual([]);
  });

  it("returns the whole text as one chunk when it fits under chunkSize", () => {
    const text = "Short source text.";
    expect(chunkText(text, { chunkSize: 2000 })).toEqual([text]);
  });

  it("collapses internal whitespace/newlines when returning a single chunk", () => {
    const result = chunkText("Hello   world.\n\nSecond   line.", {
      chunkSize: 2000,
    });
    expect(result).toEqual(["Hello world. Second line."]);
  });

  it("splits long text into multiple chunks bounded by chunkSize", () => {
    const sentence = "This is one sentence about the topic. ";
    const text = sentence.repeat(50); // ~1950 chars, well over a small chunkSize

    const chunks = chunkText(text, { chunkSize: 300, overlap: 50 });

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      // Some slack over chunkSize is allowed (overlap prefix + one more
      // sentence), but chunks should stay in the right ballpark, not grow
      // unbounded.
      expect(chunk.length).toBeLessThan(300 + 50 + sentence.length);
    }
  });

  it("carries overlapping text forward into the next chunk", () => {
    const sentence = "Sentence number X here for padding purposes. ";
    const text = sentence.repeat(40);

    const chunks = chunkText(text, { chunkSize: 300, overlap: 50 });

    expect(chunks.length).toBeGreaterThan(1);
    const tailOfFirst = chunks[0]!.slice(-30);
    expect(chunks[1]).toContain(tailOfFirst.trim().split(" ").slice(-3).join(" "));
  });

  it("preserves a distinctive sentence somewhere in the output", () => {
    const filler = "Filler sentence for padding out the text. ".repeat(30);
    const text = `${filler}The unique marker sentence is right here. ${filler}`;

    const chunks = chunkText(text, { chunkSize: 300, overlap: 30 });

    expect(chunks.some((c) => c.includes("unique marker sentence"))).toBe(
      true
    );
  });

  it("hard-wraps a single run-on sentence with no punctuation at all", () => {
    const text = "word ".repeat(200).trim(); // one giant "sentence", no punctuation

    const chunks = chunkText(text, { chunkSize: 100, overlap: 10 });

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      // The overlap prefix carried into each new chunk means it can run a
      // little over chunkSize, same tolerance as the sentence-based test
      // above — this just confirms hard-wrapping is actually kicking in
      // (chunks stay in the right ballpark) rather than one giant unsplit
      // chunk.
      expect(chunk.length).toBeLessThanOrEqual(100 + 10 + 1);
    }
  });

  it("respects custom chunkSize/overlap options", () => {
    const sentence = "Fixed length sentence for this test case here. ";
    const text = sentence.repeat(10);

    const bigChunks = chunkText(text, { chunkSize: 1000, overlap: 0 });
    const smallChunks = chunkText(text, { chunkSize: 100, overlap: 0 });

    expect(smallChunks.length).toBeGreaterThan(bigChunks.length);
  });
});
