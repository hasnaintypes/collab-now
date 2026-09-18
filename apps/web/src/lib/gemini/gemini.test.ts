import { describe, expect, it, vi, beforeEach } from "vitest";

// `generateText` talks to the real Gemini API via `@google/genai` — unit
// testing it means mocking the SDK's `GoogleGenAI` constructor/`generateContent`
// call rather than hitting the network. `vi.hoisted` is required because
// `vi.mock` factories run before this file's own top-level `const`s would
// otherwise be initialized.
const { generateContentMock, embedContentMock, GoogleGenAIMock } = vi.hoisted(
  () => {
    const generateContentMock = vi.fn();
    const embedContentMock = vi.fn();
    // Must be a real `function`, not an arrow, so it's usable with `new`.
    const GoogleGenAIMock = vi.fn(function GoogleGenAI() {
      return {
        models: {
          generateContent: generateContentMock,
          embedContent: embedContentMock,
        },
      };
    });
    return { generateContentMock, embedContentMock, GoogleGenAIMock };
  }
);

vi.mock("@google/genai", () => ({
  GoogleGenAI: GoogleGenAIMock,
}));

// `gemini.ts` caches its client in a module-scoped variable, so each test
// needs a fresh module instance (`vi.resetModules`) — otherwise a client
// created in one test would leak into the next and hide bugs like "reads
// GEMINI_API_KEY every call" vs. "reads it once".
async function freshGemini() {
  vi.resetModules();
  return import("./index");
}

beforeEach(() => {
  generateContentMock.mockReset();
  embedContentMock.mockReset();
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

describe("embedTexts", () => {
  it("returns [] without calling Gemini when given no texts", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const { embedTexts } = await freshGemini();

    const result = await embedTexts([]);

    expect(result).toEqual([]);
    expect(GoogleGenAIMock).not.toHaveBeenCalled();
    expect(embedContentMock).not.toHaveBeenCalled();
  });

  it("requests the embedding model/dimension/task type and returns unit-normalized vectors in input order", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const { embedTexts, GEMINI_EMBEDDING_MODEL, GEMINI_EMBEDDING_DIMENSIONS } =
      await freshGemini();
    embedContentMock.mockResolvedValueOnce({
      embeddings: [{ values: [3, 4] }, { values: [1, 0] }],
    });

    const result = await embedTexts(["chunk one", "chunk two"]);

    expect(embedContentMock).toHaveBeenCalledWith({
      model: GEMINI_EMBEDDING_MODEL,
      contents: ["chunk one", "chunk two"],
      config: {
        outputDimensionality: GEMINI_EMBEDDING_DIMENSIONS,
        taskType: "RETRIEVAL_DOCUMENT",
      },
    });
    expect(result).toEqual([
      [0.6, 0.8], // [3, 4] normalized (magnitude 5)
      [1, 0], // already unit length
    ]);
  });

  it("leaves an all-zero embedding as-is instead of dividing by zero", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const { embedTexts } = await freshGemini();
    embedContentMock.mockResolvedValueOnce({
      embeddings: [{ values: [0, 0] }],
    });

    const result = await embedTexts(["chunk"]);

    expect(result).toEqual([[0, 0]]);
  });

  it("throws if Gemini returns a different number of embeddings than inputs", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const { embedTexts } = await freshGemini();
    embedContentMock.mockResolvedValueOnce({ embeddings: [{ values: [1] }] });

    await expect(embedTexts(["a", "b"])).rejects.toThrow(
      /returned 1 embeddings for 2 inputs/
    );
  });

  it("throws if Gemini returns an empty embedding for one input", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const { embedTexts } = await freshGemini();
    embedContentMock.mockResolvedValueOnce({
      embeddings: [{ values: [1, 0] }, { values: [] }],
    });

    await expect(embedTexts(["a", "b"])).rejects.toThrow(
      /empty embedding for input 1/
    );
  });

  it("throws a clear error when GEMINI_API_KEY is not set", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const { embedTexts } = await freshGemini();

    await expect(embedTexts(["hello"])).rejects.toThrow(
      /GEMINI_API_KEY is not set/
    );
  });
});
