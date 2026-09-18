import { describe, expect, it, vi, beforeEach } from "vitest";

const { embedTextsMock } = vi.hoisted(() => ({ embedTextsMock: vi.fn() }));
vi.mock("@/lib/gemini", () => ({ embedTexts: embedTextsMock }));

const { embedSourceChunks } = await import("./chunk-embedder");

beforeEach(() => {
  embedTextsMock.mockReset();
});

describe("embedSourceChunks", () => {
  it("returns [] without calling Gemini for empty/whitespace-only text", async () => {
    const result = await embedSourceChunks("   ");

    expect(result).toEqual([]);
    expect(embedTextsMock).not.toHaveBeenCalled();
  });

  it("chunks the text and pairs each chunk with its embedding by index", async () => {
    // Short enough to produce exactly one chunk from chunkText's default
    // sizing, so the array-index pairing is easy to assert on directly —
    // the point of this test is the pairing, not chunkText's own splitting
    // logic (covered separately in chunk-text.test.ts).
    embedTextsMock.mockResolvedValueOnce([[0.1, 0.2]]);

    const result = await embedSourceChunks("A short piece of source text.");

    expect(embedTextsMock).toHaveBeenCalledWith([
      "A short piece of source text.",
    ]);
    expect(result).toEqual([
      { content: "A short piece of source text.", embedding: [0.1, 0.2] },
    ]);
  });

  it("propagates errors from the Gemini call as-is", async () => {
    embedTextsMock.mockRejectedValueOnce(new Error("Gemini is down"));

    await expect(embedSourceChunks("some text")).rejects.toThrow(
      "Gemini is down"
    );
  });
});
