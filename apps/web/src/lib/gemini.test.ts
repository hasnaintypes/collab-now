import { describe, expect, it, vi, beforeEach } from "vitest";

// `generateText` talks to the real Gemini API via `@google/genai` — unit
// testing it means mocking the SDK's `GoogleGenAI` constructor/`generateContent`
// call rather than hitting the network. `vi.hoisted` is required because
// `vi.mock` factories run before this file's own top-level `const`s would
// otherwise be initialized.
const { generateContentMock, GoogleGenAIMock } = vi.hoisted(() => {
  const generateContentMock = vi.fn();
  // Must be a real `function`, not an arrow, so it's usable with `new`.
  const GoogleGenAIMock = vi.fn(function GoogleGenAI() {
    return { models: { generateContent: generateContentMock } };
  });
  return { generateContentMock, GoogleGenAIMock };
});

vi.mock("@google/genai", () => ({
  GoogleGenAI: GoogleGenAIMock,
}));

// `gemini.ts` caches its client in a module-scoped variable, so each test
// needs a fresh module instance (`vi.resetModules`) — otherwise a client
// created in one test would leak into the next and hide bugs like "reads
// GEMINI_API_KEY every call" vs. "reads it once".
async function freshGemini() {
  vi.resetModules();
  return import("./gemini");
}

beforeEach(() => {
  generateContentMock.mockReset();
  GoogleGenAIMock.mockClear();
  vi.unstubAllEnvs();
});

describe("generateText", () => {
  it("throws a clear error when GEMINI_API_KEY is not set", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const { generateText } = await freshGemini();

    await expect(generateText("hello")).rejects.toThrow(
      /GEMINI_API_KEY is not set/
    );
    expect(GoogleGenAIMock).not.toHaveBeenCalled();
  });

  it("returns the response text on success, using the default model", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const { generateText, GEMINI_DEFAULT_MODEL } = await freshGemini();
    generateContentMock.mockResolvedValueOnce({ text: "hello back" });

    const result = await generateText("hello");

    expect(result).toBe("hello back");
    expect(GoogleGenAIMock).toHaveBeenCalledWith({ apiKey: "test-key" });
    expect(generateContentMock).toHaveBeenCalledWith({
      model: GEMINI_DEFAULT_MODEL,
      contents: "hello",
    });
  });

  it("allows overriding the model", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const { generateText } = await freshGemini();
    generateContentMock.mockResolvedValueOnce({ text: "ok" });

    await generateText("hello", "gemini-3-pro-preview");

    expect(generateContentMock).toHaveBeenCalledWith({
      model: "gemini-3-pro-preview",
      contents: "hello",
    });
  });

  it("throws if Gemini returns an empty response", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const { generateText } = await freshGemini();
    generateContentMock.mockResolvedValueOnce({ text: "" });

    await expect(generateText("hello")).rejects.toThrow(/empty response/);
  });

  it("reuses the same client across calls instead of re-constructing it", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const { generateText } = await freshGemini();
    generateContentMock.mockResolvedValue({ text: "ok" });

    await generateText("first");
    await generateText("second");

    expect(GoogleGenAIMock).toHaveBeenCalledTimes(1);
  });
});
