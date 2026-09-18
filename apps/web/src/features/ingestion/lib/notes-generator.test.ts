import { describe, expect, it, vi, beforeEach } from "vitest";

const { generateTextMock } = vi.hoisted(() => ({
  generateTextMock: vi.fn(),
}));
vi.mock("@/lib/gemini", () => ({
  generateText: generateTextMock,
  GEMINI_DEFAULT_MODEL: "gemini-3-flash-preview",
}));

const {
  generateNotes,
  DEFAULT_NOTE_STYLE,
  NOTE_STYLE_LABELS,
} = await import("./notes-generator");

beforeEach(() => {
  generateTextMock.mockReset();
});

describe("generateNotes", () => {
  it("sends a bullet/outline-style prompt with the source text and returns trimmed notes", async () => {
    generateTextMock.mockResolvedValueOnce("  # Notes\n- point one\n  ");

    const notes = await generateNotes({
      text: "hello world",
      language: "en",
      style: "bullet-outline",
    });

    expect(notes).toBe("# Notes\n- point one");
    expect(generateTextMock).toHaveBeenCalledTimes(1);
    const [prompt] = generateTextMock.mock.calls[0]!;
    expect(prompt).toContain("hello world");
    expect(prompt).toContain("bullet/outline");
  });

  it("instructs translation to English when the source is Hindi", async () => {
    generateTextMock.mockResolvedValueOnce("notes");

    await generateNotes({
      text: "\u0928\u092e\u0938\u094d\u0924\u0947",
      language: "hi",
      style: "bullet-outline",
    });

    const [prompt] = generateTextMock.mock.calls[0]!;
    expect(prompt).toContain("Hindi");
    expect(prompt).toContain("translate");
  });

  it("instructs translation to English when the source is Urdu", async () => {
    generateTextMock.mockResolvedValueOnce("notes");

    await generateNotes({
      text: "\u06c1\u06cc\u0644\u0648",
      language: "ur",
      style: "bullet-outline",
    });

    const [prompt] = generateTextMock.mock.calls[0]!;
    expect(prompt).toContain("Urdu");
    expect(prompt).toContain("translate");
  });

  it("doesn't add a translation instruction for English source text", async () => {
    generateTextMock.mockResolvedValueOnce("notes");

    await generateNotes({ text: "hello", language: "en", style: "bullet-outline" });

    const [prompt] = generateTextMock.mock.calls[0]!;
    expect(prompt).not.toContain("translate");
  });

  it("always instructs English output regardless of source language", async () => {
    generateTextMock.mockResolvedValueOnce("notes");

    await generateNotes({ text: "hello", language: "en", style: "bullet-outline" });

    const [prompt] = generateTextMock.mock.calls[0]!;
    expect(prompt).toMatch(/English/);
  });

  it("always constrains output to headings/lists/bold-italic only, regardless of style", async () => {
    generateTextMock.mockResolvedValueOnce("notes");

    await generateNotes({ text: "hello", language: "en", style: "mindmap" });

    const [prompt] = generateTextMock.mock.calls[0]!;
    expect(prompt).toMatch(/no tables, block quotes, code blocks, or links/);
  });

  it("propagates errors from the Gemini call as-is", async () => {
    generateTextMock.mockRejectedValueOnce(
      new Error("Gemini returned an empty response.")
    );

    await expect(
      generateNotes({ text: "hi", language: "en", style: "bullet-outline" })
    ).rejects.toThrow("Gemini returned an empty response.");
  });

  it("sends Cornell Notes-specific instructions for the cornell style", async () => {
    generateTextMock.mockResolvedValueOnce("notes");

    await generateNotes({ text: "hello", language: "en", style: "cornell" });

    const [prompt] = generateTextMock.mock.calls[0]!;
    expect(prompt).toContain("Cornell Notes");
    expect(prompt).toContain("Key Questions & Cues");
    expect(prompt).toContain("Summary");
  });

  it("sends Mind-Map-specific instructions for the mindmap style", async () => {
    generateTextMock.mockResolvedValueOnce("notes");

    await generateNotes({ text: "hello", language: "en", style: "mindmap" });

    const [prompt] = generateTextMock.mock.calls[0]!;
    expect(prompt).toContain("Mind-Map Outline");
    expect(prompt).toContain("central topic");
  });

  it("sends Q&A/Flashcards-specific instructions for the qa-flashcards style", async () => {
    generateTextMock.mockResolvedValueOnce("notes");

    await generateNotes({ text: "hello", language: "en", style: "qa-flashcards" });

    const [prompt] = generateTextMock.mock.calls[0]!;
    expect(prompt).toContain("Q&A/Flashcards");
    expect(prompt).toContain("**Q:**");
    expect(prompt).toContain("**A:**");
  });

  it("sends Executive Summary-specific instructions for the executive-summary style", async () => {
    generateTextMock.mockResolvedValueOnce("notes");

    await generateNotes({
      text: "hello",
      language: "en",
      style: "executive-summary",
    });

    const [prompt] = generateTextMock.mock.calls[0]!;
    expect(prompt).toContain("TL;DR");
    expect(prompt).toContain("Key Points");
  });
});

describe("DEFAULT_NOTE_STYLE / NOTE_STYLE_LABELS", () => {
  it("defaults to the MVP's Bullet/Outline Summary style", () => {
    expect(DEFAULT_NOTE_STYLE).toBe("bullet-outline");
  });

  it("has a human-readable label for every style", () => {
    expect(NOTE_STYLE_LABELS).toEqual({
      "bullet-outline": "Bullet / Outline Summary",
      cornell: "Cornell Notes",
      mindmap: "Mind-Map Outline",
      "qa-flashcards": "Q&A / Flashcards",
      "executive-summary": "Executive Summary (TL;DR)",
    });
  });
});
