import { describe, expect, it, vi, beforeEach } from "vitest";

const { generateTextMock } = vi.hoisted(() => ({
  generateTextMock: vi.fn(),
}));
vi.mock("@/lib/gemini", () => ({
  generateText: generateTextMock,
  GEMINI_DEFAULT_MODEL: "gemini-3-flash-preview",
}));

const { generateNotes } = await import("./notes-generator");

beforeEach(() => {
  generateTextMock.mockReset();
});

describe("generateNotes", () => {
  it("sends a bullet/outline-style prompt with the source text and returns trimmed notes", async () => {
    generateTextMock.mockResolvedValueOnce("  # Notes\n- point one\n  ");

    const notes = await generateNotes({ text: "hello world", language: "en" });

    expect(notes).toBe("# Notes\n- point one");
    expect(generateTextMock).toHaveBeenCalledTimes(1);
    const [prompt] = generateTextMock.mock.calls[0]!;
    expect(prompt).toContain("hello world");
    expect(prompt).toContain("bullet/outline");
  });

  it("instructs translation to English when the source is Hindi", async () => {
    generateTextMock.mockResolvedValueOnce("notes");

    await generateNotes({ text: "\u0928\u092e\u0938\u094d\u0924\u0947", language: "hi" });

    const [prompt] = generateTextMock.mock.calls[0]!;
    expect(prompt).toContain("Hindi");
    expect(prompt).toContain("translate");
  });

  it("instructs translation to English when the source is Urdu", async () => {
    generateTextMock.mockResolvedValueOnce("notes");

    await generateNotes({ text: "\u06c1\u06cc\u0644\u0648", language: "ur" });

    const [prompt] = generateTextMock.mock.calls[0]!;
    expect(prompt).toContain("Urdu");
    expect(prompt).toContain("translate");
  });

  it("doesn't add a translation instruction for English source text", async () => {
    generateTextMock.mockResolvedValueOnce("notes");

    await generateNotes({ text: "hello", language: "en" });

    const [prompt] = generateTextMock.mock.calls[0]!;
    expect(prompt).not.toContain("translate");
  });

  it("always instructs English output regardless of source language", async () => {
    generateTextMock.mockResolvedValueOnce("notes");

    await generateNotes({ text: "hello", language: "en" });

    const [prompt] = generateTextMock.mock.calls[0]!;
    expect(prompt).toMatch(/English/);
  });

  it("propagates errors from the Gemini call as-is", async () => {
    generateTextMock.mockRejectedValueOnce(
      new Error("Gemini returned an empty response.")
    );

    await expect(
      generateNotes({ text: "hi", language: "en" })
    ).rejects.toThrow("Gemini returned an empty response.");
  });
});
